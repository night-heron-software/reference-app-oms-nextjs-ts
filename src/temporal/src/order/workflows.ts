import * as wf from '@temporalio/workflow';

import { Temporal } from '@js-temporal/polyfill';
import { log, uuid4 } from '@temporalio/workflow';
import * as billing from '../billing/definitions.js';
import { charge } from '../billing/workflows.js';
import * as shipment from '../shipment/definitions.js';
import { ship } from '../shipment/workflows.js';
import * as activities from './activities.js';
import {
  FulfillInput,
  Fulfillment,
  fulfillmentIdToWorkflowId,
  FulfillOutput,
  OrderContext,
  OrderItem,
  OrderStatus,
  Payment,
  ReserveItemsResult,
  shipmentStatusSignal,
  type ItemInput,
  type OrderInput,
  type OrderOutput
} from './order.js';

const { reserveItems, updateOrderStatusInDb } = wf.proxyActivities<typeof activities>({
  retry: {
    initialInterval: '1 minute',
    maximumInterval: '16 minute',
    backoffCoefficient: 2,
    maximumAttempts: 500
  },
  startToCloseTimeout: '2h'
});

function customerActionRequired(order: OrderContext): boolean {
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

export async function order(input: OrderInput): Promise<OrderOutput> {
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

  const orderContext: OrderContext = {
    id: input.id,
    customerId: input.customerId,
    items: buildOrderItems(input),
    receivedAt: new Date().toISOString(),
    status: 'pending',
    fulfillments: [],
    workflowId: wf.workflowInfo().workflowId,
    updatedAt: Temporal.Now.plainDateTimeISO().toString()
  };

  log.info(`Order: ${JSON.stringify(orderContext, null, 2)} created!`);

  wf.setHandler(getOrderStatus, () => {
    log.info(`getOrderStatus called for order: ${orderContext.id}`);
    // OrderContext is the same as OrderContext but the types might diverge in the future.
    // If so, we map that here.
    return orderContext as OrderContext;
  });

  const reserveItemsResult = await reserveItems({
    orderId: orderContext.id,
    items: orderContext.items
  });

  if (!reservationsFound(reserveItemsResult)) {
    throw new Error('No reservations found for the order');
  }

  log.info(`Reservations: ${JSON.stringify(reserveItemsResult.reservations, null, 2)}`);

  orderContext.fulfillments = buildFulfillments(reserveItemsResult, orderContext);

  while (customerActionRequired(orderContext)) {
    orderContext.status = 'customerActionRequired';

    const customerAction = await waitForCustomer(orderContext);

    log.info(`Customer action taken: ${customerAction}`);

    if (customerAction === 'amend') {
      cancelUnavailableFulfillments(orderContext);
    } else if (customerAction === 'cancel') {
      cancelAllFulfillments(orderContext);
      updateOrderStatus(orderContext, 'cancelled');
      return orderContext;
    } else if (customerAction === 'timedOut') {
      updateOrderStatus(orderContext, 'timedOut');
      cancelAllFulfillments(orderContext);
      return orderContext;
    } else {
      log.error(`Unknown action taken by customer: ${customerAction}. Ignored`);
      continue;
    }
    break;
  }
  await wf.condition(wf.allHandlersFinished);
  await updateOrderStatus(orderContext, 'processing');

  const fulfillmentMap = new Map(orderContext.fulfillments.map((f) => [f.id, f]));

  wf.setHandler(shipmentStatusSignal, ({ shipmentId, status, updatedAt }) => {
    const fulfillment = fulfillmentMap.get(shipmentId);
    if (fulfillment?.shipment) {
      fulfillment.shipment.updatedAt = updatedAt || new Date().toISOString();
      fulfillment.shipment.status = status;
      log.info(`Shipment status updated for ${shipmentId}: ${status}`);
    } else {
      log.error(`No fulfillment found for shipment ID: ${shipmentId}`);
    }
  });

  await runFulfillments(orderContext);
  await wf.condition(wf.allHandlersFinished);
  await updateOrderStatus(orderContext, 'completed');
  log.info(`order: ${JSON.stringify(orderContext, null, 2)}`);
  return orderContext;
}

async function updateOrderStatus(order: OrderContext, status: OrderStatus): Promise<void> {
  order.status = status;
  log.info(`Updating order status to ${status} for order: ${order.id}`);
  await updateOrderStatusInDb(order, status);
}

function buildFulfillments(reserveItemsResult: ReserveItemsResult, order: OrderContext) {
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
      shipment: {
        id: id,
        status: 'pending',
        items: reservation.items,
        updatedAt: Temporal.Now.plainDateTimeISO().toString()
      },
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

async function runFulfillments(order: OrderContext) {
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
    const fulfillInput: FulfillInput = {
      orderWorkflowId: order.workflowId,
      id: fulfillment.id,
      items: fulfillment.items,
      customerId: fulfillment.customerId,
      status: fulfillment.status,
      shipment: fulfillment.shipment
    };
    log.info(`Starting fulfillment workflow for: ${fulfillment.id}`);

    return wf.executeChild(fulfill, {
      args: [fulfillInput],
      taskQueue: 'orders',
      workflowId: fulfillmentIdToWorkflowId(fulfillment.id),
      workflowExecutionTimeout: '2h',
      workflowTaskTimeout: '2m'
    });
  });

  const fulfillmentResults = await Promise.all(fulfillmentPromises);
  const fulfillmentResultMap = new Map(fulfillmentResults.map((result) => [result.id, result]));

  order.fulfillments.forEach((fulfillment) => {
    const result = fulfillmentResultMap.get(fulfillment.id);
    if (result) {
      fulfillment.status = result.status;
      log.info(`Fulfillment ${fulfillment.id} status updated to ${fulfillment.status}`);
    } else {
      log.error(`No result found for fulfillment ${fulfillment.id}`);
    }
  });
}

