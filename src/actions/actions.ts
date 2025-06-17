'use server';
import 'server-only';

import { TASK_QUEUE_NAME } from '@/temporal/lib/order/shared';
import { getTemporalClient } from '@/temporal/src/order/client';
import { OrderQueryResult, Shipment } from '@/temporal/src/order/order';
import { getOrderStatus, processOrder } from '@/temporal/src/order/workflows';
import { sql } from '@vercel/postgres';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

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
/* ((formData: FormData) => void | Promise<void>) | undefined */
export async function createOrder(formData: FormData): Promise<void> {
  console.log(JSON.stringify(Object.fromEntries(formData.entries()), null, 2));
  const formOrder = JSON.parse(formData.get('order') as string);
  console.log(JSON.stringify(formOrder, null, 2));

  const orderInput: OrderQueryResult = {
    id: formOrder.id,
    customerId: formOrder.customerId,
    items: formOrder.items,
    receivedAt: new Date().toISOString(),
    status: 'pending'
  };

  const result = await new Promise((resolve, reject) => {
    getTemporalClient()
      .workflow.start(processOrder, {
        taskQueue: TASK_QUEUE_NAME,
        workflowId: orderInput.id,
        args: [orderInput],
        retry: {
          maximumAttempts: 4,
          initialInterval: '10m',
          maximumInterval: '160m',
          backoffCoefficient: 2.0,
          nonRetryableErrorTypes: ['NotFoundError', 'InvalidArgumentError']
        },
        workflowExecutionTimeout: '2hr',
        workflowTaskTimeout: '2hr'
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
  // This Should Happen in the worflow, but for now we do it here
  const insertedOrder = await insertOrder(orderInput);
  console.log('Inserted order:', JSON.stringify(insertedOrder, null, 2));
  revalidatePath('/orders');
  redirect(`/orders/${formOrder.id}`);
}

export async function fetchShipments(): Promise<Shipment[]> {
  const result = await sql`SELECT id, status FROM shipments ORDER BY booked_at DESC`;
  return result.rows as Shipment[];
}

async function insertOrder(order: OrderQueryResult): Promise<number> {
  const result =
    await sql`INSERT INTO orders (id, customer_id, received_at, status) VALUES (${order.id}, ${order.customerId}, ${new Date().toISOString()}, ${order.status})`;
  if (result == null) {
    console.error('Failed to insert order');
    throw new Error('Failed to insert order');
  }
  return result.rowCount == null ? 0 : result.rowCount;
}

export async function fetchOrderById(id: string): Promise<OrderQueryResult | undefined> {
  const client = getTemporalClient();

  const handle = await client.workflow.getHandle(id);
  try {
    const orderStatus = await handle.query(getOrderStatus);
    console.log(`Fetched order: ${JSON.stringify(orderStatus, null, 2)}`);
    return orderStatus;
  } catch (error) {
    console.warn(`Error fetching order by ID ${id}:`, error);
    return undefined;
  }
}
