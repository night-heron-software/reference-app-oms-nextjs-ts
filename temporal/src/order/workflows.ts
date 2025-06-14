import * as wf from '@temporalio/workflow';

import { log } from '@temporalio/workflow';

import type * as activities from './activities.js'; // Ensure this path is correct and the module exists
import type { ItemInput, OrderInput } from './definitions.js'; // Import Order type
import { Fulfillment, OrderItem, OrderQueryResult, ReserveItemsResult } from './order.js'; // Adjust the import path as necessary

export const ShipmentStatusUpdatedSignalName = 'ShipmentStatusUpdated';

export type ShipmentStatus = 'pending' | 'shipped' | 'timed_out' | 'cancelled';
export interface ShipmentStatusUpdatedSignal {
  shipmentId: string;
  status: ShipmentStatus;
  updatedAt: Date;
}

export const shipmentStatusSignal =
  wf.defineSignal<[ShipmentStatusUpdatedSignal]>('ShipmentStatusUpdated');

const { reserveItems, updateOrderStatus } = wf.proxyActivities<typeof activities>({
  retry: {
    initialInterval: '1 minute',
    maximumInterval: '16 minute',
    backoffCoefficient: 2,
    maximumAttempts: 500
  },
  startToCloseTimeout: '2 hours'
});

function customerActionRequired(order: OrderQueryResult): boolean {
  if (!order.fulfillments || order.fulfillments.length === 0) {
    log.info(`No fulfillments found for order: ${order.id}`);
    return false;
  }

  for (const fulfillment of order.fulfillments) {
    if (fulfillment.status === 'unavailable') {
      log.info(`Customer action required for fulfillment: ${fulfillment.id}`);
      return true; // Customer action is required
    }
  }
  return false;
}

export async function processOrder(input: OrderInput): Promise<OrderQueryResult> {
  const items: OrderItem[] = input.items.map((item: ItemInput) => {
    if (item.sku === undefined) {
      throw new Error('Item SKU cannot be empty');
    }
    if (item.quantity === undefined) {
      throw new Error('Item quantity cannot be empty');
    }
    return { sku: item.sku, quantity: item.quantity };
  });

  const order: OrderQueryResult = {
    id: input.id,
    customerId: input.customerId,
    items: items,
    receivedAt: new Date().toISOString(),
    status: 'pending' // or another appropriate default status
  };

  log.info(`Order: ${JSON.stringify(order, null, 2)} created!`);

  setupQueryHandler(order);
  if (input.id === undefined) {
    throw new Error('Order ID cannot be empty');
  }
  if (input.customerId === undefined) {
    throw new Error('Customer ID cannot be empty');
  }
  if (input.items === undefined || input.items.length === 0) {
    throw new Error('Items cannot be empty');
  }

  const reserveItemsResult = await reserveItems({ orderId: order.id, items: order.items });

  if (!reservationsFound(reserveItemsResult)) {
    throw new Error('No reservations found for the order');
  }

  log.info(`Reservations: ${JSON.stringify(reserveItemsResult.reservations, null, 2)}`);

  order.fulfillments = reserveItemsResult.reservations.map((reservation, i): Fulfillment => {
    const id = `${order.id}:${i + 1}`;
    return {
      orderId: order.id,
      customerId: order.customerId,
      id: id,
      items: reservation.items,
      location: reservation.location,
      status: 'pending'
    };
  });

  if (customerActionRequired(order)) {
    // update order status to indicate customer action is required
    order.status = 'customerActionRequired';

    const customerAction = await waitForCustomer(order);

    log.info(`Customer action taken: ${customerAction}`);
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
        log.info(`Unknown action taken by customer: ${customerAction}`);
        throw new Error(`Unknown action: ${customerAction}`);
    }
  }

  await updateOrderStatus(order.id, 'processing');

  const fulfillmentMap = new Map(order.fulfillments.map((f) => [f.id, f]));

  wf.setHandler(shipmentStatusSignal, ({ shipmentId, status, updatedAt }) => {
    log.info(`Shipment status updated: ${shipmentId}, ${status}, ${updatedAt}`);
    // You can handle the shipment status update here if needed
    const fulfillment = fulfillmentMap.get(shipmentId);

    if (fulfillment) {
      fulfillment.shipment = {
        id: shipmentId,
        status: status,
        items: fulfillment.items,
        updatedAt: updatedAt
      };
      log.info(`Shipment status updated for ${shipmentId}: ${status}`);
    } else {
      console.warn(`No fulfillment found for shipment ID: ${shipmentId}`);
    }
  });

  await runFulfillments(order);

  // you can use childHandle to signal, query, cancel, terminate, or get result here
  await wf.sleep('5 minutes'); // Simulate some processing time
  log.info(`order: ${JSON.stringify(order, null, 2)}`);
  await updateOrderStatus(order.id, 'completed');
  return order;
}

