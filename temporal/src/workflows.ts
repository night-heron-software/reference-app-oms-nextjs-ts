import { proxyActivities } from '@temporalio/workflow';
import type * as activities from './activities.js'; // Ensure this path is correct and the module exists
import type { ItemInput, OrderInput } from './definitions.js'; // Import Order type
import { Fulfillment, Order, OrderItem, ReserveItemsResult } from './order.js';

function setupOrder(input: OrderInput): Order {
  if (input.id === undefined) {
    throw new Error('Order ID cannot be empty');
  }
  if (input.customerId === undefined) {
    throw new Error('Customer ID cannot be empty');
  }
  if (input.items === undefined || input.items.length === 0) {
    throw new Error('Items cannot be empty');
  }
  const items: OrderItem[] = input.items.map((item: ItemInput) => {
    if (item.sku === undefined) {
      throw new Error('Item SKU cannot be empty');
    }
    if (item.quantity === undefined) {
      throw new Error('Item quantity cannot be empty');
    }
    return { sku: item.sku, quantity: item.quantity };
  });

  const order: Order = {
    id: input.id,
    customerId: input.customerId,
    items: items,
    receivedAt: new Date().toISOString(),
    status: 'pending' // or another appropriate default status
  };

  return order;
}

export async function buildFulfillments(order: OrderInput): Promise<ReserveItemsResult> {
  const orderItems: OrderItem[] = order.items.map((item: ItemInput) => {
    if (item.quantity === undefined) {
      throw new Error('Item quantity cannot be undefined');
    }
    return { sku: item.sku, quantity: item.quantity };
  });
  const { reserveItems } = proxyActivities<typeof activities>({
    retry: {
      initialInterval: '1 second',
      maximumInterval: '1 minute',
      backoffCoefficient: 2,
      maximumAttempts: 500
    },
    startToCloseTimeout: '1 minute'
  });

  return reserveItems({ orderId: order.id, items: orderItems });
}

export async function processOrder(input: OrderInput): Promise<Order> {
  const order = setupOrder(input);
  //const wf = Workflow.getExternalWorkflowHandle(order.id);

  console.log(`Order: ${JSON.stringify(order, null, 2)} created!`);
  const reserveItemsResult = await buildFulfillments(input);

  if (reserveItemsResult.reservations.length > 0) {
    console.log('Items reserved successfully');
  } else {
    console.error('Failed to reserve items');
    return order;
  }

  //  const result = await wf.query("getFulfillments");

  const fulfillments: Fulfillment[] = reserveItemsResult.reservations.map(
    (reservation, i): Fulfillment => {
      const id = `${order.id}:${i + 1}`;
      return {
        id: input.id,
        items: reservation.items,
        location: reservation.location,
        status: 'pending'
      };
    }
  );
  const result = { ...order, fulfillments: fulfillments };
  console.log(`order: ${JSON.stringify(result, null, 2)}`);
  return result;
}
