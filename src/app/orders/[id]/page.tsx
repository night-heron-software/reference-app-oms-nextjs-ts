'use client';

import { executeCustomerActionUpdate, fetchOrderById } from '@/actions/actions'; // Adjust the import path as necessary
import { orderIdToWorkflowId, type OrderQueryResult } from '@/temporal/src/order/definitions';
import { use, useEffect, useMemo, useState } from 'react';

import Button from '@/components/Button';
import Card from '@/components/Card';
import Fulfillment from '@/components/Fulfillment';
import Heading from '@/components/Heading';
import StatusBadge from '@/components/StatusBadge';

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
  useEffect(() => {
    const fetchOrder = async () => {
      if (id) {
        if (!order) {
          setPageLoading(true);
        }
        try {
          for (let retry = 0; retry < 10; retry++) {
            const fetchedOrder = await fetchOrderById(id);
            if (!fetchedOrder || fetchedOrder.status === 'uninitialized') {
              await new Promise((resolve) => setTimeout(resolve, 100));
              continue;
            } else {
              setOrder(fetchedOrder);
              break;
            }
          }
        } catch (error) {
          console.error('Error fetching order:', error);
        } finally {
          setPageLoading(false);
        }
      }
    };

    fetchOrder();
  }, []);

  const executeAction = async (action: Action) => {
    setActionLoading(true);
    console.log(`Sending action: ${action} for order ID: ${id}`);
    const result = await executeCustomerActionUpdate(orderIdToWorkflowId(id), action);
    if (result) {
      setOrder(result);
      setActionLoading(false);
    } else {
      console.error(`Failed to send action: ${action} for order ID: ${id}`);
      throw new Error('Failed to send action');
    }
  };

  const actionRequired = order?.status && order.status === 'customerActionRequired';

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
          <Button loading={actionLoading} onClick={() => executeAction('amend')}>
            Amend
          </Button>
          <Button loading={actionLoading} onClick={() => executeAction('cancel')}>
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
