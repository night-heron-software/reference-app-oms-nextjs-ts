import {
  condition,
  defineQuery,
  defineSignal,
  executeChild,
  proxyActivities,
  setHandler,
  startChild
} from '@temporalio/workflow';
import type * as activities from './activities.js'; // Ensure this path is correct and the module exists
import type { ItemInput, OrderInput } from './definitions.js'; // Import Order type
import { Fulfillment, Order, OrderItem, OrderStatus, ReserveItemsResult } from './order.js';
import { channel } from 'node:diagnostics_channel';

const { reserveItems, updateOrderStatus } = proxyActivities<typeof activities>({
  retry: {
    initialInterval: '1 second',
    maximumInterval: '1 minute',
    backoffCoefficient: 2,
    maximumAttempts: 500
  },
  startToCloseTimeout: '1 minute'
});

/* export async function buildFulfillments(order: OrderInput): Promise<ReserveItemsResult> {
  const orderItems: OrderItem[] = order.items.map((item: ItemInput) => {
    if (item.quantity === undefined) {
      throw new Error('Item quantity cannot be undefined');
    }
    return { sku: item.sku, quantity: item.quantity };
  });
  // return fulfillments not ReserveItemsResult;
  return reserveItems({ orderId: order.id, items: orderItems });
} */

export const getOrderStatus = defineQuery<Order>('getOrderStatus');

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

export async function processOrder(input: OrderInput): Promise<Order> {
  const order = setupOrder(input);
  console.log(`Order: ${JSON.stringify(order, null, 2)} created!`);

  setupQueryHandler(order);

  const reserveItemsResult = await reserveItems({ orderId: order.id, items: order.items });

  if (!reservationsFound(reserveItemsResult)) {
    throw new Error('No reservations found for the order');
  }

  console.log(`Reservations: ${JSON.stringify(reserveItemsResult.reservations, null, 2)}`);

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

  order.fulfillments = fulfillments;

  if (customerActionRequired(order)) {
    // update order status to indicate customer action is required
    order.status = 'customerActionRequired';

    const customerAction = await waitForCustomer(order);

    console.log(`Customer action taken: ${customerAction}`);
    switch (customerAction) {
      case 'amend':
        cancelUnavailableFulfillments(order);
        break;
      case 'cancel':
        updateOrderStatus(order.id, 'cancelled'); // Handle cancel action
        break;
      case 'timedOut':
        cancelAllFulfillments(order);
        return order; // Handle timeout action
      default:
        console.log(`Unknown action taken by customer: ${customerAction}`);
        throw new Error(`Unknown action: ${customerAction}`);
    }
  }
  await updateOrderStatus(order.id, 'processing');

  const responseArray = await Promise.all(
    order.fulfillments.map((fulfillment) =>
      executeChild(handleShipmentStatusUpdates, {
        args: [fulfillment]
        // workflowId, // add business-meaningful workflow id here
        // // regular workflow options apply here, with two additions (defaults shown):
        // cancellationType: ChildWorkflowCancellationType.WAIT_CANCELLATION_COMPLETED,
        // parentClosePolicy: ParentClosePolicy.PARENT_CLOSE_POLICY_TERMINATE
      })
    )
  );
  // you can use childHandle to signal, query, cancel, terminate, or get result here

  console.log(`order: ${JSON.stringify(order, null, 2)}`);
  return order;
}

export async function handleShipmentStatusUpdates(fulfillment: Fulfillment): Promise<string> {
  const ch = channel('ShipmentStatusUpdated');
  console.log(`Child workflow started with name: ${fulfillment}`);
  // Simulate some work in the child workflow
  await new Promise((resolve) => setTimeout(resolve, 1000));
  console.log(`Child workflow completed with name: ${fulfillment}`);
  return `Child workflow result for ${fulfillment}`;
}

/* func (wf *orderImpl) handleShipmentStatusUpdates(ctx workflow.Context) {
	ch := workflow.GetSignalChannel(ctx, shipment.ShipmentStatusUpdatedSignalName)

	for {
		var signal shipment.ShipmentStatusUpdatedSignal
		_ = ch.Receive(ctx, &signal)
		for _, f := range wf.fulfillments {
			if f.ID == signal.ShipmentID {
				f.Shipment.Status = signal.Status
				f.Shipment.UpdatedAt = signal.UpdatedAt

				wf.logger.Info("Shipment status updated", "shipmentID", signal.ShipmentID, "status", signal.Status)

				break
			}
		}
	}
} */
function cancelUnavailableFulfillments(order: Order): void {
  order.fulfillments?.forEach((fulfillment) => {
    if (fulfillment.status === 'unavailable') {
      fulfillment.status = 'cancelled'; // Update status to 'cancelled'
      console.log(`Fulfillment ${fulfillment.id} has been cancelled due to unavailability.`);
    }
  });

  console.log(`Order ${order.id} has been amended due to unavailable fulfillments.`);
  // You might want to call an activity to update the order status in the database here
}

function cancelAllFulfillments(order: Order): void {
  order.fulfillments?.forEach((fulfillment) => {
    fulfillment.status = 'cancelled'; // Update each fulfillment status to 'cancelled'
  });
  order.status = 'cancelled'; // Update the order status to 'cancelled'
  console.log(`All fulfillments for order ${order.id} have been cancelled.`);
  // Do I need to update the database or notify any services about this cancellation?
  // You might want to call an activity to update the order status in the database here
}

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

function reservationsFound(reserveItemsResult: ReserveItemsResult): boolean {
  return !!reserveItemsResult?.reservations?.length;
}

function setupQueryHandler(order: Order) {
  setHandler(getOrderStatus, () => {
    console.log(`getOrderStatus called for order: ${order.id}`);
    return order;
  });
}
export const customerActionSignal = defineSignal<[string]>('customerAction');

async function waitForCustomer(order: Order): Promise<string> {
  let signalReceived = false;
  let signalValue: string | undefined;

  setTimeout(() => {
    if (!signalReceived) {
      signalReceived = true;
      signalValue = 'timedOut'; // Simulate a timeout action
    }
  }, 30000); // 30 seconds timeout

  setHandler(customerActionSignal, (value) => {
    signalReceived = true;
    signalValue = value;
  });

  await condition(() => signalReceived);
  return signalValue || 'noActionTaken';
}

/* func (wf *orderImpl) waitForCustomer(ctx workflow.Context) (string, error) {
	var signal CustomerActionSignal

	s := workflow.NewSelector(ctx)

	timerCtx, cancelTimer := workflow.WithCancel(ctx)
	t := workflow.NewTimer(timerCtx, customerActionTimeout)

	var err error

	s.AddFuture(t, func(f workflow.Future) {
		if err = f.Get(timerCtx, nil); err != nil {
			return
		}

		wf.logger.Info("Timed out waiting for customer action", "timeout", customerActionTimeout)

		signal.Action = CustomerActionTimedOut
	})

	ch := workflow.GetSignalChannel(ctx, CustomerActionSignalName)
	s.AddReceive(ch, func(c workflow.ReceiveChannel, _ bool) {
		c.Receive(ctx, &signal)

		wf.logger.Info("Received customer action", "action", signal.Action)

		cancelTimer()
	})

	wf.logger.Info("Waiting for customer action")

	s.Select(ctx)

	if err != nil {
		return "", err
	}

	switch signal.Action {
	case CustomerActionAmend:
	case CustomerActionCancel:
	case CustomerActionTimedOut:
	default:
		return "", fmt.Errorf("invalid customer action %q", signal.Action)
	}

	return signal.Action, nil
}
 */
