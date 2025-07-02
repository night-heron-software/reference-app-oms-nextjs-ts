import * as wf from '@temporalio/workflow';

import { log, uuid4 } from '@temporalio/workflow';
import * as billing from '../billing/definitions.js';
import { charge } from '../billing/workflows.js';
import * as shipment from '../shipment/definitions.js';
import * as activities from './activities.js';
import { type ItemInput, type OrderInput } from './definitions.js';
import { ship } from '../shipment/workflows.js';
import {
  Fulfillment,
  OrderItem,
  OrderQueryResult,
  Payment,
  ReserveItemsResult,
  shipmentStatusSignal
} from './order.js'; // Adjust the import path as necessary

const { reserveItems, updateOrderStatus } = wf.proxyActivities<typeof activities>({
  retry: {
    initialInterval: '1 minute',
    maximumInterval: '16 minute',
    backoffCoefficient: 2,
    maximumAttempts: 500
  },
  startToCloseTimeout: '2h'
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

export async function order(input: OrderInput): Promise<OrderQueryResult> {
  if (!input) {
    throw new Error('Input is Empty!');
  }
  if (!input.id) {
    throw new Error('Order ID cannot be empty');
  }

  if (!input.customerId) {
    throw new Error('Customer ID cannot be empty');
  }

  if (input?.items?.length === 0) {
    throw new Error('Items cannot be empty');
  }

  const order: OrderQueryResult = {
    id: input.id,
    customerId: input.customerId,
    items: buildOrderItems(input),
    receivedAt: new Date().toISOString(),
    status: 'pending' // or another appropriate default status
  };

  log.info(`Order: ${JSON.stringify(order, null, 2)} created!`);

  wf.setHandler(getOrderStatus, () => {
    log.info(`getOrderStatus called for order: ${order.id}`);
    return order;
  });

  const reserveItemsResult = await reserveItems({ orderId: order.id, items: order.items });

  if (!reservationsFound(reserveItemsResult)) {
    throw new Error('No reservations found for the order');
  }

  log.info(`Reservations: ${JSON.stringify(reserveItemsResult.reservations, null, 2)}`);

  order.fulfillments = buildFulfillments(reserveItemsResult, order);

  while (customerActionRequired(order)) {
    order.status = 'customerActionRequired';

    const customerAction = await waitForCustomer(order);

    log.info(`Customer action taken: ${customerAction}`);

    if (customerAction === 'amend') {
      cancelUnavailableFulfillments(order);
    } else if (customerAction === 'cancel') {
      cancelAllFulfillments(order);
      updateOrderStatus(order, 'cancelled');
      return order;
    } else if (customerAction === 'timedOut') {
      updateOrderStatus(order, 'timedOut');
      cancelAllFulfillments(order);
      return order;
    } else {
      log.error(`Unknown action taken by customer: ${customerAction}. Ignored`);
      continue;
    }
    break;
  }
  await wf.condition(wf.allHandlersFinished);
  await updateOrderStatus(order, 'processing');

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
  // waits for payment to be processed before proceeding with shipment

  await runFulfillments(order);
  await updateOrderStatus(order, 'completed');
  log.info(`order: ${JSON.stringify(order, null, 2)}`);
  return order;
}

function buildFulfillments(reserveItemsResult: ReserveItemsResult, order: OrderQueryResult) {
  return reserveItemsResult.reservations.map((reservation, i): Fulfillment => {
    const id = `${order.id}:${i + 1}`;
    const status = reservation.available ? 'pending' : 'unavailable';

    if (!reservation.available) {
      log.info(
        `Reservation for order ${order.id} is unavailable at location ${reservation.location}`
      );
    }

    return {
      orderId: order.id,
      customerId: order.customerId,
      id: id,
      items: reservation.items,
      location: reservation.location,
      status: status
    };
  });
}

function buildOrderItems(input: OrderInput): OrderItem[] {
  return input.items.map((item: ItemInput) => {
    if (item.sku === undefined) {
      throw new Error('Item SKU cannot be empty');
    }
    if (item.quantity === undefined) {
      throw new Error('Item quantity cannot be empty');
    }
    return { sku: item.sku, quantity: item.quantity };
  });
}

async function runFulfillments(order: OrderQueryResult) {
  if (!order?.fulfillments?.[0]) {
    log.warning('No fulfillments to run');
    return;
  }
  order.fulfillments.forEach(async (fulfillment) => {
    const payment: Payment | undefined = await processPayment(fulfillment);
    if (payment) {
      fulfillment.payment = payment; // Add payment details to the fulfillment
    }
  });

  const fulfillmentPromises = order.fulfillments.map((fulfillment) => {
    log.info(`Starting fulfillment workflow for: ${fulfillment.id}`);
    return wf.executeChild(fulfill, {
      args: [fulfillment],
      taskQueue: 'orders',
      workflowId: `Fulfill:${fulfillment.id}`,
      workflowExecutionTimeout: '2h',
      workflowTaskTimeout: '2m'
    });
  });

  const fulfillmentResults = await Promise.all(fulfillmentPromises);
}

export async function fulfill(fulfillment: Fulfillment) {
  log.info(`processFulfillment(${fulfillment.id})`);

  if (fulfillment.status === 'cancelled') {
    log.info(`ignoring cancelled fulfillment ${fulfillment.id}`);
    return undefined;
  }

  await processShipment(fulfillment);
  log.info(`Fulfillment ${fulfillment.id} processed successfully`);
}

function cancelUnavailableFulfillments(order: OrderQueryResult): void {
  order.status = 'processing';
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
  updateOrderStatus(order, 'cancelled'); // Update the order status in the database
  // Do I need to update the database or notify any services about this cancellation?
  // You might want to call an activity to update the order status in the database here
}

function reservationsFound(reserveItemsResult: ReserveItemsResult): boolean {
  return !!reserveItemsResult?.reservations?.length;
}
// How should this be made available to the client?
export const getOrderStatus = wf.defineQuery<OrderQueryResult>('getOrderStatus');

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

export async function processPayment(fulfillment: Fulfillment): Promise<Payment | undefined> {
  log.info(`processPayment: ${JSON.stringify(fulfillment, null, 2)}`);
  const billingItems: billing.Item[] = fulfillment.items.map((item) => ({
    sku: item.sku,
    quantity: item.quantity
  }));

  const chargeKey = uuid4();
  const workflowId = `Charge:${fulfillment.id}-${chargeKey}`;

  log.info(`charge: workflowId: ${workflowId}`);

  try {
    const chargeResult = await wf.executeChild(charge, {
      args: [
        {
          customerId: fulfillment.customerId,
          reference: chargeKey,
          items: billingItems,
          idempotencyKey: chargeKey
        }
      ],
      taskQueue: 'billing',
      workflowId: workflowId,
      workflowExecutionTimeout: '2h',
      workflowTaskTimeout: '2m'
    });

    if (!chargeResult) {
      log.error(`Charge result is undefined for fulfillment ${fulfillment.id}`);
      return undefined;
    }
    log.info(`chargeResult: ${JSON.stringify(chargeResult)}`);

    return { ...chargeResult, status: chargeResult.success ? 'success' : 'failed' };
  } catch (error) {
    log.error(`Error processing payment for fulfillment ${fulfillment.id}: ${error}`);
    return new Promise((resolve, reject) => {
      reject(error);
    });
  }
}

export async function processShipment(fulfillment: Fulfillment): Promise<string> {
  log.info(`processShipment: ${JSON.stringify(fulfillment, null, 2)}`);

  const shipmentItems: shipment.ShipmentItem[] = fulfillment.items.map((item) => ({
    sku: item.sku,
    quantity: item.quantity
  }));

  const requestorWorkflowId = wf.workflowInfo().workflowId;
  const shipmentInput: shipment.ShipmentInput = {
    requestorWorkflowId: requestorWorkflowId,
    id: fulfillment.id,
    items: shipmentItems
  };
  log.info(`shipmentInput: ${JSON.stringify(shipmentInput, null, 2)}`);
  const workflowId = shipment.shipmentIdToWorkflowId(fulfillment.id);
  log.info(`ship: workflowId: ${workflowId}`);
  try {
    const workflowResult = await wf.executeChild(ship, {
      args: [shipmentInput],
      taskQueue: 'shipments',
      workflowId: workflowId,
      workflowExecutionTimeout: '2h',
      workflowTaskTimeout: '2m'
    });
    log.info(`shipment workflow result: ${JSON.stringify(workflowResult)}`);
  } catch (error) {
    log.error(`Error processing shipment for fulfillment ${fulfillment.id}: ${error}`);
    return new Promise((resolve, reject) => {
      reject(error);
    });
  }
  return new Promise((resolve, reject) => {
    resolve('Payment processed successfully');
  });
}
