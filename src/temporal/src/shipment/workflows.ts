import * as wf from '@temporalio/workflow';

import {
  condition,
  executeChild,
  getExternalWorkflowHandle,
  log,
  uuid4
} from '@temporalio/workflow';
import { Temporal } from '@js-temporal/polyfill';
import * as activities from './activities.js'; // Ensure this path is correct and the module exists
export const ShipmentStatusUpdatedSignalName = 'ShipmentStatusUpdated';
import {
  ShipmentCarrierUpdateSignal,
  ShipmentInput,
  ShipmentResult,
  ShipmentStatus,
  Status
} from './definitions.js';

const getShipmentStatus = wf.defineQuery<ShipmentStatus>('getShipmentStatus');

const { bookShipment, updateShipmentStatus } = wf.proxyActivities<typeof activities>({
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

export async function processShipment(input: ShipmentInput): Promise<ShipmentResult> {
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

  wf.setHandler(getShipmentStatus, () => {
    log.info(`getShipmentStatus called for: ${shipmentContext.id}`);
    return {
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

  await updateShipmentStatus(input.id, 'booked');

  wf.setHandler(shipmentCarrierUpdateSignal, ({ status }) => {
    log.info(`Shipment status updated: ${status}`);
    shipmentContext.status = status as Status;
    shipmentContext.updatedAt = Temporal.Now.toString();
    updateStatus(shipmentContext, status as Status);
  });

  await wf.condition(() => shipmentContext.status === 'delivered');

  return bookShipmentResult;
}
//const ShipmentStatusUpdatedSignalName = 'ShipmentStatusUpdated';
export interface ShipmentStatusUpdatedSignal {
  shipmentId: string;
  status: Status;
  updatedAt: string;
}

export const shipmentCarrierUpdateSignal = wf.defineSignal<[ShipmentCarrierUpdateSignal]>(
  'ShipmentCarrierUpdateSignalName'
);

async function updateStatus(shipmentContext: ShipmentContext, status: Status): Promise<void> {
  shipmentContext.status = status;
  shipmentContext.updatedAt = Temporal.Now.toString();
  updateShipmentStatus(shipmentContext.id, status);
  const handle = getExternalWorkflowHandle(shipmentContext.requestorWorkflowId);
  await handle.signal(ShipmentStatusUpdatedSignalName, {
    shipmentId: shipmentContext.id,
    status: status,
    updatedAt: shipmentContext.updatedAt
  } as ShipmentStatusUpdatedSignal);
}
