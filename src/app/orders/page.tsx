'use client';

import { fetchOrders } from '@/actions/actions';
import Button from '@/components/Button';
import Heading from '@/components/Heading';
import Link from '@/components/Link';
import StatusBadge from '@/components/StatusBadge';
import TableWithHeader from '@/components/TableWithHeader';
import { OrderQueryResult } from '@/temporal/src/order/definitions';
import type { TableColumns, TableData } from '@/types/ui';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

function OrdersPage() {
  const [orders, setOrders] = useState<OrderQueryResult[]>();
  const [loading, setLoading] = useState(true);

  const router = useRouter();

  useEffect(() => {
    const getOrders = async () => {
      setLoading(true);
      try {
        const orders = await fetchOrders();
        setOrders(orders);
        setLoading(false);
      } catch (error) {
        console.error('Error fetching orders:', error);
      }
    };
    getOrders();
  }, []);

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
  if (loading) {
    return <Heading>Loading orders...</Heading>;
  }

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
