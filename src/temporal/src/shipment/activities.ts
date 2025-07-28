import { Temporal } from '@js-temporal/polyfill';
import { BookShipmentInput, BookShipmentResult, Status } from './definitions.js';
import { log } from '@temporalio/activity';
import { sql } from '../db/client.js';

export async function bookShipment(input: BookShipmentInput): Promise<BookShipmentResult> {
  return { courierReference: input.reference + ':1234' };
}

export async function updateShipmentStatusInDb(id: string, status: Status): Promise<void> {
  const bookedAt = Temporal.Now.plainDateTimeISO().toString();
  const result =
    await sql`INSERT INTO shipments (id,booked_at,status) VALUES (${id}, ${bookedAt}, ${status}) ON CONFLICT(id) DO UPDATE SET status = ${status}`;
  log.info(`updateShipmentStatus: ${JSON.stringify(result, null, 2)}`);
}
