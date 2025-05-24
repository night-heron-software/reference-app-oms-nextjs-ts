'use server';
import 'server-only';

import { TASK_QUEUE_NAME } from '@/temporal/lib/shared';
import { getTemporalClient } from '@/temporal/src/client';
import { OrderInput } from '@/temporal/src/definitions';
import { Order } from '@/temporal/src/order';
import { processOrder } from '@/temporal/src/workflows';
import { sql } from '@vercel/postgres';

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
  const order = JSON.parse(formData.get('order') as string);
  console.log(JSON.stringify(order, null, 2));

  return new Promise((resolve, reject) => {
    const orderInput: OrderInput = {
      id: order.id,
      customerId: order.customerId,
      items: order.items
    };

    getTemporalClient()
      .workflow.start(processOrder, {
        taskQueue: TASK_QUEUE_NAME,
        workflowId: orderInput.id,
        args: [orderInput]
      })
      .then((result) => {
        console.log('Workflow started successfully:', result);
        resolve();
      })
      .catch((error) => {
        console.error('Error starting workflow:', error);
        reject(error);
      });
  });
}
