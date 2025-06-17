'use client';

import { useEffect, useState, useMemo, useCallback, use } from 'react';
import { useRouter } from 'next/navigation';
import { fetchOrderById } from '@/actions/actions'; // Adjust the import path as necessary

// Assuming components are converted to React and placed in a components directory
// You might need to adjust these paths based on your project structure and path aliases
import Fulfillment from '@/components/Fulfillment'; // Corrected spelling
import Button from '@/components/Button';
import Card from '@/components/Card';
import Heading from '@/components/Heading';
import StatusBadge from '@/components/StatusBadge';
// FIXME: need to find the correct way to share types between nextjs and temporal
import type { OrderQueryResult } from '@/types/shared';

// Assuming types are defined in a shared location, e.g., @/types/order
// You would need to create this file and define the types.
// Example types/order.ts:
// export type Action = 'amend' | 'cancel';
// export interface Order {
//   id: string;
//   status: string;
//   customerId: string;
//   // ... other properties
// }
import type { Action, Order } from '@/types/order';

interface OrderPageProps {
  params: Promise<{ id: string }>;
}

export default function OrderPage(props: OrderPageProps) {
  const params = use(props.params);
  const router = useRouter();
  const { id } = params;

  const [order, setOrder] = useState<OrderQueryResult | null>(null);
  const [actionLoading, setActionLoading] = useState(false); // For action buttons
  const [pageLoading, setPageLoading] = useState(true); // For initial order load

  // Initial data fetch
  useEffect(() => {
    if (id) {
      setPageLoading(true);
      const orderStatus = fetchOrderById(id);
      orderStatus
        .then((fetchedOrder) => {
          if (!fetchedOrder) {
            //console.error('Order not found or failed to load');
            setPageLoading(false);
            return;
          }
          setOrder(fetchedOrder);
          setPageLoading(false);
        })
        .catch((error) => {
          console.error('Error fetching order:', error);
          setPageLoading(false);
        });
    }
  }, []);

  const sendAction = async (action: Action) => {
    console.log(`Sending action: ${action} for order ID: ${id}`);
  };

  const actionRequired = useMemo(() => {
    return order?.status === 'customerActionRequired';
  }, [order]);

  if (pageLoading) {
    return <div className="p-4">Loading order details...</div>; // Or a spinner component
  }

  if (!order) {
    return <div className="p-4">Order not found or failed to load.</div>;
  }

  const renderActionButtons = () => {
    if (actionRequired) {
      return (
        <div className="flex items-center justify-end gap-2 mt-4">
          <Button loading={actionLoading} onClick={() => sendAction('amend')}>
            Amend
          </Button>
          <Button loading={actionLoading} onClick={() => sendAction('cancel')}>
            Cancel
          </Button>
        </div>
      );
    } else {
      return (
        <p className="px-4 py-2 text-sm font-light mt-4">
          <i>Customer {order.customerId}</i>
        </p>
      );
    }
  };

  return (
    <Card>
      <div className="w-full flex flex-col gap-2">
        <div className="flex flex-row items-center gap-2 w-full">
          <StatusBadge status={order?.status || 'unkown'} />
          <Heading>{order.id}</Heading>
        </div>
        <Fulfillment order={order} />
      </div>
      {renderActionButtons()}
    </Card>
  );
}
