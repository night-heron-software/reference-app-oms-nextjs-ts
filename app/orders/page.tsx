'use client';

import { fetchOrders } from '@/actions/actions'; // Adjust the import path as necessary
import { Order } from '@/temporal/src/order';
import { useRouter } from 'next/navigation';
import type { TableData } from '@/types/ui'; // Adjust the import path as necessary
import React, { useEffect, useMemo, useState } from 'react';
// Assuming these are your React components, paths might need adjustment
// e.g., if your lib folder is aliased to @/lib
import Button from '@/components/Button';
import Link from '@/components/Link';
import StatusBadge from '@/components/StatusBadge';
import TableWithHeader from '@/components/TableWithHeader'; // Assuming TableWithHeader exports ColumnDefinition
import { TableColumns } from '@/types/ui';

// Definition for table columns
export interface ColumnDefinition<TData extends Record<string, any>> {
  title: string;
  key: keyof TData | (string & {}); // Allows string keys while preferring keyof TData for type safety
  render: (value: TData[keyof TData], record: TData, index: number) => React.ReactNode;
}

function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>(); // Initialize state for orders

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

  const columns: TableColumns = useMemo(
    () => [
      {
        title: 'Order ID',
        key: 'id',
        render: (value: string, record: Order) => (
          // Assuming your Link component takes `value` for text and `href`
          // If it's like Next.js's Link, it might be:
          // <Link href={`/orders/${record.id}`}>{record.id}</Link>
          <Link value={record.id} href={`/orders/${record.id}`} />
        )
      },
      {
        title: 'Date & Time',
        key: 'receivedAt',
        render: (value: string, record: Order) => {
          const date = new Date(record.receivedAt);
          return `${date.toLocaleDateString()} ${date.toLocaleTimeString()}`;
        }
      },
      {
        title: 'Status',
        key: 'status',
        render: (value: string, record: Order) => <StatusBadge status={record.status} />
      }
    ],
    [] // Columns definition is static
  );

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
