'use server';
import 'server-only';

import { TASK_QUEUE_NAME } from '@/temporal/lib/shared';
import { getTemporalClient } from '@/temporal/src/client';
import { Order, Shipment } from '@/temporal/src/order';
import { getOrderStatus, processOrder } from '@/temporal/src/workflows';
import { sql } from '@vercel/postgres';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { getOrderStatus as getStatus } from '@/temporal/src/workflows';

export async function fetchOrder(id: string): Promise<Order | undefined> {
  const result = await sql`SELECT id, customer_id, status FROM orders WHERE id = ${id}`;
  if (result.rows.length > 0) {
    return result.rows[0] as Order;
  } else {
    console.error('Failed to fetch order');
    return undefined;
  }
}
export async function fetchOrders(): Promise<Order[]> {
  const result = await sql`SELECT id, status, received_at FROM orders ORDER BY received_at DESC`;
  return result.rows as Order[];
}
/* ((formData: FormData) => void | Promise<void>) | undefined */
export async function createOrder(formData: FormData): Promise<void> {
  console.log(JSON.stringify(Object.fromEntries(formData.entries()), null, 2));
  const formOrder = JSON.parse(formData.get('order') as string);
  console.log(JSON.stringify(formOrder, null, 2));

  const orderInput: Order = {
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
        args: [orderInput]
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

  const insertedOrder = await insertOrder(orderInput);
  console.log('Inserted order:', JSON.stringify(insertedOrder, null, 2));
  revalidatePath('/orders');
  redirect(`/orders/${formOrder.id}`);
}

export async function fetchShipments(): Promise<Shipment[]> {
  const result = await sql`SELECT id, status FROM shipments ORDER BY booked_at DESC`;
  return result.rows as Shipment[];
}
async function insertOrder(order: Order): Promise<number> {
  const result =
    await sql`INSERT INTO orders (id, customer_id, received_at, status) VALUES (${order.id}, ${order.customerId}, ${new Date().toISOString()}, ${order.status})`;
  if (result == null) {
    console.error('Failed to insert order');
    throw new Error('Failed to insert order');
  }
  return result.rowCount == null ? 0 : result.rowCount;
}

export async function fetchOrderById(id: string): Promise<Order | undefined> {
  const client = getTemporalClient();

  const handle = await client.workflow.getHandle(id);
  const status = await handle.query(getOrderStatus);
  console.log(`Order status for ${id}: ${status}`);
  return undefined;
}
