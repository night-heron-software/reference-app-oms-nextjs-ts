import React, { useMemo } from 'react';

import type { Fulfillment as FulfillmentType } from '@/temporal/src/order/order';

// Assuming these child components are converted to React (.tsx) and are in the same directory
// or accessible via a path alias like '@/components/'
import { OrderQueryResult } from '@/temporal/src/order/order';
import ItemDetails from './ItemDetails'; // Expects props like: { items: Item[] }
import Payment from './Payment'; // Expects props like: { payment: PaymentDetails }
import ShipmentProgress from './ShipmentProgress'; // Expects props like: { status: string }

interface FulfillmentComponentProps {
  order: OrderQueryResult; // Based on Svelte's $props(), order is expected to be provided
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
