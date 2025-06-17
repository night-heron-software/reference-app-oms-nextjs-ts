import * as wf from '@temporalio/workflow';

import { log } from '@temporalio/workflow';
import { Item, GenerateInvoiceResult, ChargeInput, ChargeResult } from './definitions.js';
import * as activities from './activities.js';
import { ChargeCustomerInput, ChargeCustomerResult } from './definitions.js';
import { chargeCustomer } from './activities.js';

export const ShipmentStatusUpdatedSignalName = 'ShipmentStatusUpdated';

export type ShipmentStatus = 'pending' | 'shipped' | 'timed_out' | 'cancelled';
export interface ShipmentStatusUpdatedSignal {
  shipmentId: string;
  status: ShipmentStatus;
  updatedAt: Date;
}

export const shipmentStatusSignal =
  wf.defineSignal<[ShipmentStatusUpdatedSignal]>('ShipmentStatusUpdated');

const { generateInvoice } = wf.proxyActivities<typeof activities>({
  retry: {
    initialInterval: '1 minute',
    maximumInterval: '16 minute',
    backoffCoefficient: 2,
    maximumAttempts: 500
  },
  startToCloseTimeout: '2 hours'
});

export async function charge(input: ChargeInput): Promise<ChargeResult> {
  const invoice = await generateInvoice({
    customerId: input.customerId,
    reference: input.reference,
    items: input.items
  });

  log.info(`charge(${JSON.stringify(input)}): ${JSON.stringify(invoice)}`);
  const chargeResult = await chargeCustomer({
    customerId: input.customerId,
    reference: input.reference,
    charge: invoice.total
  });
  return {
    ...invoice,
    ...chargeResult
  };
}
