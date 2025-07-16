'use client';

import { fetchOrders } from '@/actions/actions';
import Button from '@/components/Button';
import Link from '@/components/Link';
import StatusBadge from '@/components/StatusBadge';
import { OrderQueryResult } from '@/temporal/src/order/definitions';
import type { TableColumns, TableData } from '@/types/ui';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import TableWithHeader from '@/components/TableWithHeader';

function OrdersPage() {
  const [orders, setOrders] = useState<OrderQueryResult[]>(); // Initialize state for orders

  const router = useRouter();

  useEffect(() => {
    const fetchData = async () => {
      try {
        const orders = await fetchOrders();
        setOrders(orders);
      } catch (error) {
        console.error('Error fetching orders:', error);
      }
    };
    fetchData();
  }, []);

  // Define columns for the TableWithHeader component
  // The `formatter` returns an object specifying the component to render and its props.
  // The `TableWithHeader` component would then instantiate these components.
  const columns: TableColumns = [
    {
      title: 'Order ID',
      key: 'id',
      formatter: (value: string) => {
        return {
          type: Link,
          props: { value, href: `/orders/${value}` }
        };
      }
    },
    {
      title: 'Date & Time',
      key: 'received_at',
      formatter: (value: string) => {
        return `${new Date(value).toLocaleDateString()} ${new Date(value).toLocaleTimeString()}`;
      }
    },
    {
      title: 'Status',
      key: 'status',
      formatter: (value: string) => ({
        type: StatusBadge,
        props: { status: value }
      })
    }
  ];

  return (
    <TableWithHeader
      title="Orders"
      columns={columns}
      data={orders as TableData}
      action={() => <Button onClick={() => router.push('/orders/new')}>New Order</Button>}
    ></TableWithHeader>
  );
}

export default OrdersPage;
