import { log } from '@temporalio/activity';
import { db } from '@vercel/postgres';
import {
  OrderItem,
  OrderStatus,
  Reservation,
  ReserveItemsInput,
  ReserveItemsResult
} from './definitions.js';
import { OrderContext } from './order.js';

export async function reserveItems(input: ReserveItemsInput): Promise<ReserveItemsResult> {
  log.info(`reserveItems: ${JSON.stringify(input, null, 2)}`);

  if (!input.items || input.items.length < 1) {
    throw new Error('Items cannot be empty');
  }
  if (!input.orderId) {
    throw new Error('Order ID cannot be empty');
  }

  const { unavailableItems, availableItems } = input.items.reduce(
    (acc, item) => {
      if (!item) {
        return acc;
      }
      if (item.quantity <= 0) {
        throw new Error(`Item quantity must be greater than zero for SKU: ${item.sku}`);
      }
      // Simulate checking availability
      if (item.sku.startsWith('Adidas')) {
        acc.unavailableItems.push(item);
      } else {
        acc.availableItems.push(item);
      }
      return acc;
    },
    { availableItems: [], unavailableItems: [] } as {
      availableItems: OrderItem[];
      unavailableItems: OrderItem[];
    }
  );
  const reservations: Reservation[] = [];

  if (unavailableItems.length > 0) {
    reservations.push({
      available: false,
      location: 'warehouse',
      items: unavailableItems
    });
  }
  if (availableItems.length > 0) {
    const poppedItem = availableItems.pop();
    if (poppedItem) {
      reservations.push({
        available: true,
        location: 'store',
        items: [poppedItem]
      });
    }
  }
  if (availableItems.length > 0) {
    reservations.push({
      available: true,
      location: 'warehouse',
      items: availableItems
    });
  }
  return {
    reservations: reservations
  };
}

export async function fetchOrders(): Promise<OrderContext[]> {
  const result =
    await db.sql`SELECT id, customer_id, status, received_at FROM orders ORDER BY received_at DESC`;
  return result.rows as OrderContext[];
}

export async function updateOrderStatusInDb(
  order: OrderContext,
  status: OrderStatus
): Promise<void> {
  const result = await db.sql`
    INSERT INTO orders (id, customer_id, status, received_at)
    VALUES (${order.id}, ${order.customerId}, ${order.status}, ${new Date().toISOString()})
    ON CONFLICT(id) DO UPDATE SET status = ${status}`;

  log.info(`updateOrderStatus: ${JSON.stringify(order, null, 2)}`);
}
