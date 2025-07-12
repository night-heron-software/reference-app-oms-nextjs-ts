'use server';
import 'server-only';

import {
  Action,
  OrderInput,
  OrderQueryResult,
  Shipment,
  customerActionSignal,
  getOrderStatus,
  orderIdToWorkflowId
} from '@/temporal/src/order/definitions';
import {
  ShipmentStatus,
  getShipmentStatus,
  shipmentCarrierUpdateSignal,
  shipmentIdToWorkflowId
} from '@/temporal/src/shipment/definitions';

import { sql } from '@vercel/postgres';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { getTemporalClient } from './client';

export async function fetchOrder(id: string): Promise<OrderQueryResult | undefined> {
  const result = await sql`SELECT id, customer_id, status FROM orders WHERE id = ${id}`;
  if (result.rows.length > 0) {
    return result.rows[0] as OrderQueryResult;
  } else {
    console.error('Failed to fetch order');
    return undefined;
  }
}

export async function fetchOrders(): Promise<OrderQueryResult[]> {
  const result = await sql`SELECT id, status, received_at FROM orders ORDER BY received_at DESC`;
  return result.rows as OrderQueryResult[];
}

export async function createOrder(formData: FormData): Promise<void> {
  const client = await getTemporalClient();
  console.log(JSON.stringify(Object.fromEntries(formData.entries()), null, 2));
  const formOrder = JSON.parse(formData.get('order') as string);
  console.log(JSON.stringify(formOrder, null, 2));

  const orderInput: OrderInput = {
    id: formOrder.id,
    customerId: formOrder.customerId,
    items: formOrder.items
  };

  const result = await new Promise((resolve, reject) => {
    client.workflow
      .start('order', {
        taskQueue: 'orders',
        workflowId: orderIdToWorkflowId(orderInput.id),
        args: [orderInput],
        retry: {
          maximumAttempts: 4,
          initialInterval: '10m',
          maximumInterval: '160m',
          backoffCoefficient: 2.0,
          nonRetryableErrorTypes: ['NotFoundError', 'InvalidArgumentError']
        },
        workflowExecutionTimeout: '2 days',
        workflowTaskTimeout: '2m'
      })
      .then((result) => {
        console.log('Workflow started successfully:', result);
        resolve(undefined);
      })
      .catch((error) => {
        console.error('Error starting workflow:', error);
        reject(error);
      });
    // Use Next.js's redirect function to navigate to the order details page
  });

  console.log('Workflow result:', JSON.stringify(result, null, 2));

  revalidatePath('/orders');
  redirect(`/orders/${formOrder.id}`);
}

export async function fetchShipments(): Promise<Shipment[]> {
  const result = await sql`SELECT id, status FROM shipments ORDER BY booked_at DESC`;
  return result.rows as Shipment[];
}

export async function fetchOrderById(id: string): Promise<OrderQueryResult | undefined> {
  const workflowId = orderIdToWorkflowId(id);
  const client = await getTemporalClient();

  const handle = client.workflow.getHandle(workflowId);
  try {
    const orderStatus = await handle.query(getOrderStatus);
    console.log(`Fetched order: ${JSON.stringify(orderStatus, null, 2)}`);
    return orderStatus;
  } catch (error) {
    console.warn(`Error fetching order by ID ${id}:`, error);
    return undefined;
  }
}

export async function fetchShipmentById(id: string): Promise<ShipmentStatus | undefined> {
  const client = await getTemporalClient();
  const workflowId = shipmentIdToWorkflowId(id);

  const handle = client.workflow.getHandle(workflowId);

  for (let retry = 0; retry < 10; retry++) {
    try {
      // Attempt to fetch the shipment status
      const shipmentStatus = await handle.query(getShipmentStatus);
      console.log(`Fetched shipment: ${JSON.stringify(shipmentStatus, null, 2)}`);
      return shipmentStatus;
    } catch (error) {
      // If the workflow is not found, wait and retry
      console.warn(`Shipment workflow not found for ID ${id}, retrying...`);
      await new Promise((resolve) => setTimeout(resolve, 1000)); // Wait 1 second before retrying
    }
  }
  console.warn(`Failed to fetch shipment by ID ${id} after retries.`);
  return undefined;
}
export interface ShipmentCarrierUpdateSignal {
  status: string;
}

export async function updateShipmentCarrierStatus(
  shipmentId: string,
  workflowId: string,
  status: string
): Promise<void> {
  const client = await getTemporalClient();
  const handle = client.workflow.getHandle(workflowId);
  try {
    await handle.signal(shipmentCarrierUpdateSignal, { status: status });
  } catch (error) {
    console.warn(`Error updating shipment carrier status for ${shipmentId}:`, error);
  }
}

export async function sendCustomerActionSignal(workflowId: string, action: Action): Promise<void> {
  const client = await getTemporalClient();
  const handle = client.workflow.getHandle(workflowId);

  try {
    await handle.signal(customerActionSignal, action);
  } catch (error) {
    console.warn(`Failed to send customer action signal`, error);
  }
}
