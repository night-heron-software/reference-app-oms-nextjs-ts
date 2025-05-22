import { Reservation, ReserveItemsInput, ReserveItemsResult } from './order.js';

export async function reserveItems(input: ReserveItemsInput): Promise<ReserveItemsResult> {
  const reservations: Reservation[] = [
    { available: true, location: 'warehouse', items: input.items }
  ];

  return { reservations: reservations };
}
