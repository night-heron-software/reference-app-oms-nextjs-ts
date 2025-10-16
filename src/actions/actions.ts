'use server';
import 'server-only';

import {
  Action,
  OrderInput,
  OrderQueryResult,
  Shipment,
  customerActionUpdate,
  getOrderStatus,
  orderIdToWorkflowId
} from '@/temporal/src/order/definitions';
import {
  ShipmentStatus,
  getShipmentStatus,
  shipmentCarrierShipmentStatusUpdate,
  shipmentIdToWorkflowId
} from '@/temporal/src/shipment/definitions';

import { redirect } from 'next/navigation';
import { getTemporalClient } from './client';

import { sql } from '@/temporal/src/db/client'; // Adjust the import path as necessary

export async function fetchOrder(id: string): Promise<OrderQueryResult | undefined> {
  const result = await sql`SELECT id, customer_id, status FROM orders WHERE id = ${id}`;
  if (result.length > 0) {
    return result[0] as OrderQueryResult;
  } else {
    console.error('Failed to fetch order');
    return undefined;
  }
}

export interface FraudSettings {
  limit: number;
  maintenanceMode: boolean;
}

export async function fetchFraudSettings(): Promise<FraudSettings> {
  const rows = await sql`SELECT value FROM settings WHERE name = 'fraud'`;
  console.log(`fetchFraudSettings: ${JSON.stringify(rows, null, 2)}`);
  return (
    (rows[0]?.value as FraudSettings) || {
      limit: 0,
      maintenanceMode: false
    }
  );
}

export async function fetchOrders(): Promise<OrderQueryResult[]> {
  const rows = await sql`SELECT id, status, received_at FROM orders ORDER BY received_at DESC`;
  return rows as OrderQueryResult[];
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
  });

  redirect(`/orders/${formOrder.id}`);
}

export async function fetchShipments(): Promise<Shipment[]> {
  const rows = await sql`SELECT id, status FROM shipments ORDER BY booked_at DESC`;
  return rows as Shipment[];
}

export async function fetchOrderById(id: string): Promise<OrderQueryResult | undefined> {
  const workflowId = orderIdToWorkflowId(id);
  const client = await getTemporalClient();

  const handle = client.workflow.getHandle(workflowId);
  try {
    for (let retry = 0; retry < 10; retry++) {
      const orderStatus = await handle.query(getOrderStatus);
      console.log(`Fetched order: ${JSON.stringify(orderStatus, null, 2)}`);

      if (orderStatus.status !== 'uninitialized') {
        return orderStatus;
      }
      console.warn(`Order status is uninitialized for ID ${id}, retrying...`);
      await new Promise((resolve) => setTimeout(resolve, 1000)); // Wait 1 second before retrying
    }
    throw new Error(`Order status remained uninitialized after retries`);
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
      const shipmentStatus = (await handle.query(getShipmentStatus)) as ShipmentStatus;
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

export async function executeShipmentStatusUpdate(
  shipmentId: string,
  workflowId: string,
  status: string
): Promise<string> {
  const client = await getTemporalClient();
  const handle = client.workflow.getHandle(workflowId);
  try {
    let result = await handle.executeUpdate(shipmentCarrierShipmentStatusUpdate, {
      args: [{ status: status }]
    });
    console.log(`Shipment carrier status update result: ${JSON.stringify(result, null, 2)}`);
    return result.status;
  } catch (error) {
    console.warn(`Error updating shipment carrier status for ${shipmentId}:`, error);
  }
  return status;
}
export async function executeCustomerActionUpdate(
  workflowId: string,
  action: Action
): Promise<OrderQueryResult | null> {
  const client = await getTemporalClient();
  const handle = client.workflow.getHandle(workflowId);

  try {
    let result = await handle.executeUpdate(customerActionUpdate, { args: [action] });
    return result;
  } catch (error) {
    console.warn(`Error sending customer action signal for workflow ${workflowId}:`, error);
    return null;
  }
}