async function runFulfillments(order: OrderQueryResult) {
  if (!order?.fulfillments?.[0]) {
    log.warning('No fulfillments to run');
    return;
  }

  const fulfillmentResults = order.fulfillments.map((fulfillment) => {
    log.info(`Starting fulfillment workflow for: ${fulfillment.id}`);
    return wf.executeChild(processFulfillment, {
      args: [fulfillment],
      taskQueue: 'orders',
      workflowId: `fulfillment-${fulfillment.id}`,
      workflowExecutionTimeout: '10m'
    });
  });

  await Promise.all(fulfillmentResults)
    .then((results) => {
      log.info(`Fulfillment results: ${JSON.stringify(results, null, 2)}`);
    })
    .catch((error) => {
      console.error(`Error processing fulfillments for order ${order.id}:`, error);
    });
}

export async function processFulfillment(fulfillment: Fulfillment): Promise<string> {
  log.info(`Processing fulfillment: ${fulfillment.id}`);
  await wf.sleep('1 minutes'); // Simulate some processing time
  return 'Fulfillment processed successfully';
}

/* const shipmentStatusSignal = defineSignal<[string, string, string]>('ShipmentStatusUpdated');

export async function handleShipmentStatusUpdates(fulfillments: Fulfillment[]): Promise<string> {
  const fulfillmentMap = new Map(fulfillments.map((f) => [f.id, f]));



  if (!ch) {
    throw new Error('Channel "ShipmentStatusUpdated" not found');
  }
  ch.ch.subscribe((message, signal) => {
    const { shipmentId, status, updatedAt } = signal;
    const fulfillment = fulfillmentMap.get(shipmentId);
    if (fulfillment) {
      fulfillment.status = status;
      fulfillment.shipment = {
        id: shipmentId,
        status: status,
        items: fulfillment.items,
        updatedAt: updatedAt
      };
      log.info(`Shipment status updated for ${shipmentId}: ${status}`);
    } else {
      console.warn(`No fulfillment found for shipment ID: ${shipmentId}`);
    }
  });

  log.info(`Child workflow started with name: ${fulfillment}`);
  // Simulate some work in the child workflow
  await new Promise((resolve) => setTimeout(resolve, 1000));
  log.info(`Child workflow completed with name: ${fulfillment}`);
  return `Child workflow result for ${fulfillment}`;
} */

/* func (wf *orderImpl) handleShipmentStatusUpdates(ctx workflow.Context) {
	ch := workflow.GetSignalChannel(ctx, shipment.ShipmentStatusUpdatedSignalName)

	for {
		var signal shipment.ShipmentStatusUpdatedSignal
		_ = ch.Receive(ctx, &signal)
		for _, f := range wf.fulfillments {
			if f.ID == signal.ShipmentID {
				f.Shipment.Status = signal.Status
				f.Shipment.UpdatedAt = signal.UpdatedAt

				log.infoger.Info("Shipment status updated", "shipmentID", signal.ShipmentID, "status", signal.Status)

				break
			}
		}
	}
} */
function cancelUnavailableFulfillments(order: OrderQueryResult): void {
  order.fulfillments?.forEach((fulfillment) => {
    if (fulfillment.status === 'unavailable') {
      fulfillment.status = 'cancelled'; // Update status to 'cancelled'
      log.info(`Fulfillment ${fulfillment.id} has been cancelled due to unavailability.`);
    }
  });

  log.info(`Order ${order.id} has been amended due to unavailable fulfillments.`);
  // You might want to call an activity to update the order status in the database here
}

function cancelAllFulfillments(order: OrderQueryResult): void {
  order.fulfillments?.forEach((fulfillment) => {
    fulfillment.status = 'cancelled'; // Update each fulfillment status to 'cancelled'
  });
  order.status = 'cancelled'; // Update the order status to 'cancelled'
  log.info(`All fulfillments for order ${order.id} have been cancelled.`);
  // Do I need to update the database or notify any services about this cancellation?
  // You might want to call an activity to update the order status in the database here
}

function reservationsFound(reserveItemsResult: ReserveItemsResult): boolean {
  return !!reserveItemsResult?.reservations?.length;
}
// How should this be made available to the client?
export const getOrderStatus = wf.defineQuery<OrderQueryResult>('getOrderStatus');

function setupQueryHandler(order: OrderQueryResult) {
  wf.setHandler(getOrderStatus, () => {
    log.info(`getOrderStatus called for order: ${order.id}`);
    return order;
  });
}
export const customerActionSignal = wf.defineSignal<[string]>('customerAction');

async function waitForCustomer(order: OrderQueryResult): Promise<string> {
  let signalReceived = false;
  let signalValue: string | undefined;

  setTimeout(() => {
    if (!signalReceived) {
      signalReceived = true;
      signalValue = 'timedOut'; // Simulate a timeout action
    }
  }, 30000); // 30 seconds timeout

  wf.setHandler(customerActionSignal, (value) => {
    signalReceived = true;
    signalValue = value;
  });

  await wf.condition(() => signalReceived);
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

		log.infoger.Info("Timed out waiting for customer action", "timeout", customerActionTimeout)

		signal.Action = CustomerActionTimedOut
	})

	ch := workflow.GetSignalChannel(ctx, CustomerActionSignalName)
	s.AddReceive(ch, func(c workflow.ReceiveChannel, _ bool) {
		c.Receive(ctx, &signal)

		log.infoger.Info("Received customer action", "action", signal.Action)

		cancelTimer()
	})

	log.infoger.Info("Waiting for customer action")

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
