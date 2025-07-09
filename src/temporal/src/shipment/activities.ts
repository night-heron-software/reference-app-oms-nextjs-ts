import { Temporal } from '@js-temporal/polyfill';
import { BookShipmentInput, BookShipmentResult, Status } from './definitions.js';
import { db } from '@vercel/postgres';

export async function bookShipment(input: BookShipmentInput): Promise<BookShipmentResult> {
  return { courierReference: input.reference + ':1234' };
}

export async function updateShipmentStatusInDb(id: string, status: Status): Promise<void> {
  const bookedAt = Temporal.Now.plainDateTimeISO().toString();
  const result =
    await db.sql`INSERT INTO shipments (id,booked_at,status) VALUES (${id}, ${bookedAt}, ${status}) ON CONFLICT(id) DO UPDATE SET status = ${status}`;
  if (result.rowCount === 0) {
    throw new Error(`Failed to update order status for ID: ${id}`);
  }
}