export async function fulfill(fulfillInput: FulfillInput): Promise<FulfillOutput> {
  if (fulfillInput.status === 'cancelled') {
    log.info(`ignoring cancelled fulfillment ${fulfillInput.id}`);
    return { id: fulfillInput.id, status: fulfillInput.status };
  }
  log.info(`Fulfillment ${fulfillInput.id} processed successfully`);

  const shipmentResult = await processShipment(fulfillInput);

  switch (shipmentResult.status) {
    case 'delivered':
      fulfillInput.status = 'completed';
      break;
    default:
      fulfillInput.status = 'failed';
      log.error(`Shipment ${shipmentResult.id} failed.`);
      break;
  }
  return {
    id: fulfillInput.id,
    status: fulfillInput.status
  };
}

function cancelUnavailableFulfillments(order: OrderContext): void {
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

function cancelAllFulfillments(order: OrderContext): void {
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
export const getOrderStatus = wf.defineQuery<OrderContext>('getOrderStatus');

export const customerActionSignal = wf.defineSignal<[string]>('customerAction');

async function waitForCustomer(order: OrderContext): Promise<string> {
  let signalReceived = false;
  let signalValue = 'timedOut'; // Default value if no action is taken

  wf.setHandler(customerActionSignal, (value) => {
    signalReceived = true;
    signalValue = value;
  });
  const conditionPromise = wf.condition(() => signalReceived);
  const timeoutPromise = wf.sleep(10 * 60 * 1000); // Wait for 5 minutes for customer action
  await Promise.race([conditionPromise, timeoutPromise]);
  return signalValue;
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

export async function processShipment(fulfillInput: FulfillInput): Promise<shipment.ShipOutput> {
  const shipmentItems: shipment.ShipmentItem[] = fulfillInput.items.map((item) => ({
    sku: item.sku,
    quantity: item.quantity
  }));

  const workflowId = shipment.shipmentIdToWorkflowId(fulfillInput.id);

  const shipInput: shipment.ShipInput = {
    requestorWorkflowId: fulfillInput.orderWorkflowId,
    id: fulfillInput.id,
    items: shipmentItems
  };

  try {
    const workflowResult = await wf.executeChild(ship, {
      args: [shipInput],
      taskQueue: 'shipments',
      workflowId: workflowId,
      workflowExecutionTimeout: '2h',
      workflowTaskTimeout: '2m'
    });
    return workflowResult;
  } catch (error) {
    log.error(`Error processing shipment for fulfillment ${fulfillInput.id}: ${error}`);
    return { id: fulfillInput.id, status: 'failed' };
  }
}
