import React, { useMemo } from 'react';

// Assuming types are defined in a shared location, e.g., @/types/order
// You would need to create/update this file (e.g., src/types/order.ts) with definitions like:
//
// export interface Item { id: string; name: string; quantity: number; /* ... */ }
// export interface PaymentDetails { transactionId: string; amount: number; status: string; /* ... */ }
// export interface Shipment { trackingNumber?: string; status: string; /* ... */ }
//
// export interface Fulfillment {
//   id: string; // Unique identifier for React key
//   location?: string;
//   status?: string; // e.g., 'processing', 'shipped', 'cancelled'
//   shipment?: Shipment; // Optional shipment details for this fulfillment
//   items: Item[];
//   payment?: PaymentDetails; // Optional payment details for this fulfillment
// }
//
// export interface Order {
//   id: string;
//   fulfillments?: Fulfillment[]; // Fulfillments are optional on an order
//   // ... other order properties
// }
import type { Fulfillment as FulfillmentType } from '@/src/types/order';

// Assuming these child components are converted to React (.tsx) and are in the same directory
// or accessible via a path alias like '@/components/'
import { OrderRunStatus } from '@/temporal/src/workflows';
import ItemDetails from './ItemDetails'; // Expects props like: { items: Item[] }
import Payment from './Payment'; // Expects props like: { payment: PaymentDetails }
import ShipmentProgress from './ShipmentProgress'; // Expects props like: { status: string }

interface FulfillmentComponentProps {
  order: OrderRunStatus; // Based on Svelte's $props(), order is expected to be provided
}

const Fulfillment: React.FC<FulfillmentComponentProps> = ({ order }) => {
  // Svelte: let fulfillments: Fulfillment[] = $derived(order?.fulfillments || []);
  // useMemo will recompute only if order.fulfillments changes.
  const fulfillments: FulfillmentType[] = useMemo(
    () => (order.fulfillments as FulfillmentType[]) || [],
    [order.fulfillments]
  );

  // Svelte: const getStatus = (fulfillment: Fulfillment): string => { ... }
  const getStatus = (currentFulfillment: FulfillmentType): string => {
    if (!currentFulfillment.shipment) {
      return currentFulfillment.status || 'unavailable';
    }
    return currentFulfillment.shipment.status;
  };

  return (
    <div className="flex flex-col gap-4 w-full items-start">
      {fulfillments.map((fulfillment) => (
        <div className="container" key={fulfillment.id}>
          {' '}
          {/* Ensure fulfillment.id is unique */}
          <div className="flex flex-col md:flex-row items-end justify-between w-full border-b-2 mb-1">
            <p className="text-lg text-gray-500/90 font-semibold italic">
              {fulfillment.location
                ? fulfillment.location
                : fulfillment.status === 'cancelled'
                  ? 'Unavailable'
                  : 'Action Required'}
            </p>
            <ShipmentProgress status={getStatus(fulfillment)} />
          </div>
          <div className="w-full flex flex-col md:flex-row justify-between gap-2 my-4 items-center">
            <ItemDetails items={fulfillment.items} />
            {fulfillment.payment && <Payment payment={fulfillment.payment} />}
          </div>
        </div>
      ))}
    </div>
  );
};

export default Fulfillment;
