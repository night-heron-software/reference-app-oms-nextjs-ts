import { defineQuery, proxyActivities, setHandler } from '@temporalio/workflow';
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
const { reserveItems, fetchOrders } = proxyActivities<typeof activities>({
  retry: {
    initialInterval: '1 second',
    maximumInterval: '1 minute',
    backoffCoefficient: 2,
    maximumAttempts: 500
  },
  startToCloseTimeout: '1 minute'
});

export async function buildFulfillments(order: OrderInput): Promise<ReserveItemsResult> {
  const orderItems: OrderItem[] = order.items.map((item: ItemInput) => {
    if (item.quantity === undefined) {
      throw new Error('Item quantity cannot be undefined');
    }
    return { sku: item.sku, quantity: item.quantity };
  });

  return reserveItems({ orderId: order.id, items: orderItems });
}

export interface OrderRunStatus {
  id: string;
  customerId: string;
  receivedAt: string;
  items: OrderItem[];
  fulfillments?: Fulfillment[];
  status: string;
}
export const getOrderStatus = defineQuery<OrderRunStatus>('getOrderStatus');

function customerActionRequired(order: Order): boolean {
  if (!order.fulfillments || order.fulfillments.length === 0) {
    console.log(`No fulfillments found for order: ${order.id}`);
    return false;
  }

  for (const fulfillment of order.fulfillments) {
    if (fulfillment.status === 'unavailable') {
      console.log(`Customer action required for fulfillment: ${fulfillment.id}`);
      return true; // Customer action is required
    }
  }
  return false;
}
/* func (wf *orderImpl) updateStatus(ctx workflow.Context, status string) error {
	wf.status = status

	update := &OrderStatusUpdate{
		ID:     wf.id,
		Status: wf.status,
	}

	ctx = workflow.WithLocalActivityOptions(ctx, workflow.LocalActivityOptions{
		ScheduleToCloseTimeout: 5 * time.Second,
	})
	return workflow.ExecuteLocalActivity(ctx, a.UpdateOrderStatus, update).Get(ctx, nil)
}
export async function updateOrderStatus(input: Order): Promise<OrderRunStatus> {
  
} */

export async function processOrder(input: OrderInput): Promise<OrderRunStatus> {
  const orders = await fetchOrders();
  console.log(`Fetched ${orders.length} orders from the database.`);

  const order = setupOrder(input);
  if (customerActionRequired(order)) {
    // update order status to indicate customer action is required
    order.status = 'customerActionRequired';
  }

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

  const result: OrderRunStatus = { ...order, fulfillments: fulfillments };
  setHandler(getOrderStatus, () => {
    console.log(`getOrderStatus called for order: ${order.id}`);
    return result;
  });
  console.log(`order: ${JSON.stringify(result, null, 2)}`);
  return result;
}
