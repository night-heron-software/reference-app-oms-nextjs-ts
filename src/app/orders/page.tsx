'use client';

import { fetchOrders } from '@/actions/actions'; // Adjust the import path as necessary
import { OrderQueryResult } from '@/temporal/src/order/order';
import type { TableColumns, TableData } from '@/types/ui'; // Adjust the import path as necessary
import { useRouter } from 'next/navigation';
import React, { useEffect, useState } from 'react';
// Assuming these are your React components, paths might need adjustment
// e.g., if your lib folder is aliased to @/lib
import Button from '@/components/Button';
import Link from '@/components/Link';
import StatusBadge from '@/components/StatusBadge';
import TableWithHeader from '../../components/TableWithHeader';
//import TableWithHeader from '@/components/TableWithHeader'; // Assuming TableWithHeader exports ColumnDefinition

// Definition for table columns
export interface ColumnDefinition<TData extends Record<string, any>> {
  title: string;
  key: keyof TData | (string & {}); // Allows string keys while preferring keyof TData for type safety
  render: (value: TData[keyof TData], record: TData, index: number) => React.ReactNode;
}

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

// Note: For this to work, you'd need React versions of your Svelte components:
// - Button.tsx (or .jsx)
// - Link.tsx (or .jsx) - Its props might differ from Svelte version.
//   The Svelte version used `value` for text content.
// - StatusBadge.tsx (or .jsx)
// - TableWithHeader.tsx (or .jsx) - It would need to accept `columns` with a `render`
//   function, and an `actionElement` prop (or similar) for the button.
//   The ColumnDefinition type would also be defined by or for TableWithHeader.
//
// Example minimal ColumnDefinition for TableWithHeader:
// export interface ColumnDefinition<T> {
//   title: string;
//   key: keyof T | (string & {}); // To allow string keys while preferring keyof T
//   render: (value: any, record: T, index: number) => React.ReactNode;
// }
