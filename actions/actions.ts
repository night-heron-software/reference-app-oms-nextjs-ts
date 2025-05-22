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

export async function purchase(order: OrderInput) {
  const result =
    await sql`INSERT INTO orders (id, customer_id, status) VALUES (${order.id},${order.customerId},'pending') RETURNING id`;
  console.log(JSON.stringify(result, null, 2));

  if (result.rows.length > 0) {
    const client = getTemporalClient();
    const workflowId = 'Order:' + order.id;
    const handle = await client.workflow.start(processOrder, {
      workflowId: workflowId,
      taskQueue: TASK_QUEUE_NAME,
      args: [order]
    });

    const workflowResult = await handle.result();

    if (workflowResult) {
      console.log('Workflow started successfully?', workflowResult);
      return result.rows[0].id;
    }
    console.error('Failed to start workflow: ${workflowId}');
    return undefined;
  } else {
    console.error('Failed to insert order into database');
    // clean up entry in database?
    return undefined;
  }
}
