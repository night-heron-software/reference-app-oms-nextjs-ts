import * as wf from '@temporalio/workflow';

import { log } from '@temporalio/workflow';
import * as activities from './activities.js';
import { ChargeInput, ChargeOutput } from './definitions.js';

const { generateInvoice, chargeCustomer } = wf.proxyActivities<typeof activities>({
  retry: {
    initialInterval: '1 minute',
    maximumInterval: '16 minute',
    backoffCoefficient: 2,
    maximumAttempts: 500
  },
  startToCloseTimeout: '2 hours'
});

export async function charge(input: ChargeInput): Promise<ChargeOutput> {
  log.info(`charge(${JSON.stringify(input)})`);

  const invoice = await generateInvoice({
    customerId: input.customerId,
    reference: input.reference,
    items: input.items
  });

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
