'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';

// Assuming components are converted to React and placed in a components directory
// You might need to adjust these paths based on your project structure and path aliases
import Fulfillment from '@/components/Fulfillment'; // Corrected spelling
import Button from '@/components/Button';
import Card from '@/components/Card';
import Heading from '@/components/Heading';
import StatusBadge from '@/components/StatusBadge';

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
  params: { id: string };
}

export default function OrderPage({ params }: OrderPageProps) {
  const router = useRouter();
  const { id } = params;

  const [order, setOrder] = useState<Order | null>(null);
  const [actionLoading, setActionLoading] = useState(false); // For action buttons
  const [pageLoading, setPageLoading] = useState(true); // For initial order load

  const fetchOrder = useCallback(async (orderId: string) => {
    try {
      // Replace with your actual API endpoint for fetching an order
      const response = await fetch(`/api/orders/${orderId}`);
      if (!response.ok) {
        // If order not found or other error, set order to null or handle error
        if (response.status === 404) {
          setOrder(null);
        }
        throw new Error(`Failed to fetch order: ${response.statusText}`);
      }
      const orderData: Order = await response.json();
      setOrder(orderData);
    } catch (error) {
      console.error('Error fetching order:', error);
      setOrder(null); // Set order to null on error to indicate failure
    } finally {
      setPageLoading(false);
    }
  }, []);

  // Initial data fetch
  useEffect(() => {
    if (id) {
      setPageLoading(true);
      fetchOrder(id);
    }
  }, [id, fetchOrder]);

  // Polling logic for order status
  useEffect(() => {
    if (!order || pageLoading) return;

    const finalStatuses = ['completed', 'failed', 'cancelled', 'timedOut'];
    const isFinal = order.status && finalStatuses.includes(order.status);

    if (isFinal) return; // Stop polling if status is final

    const interval = setInterval(() => {
      fetchOrder(id);
    }, 5000); // Poll every 5 seconds (Svelte original was 500ms)

    return () => {
      clearInterval(interval);
    };
  }, [order, id, fetchOrder, pageLoading]);

  const sendAction = async (action: Action) => {
    setActionLoading(true);
    try {
      await fetch('/api/order-action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, action })
      });

      // Delay similar to Svelte component before navigation/refresh
      setTimeout(() => {
        setActionLoading(false);
        if (action === 'cancel') {
          router.push(`/orders`);
          // Optionally, if /orders page needs server data refresh: router.refresh();
        } else {
          // For other actions, re-fetch the current order's data
          fetchOrder(id);
          // Optionally, if this page relies on server data that needs refreshing: router.refresh();
        }
      }, 1000);
    } catch (error) {
      console.error(`Error sending action ${action}:`, error);
      setActionLoading(false);
      // Handle error (e.g., show a notification)
    }
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
    } else if (order.customerId) {
      return (
        <p className="px-4 py-2 text-sm font-light mt-4">
          <i>Customer {order.customerId}</i>
        </p>
      );
    }
    return null;
  };

  return (
    <Card>
      <div className="w-full flex flex-col gap-2">
        <div className="flex flex-row items-center gap-2 w-full">
          <StatusBadge status={order.status} />
          <Heading>{order.id}</Heading>
        </div>
        <Fulfillment order={order} />
      </div>
      {renderActionButtons()}
    </Card>
  );
}
