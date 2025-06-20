import { BookShipmentInput, BookShipmentResult, Status } from './definitions.js';
import { db } from '@vercel/postgres';

export async function bookShipment(input: BookShipmentInput): Promise<BookShipmentResult> {
  return { courierReference: input.reference + ':1234' };
}

export async function updateShipmentStatus(id: string, status: Status): Promise<void> {
  const result = await db.sql`
	UPDATE shipments
	SET status = ${status}
	WHERE id = ${id}
  `;
  if (result.rowCount === 0) {
    throw new Error(`Failed to update order status for ID: ${id}`);
  }
}
