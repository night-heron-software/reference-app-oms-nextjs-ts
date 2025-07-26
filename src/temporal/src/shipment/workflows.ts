import * as wf from '@temporalio/workflow';

import { Temporal } from '@js-temporal/polyfill';
import { getExternalWorkflowHandle, log } from '@temporalio/workflow';
import * as activities from './activities.js'; // Ensure this path is correct and the module exists
import {
  ShipInput,
  ShipOutput,
  ShipmentStatusUpdatedSignal,
  Status,
  getShipmentStatus,
  shipmentCarrierUpdateSignal
} from './definitions.js';
export const ShipmentStatusUpdatedSignalName = 'ShipmentStatusUpdated';

const { bookShipment, updateShipmentStatusInDb } = wf.proxyActivities<typeof activities>({
  retry: {
    initialInterval: '1 minute',
    maximumInterval: '16 minute',
    backoffCoefficient: 2,
    maximumAttempts: 500
  },
  startToCloseTimeout: '2 hours'
});

interface ShipmentContext {
  requestorWorkflowId: string;
  id: string;
  status: Status;
  updatedAt: string;
}

export async function ship(input: ShipInput): Promise<ShipOutput> {
  log.info(`ship: ${JSON.stringify(input, null, 2)}`);
  if (!input?.id) {
    throw new Error('Order ID cannot be empty');
  }

  if (!input?.items?.length || input.items.length === 0) {
    throw new Error('Items cannot be empty');
  }
  const shipmentContext: ShipmentContext = {
    requestorWorkflowId: input.requestorWorkflowId,
    id: input.id,
    status: 'pending' as Status,
    updatedAt: Temporal.Now.instant().toString()
  };

  const workflowId = wf.workflowInfo().workflowId;
  wf.setHandler(getShipmentStatus, () => {
    log.info(`getShipmentStatus called for: ${shipmentContext.id}`);
    return {
      workflowId: workflowId,
      id: input.id,
      items: input.items,
      status: shipmentContext.status,
      updatedAt: Temporal.Now.toString()
    };
  });

  const bookShipmentResult = await bookShipment({
    reference: input.id,
    items: input.items
  });

  await updateShipmentStatus(shipmentContext, 'booked');

  wf.setHandler(shipmentCarrierUpdateSignal, async (parms) => {
    const status = parms.status;
    await updateShipmentStatus(shipmentContext, status as Status);

    log.info(`Shipment status updated: ${status}`);
  });

  await wf.condition(() => shipmentContext.status === 'delivered');
  await wf.condition(wf.allHandlersFinished);
  log.info('shipment delivered');

  return { id: shipmentContext.id, status: shipmentContext.status };
}

async function updateShipmentStatus(
  shipmentContext: ShipmentContext,
  status: Status
): Promise<void> {
  shipmentContext.status = status;
  shipmentContext.updatedAt = Temporal.Now.plainDateTimeISO().toString();
  await updateShipmentStatusInDb(shipmentContext.id, status);
  const handle = getExternalWorkflowHandle(shipmentContext.requestorWorkflowId);
  await handle.signal(ShipmentStatusUpdatedSignalName, {
    shipmentId: shipmentContext.id,
    status: status,
    updatedAt: shipmentContext.updatedAt
  } as ShipmentStatusUpdatedSignal);
}
