'use client';

import { fetchOrderById, sendCustomerActionSignal } from '@/actions/actions'; // Adjust the import path as necessary
import { orderIdToWorkflowId, type OrderQueryResult } from '@/temporal/src/order/definitions';
import { use, useEffect, useMemo, useState } from 'react';

// Assuming components are converted to React and placed in a components directory
// You might need to adjust these paths based on your project structure and path aliases
import Button from '@/components/Button';
import Card from '@/components/Card';
import Fulfillment from '@/components/Fulfillment'; // Corrected spelling
import Heading from '@/components/Heading';
import StatusBadge from '@/components/StatusBadge';
// FIXME: need to find the correct way to share types between nextjs and temporal

import type { Action } from '@/types/order';

interface OrderPageProps {
  params: Promise<{ id: string }>;
}

export default function OrderPage(props: OrderPageProps) {
  const params = use(props.params);
  const { id } = params;

  const [order, setOrder] = useState<OrderQueryResult | null>(null);
  const [actionLoading, setActionLoading] = useState(false); // For action buttons
  const [pageLoading, setPageLoading] = useState(true); // For initial order load

  // Initial data fetch
  // break out refetch logic into a function
  const refetchOrder = async () => {
    if (id) {
      setPageLoading(true);
      try {
        const fetchedOrder = await fetchOrderById(id);
        if (!fetchedOrder) {
          console.error('Order not found or failed to load');
          setPageLoading(false);
          return;
        }
        setOrder(fetchedOrder);
      } catch (error) {
        console.error('Error fetching order:', error);
      } finally {
        setPageLoading(false);
      }
    }
  };
  useEffect(() => {
    refetchOrder();
  }, []);

  const sendAction = async (action: Action) => {
    setActionLoading(true);
    console.log(`Sending action: ${action} for order ID: ${id}`);
    sendCustomerActionSignal(orderIdToWorkflowId(id), action);
    await new Promise((resolve) => setTimeout(resolve, 10000));
    refetchOrder();
    setActionLoading(false);
  };

  const actionRequired = useMemo(() => {
    return order?.status === 'customerActionRequired';
  }, [order]);

  if (pageLoading) {
    return <Heading>Loading order details...</Heading>;
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
