// /Users/jeffromine/src/learning/temporal/reference-app-oms-nextjs-ts/app/shipments/page.tsx
'use client'; // Assuming child components might have client-side interactions

import React, { useEffect, useMemo, useState } from 'react';

// Assuming these components are converted to React and available at these paths
// You might need to adjust the import paths based on your project structure
import Link from '@/components/Link'; // Placeholder for Link.tsx
import TableWithHeader from '@/components/TableWithHeader'; // Placeholder for TableWithHeader.tsx
import StatusBadge from '@/components/StatusBadge'; // Placeholder for StatusBadge.tsx
import { ColumnDefinition } from '../orders/page';
import { TableColumns } from '@/types/ui';
import { fetchShipments } from '@/actions/actions';

// Define placeholder props for imported components for type safety
// Actual props might differ based on your component implementations
interface LinkProps {
  value: string;
  href: string;
  children?: React.ReactNode; // Optional children if Link wraps content
}

interface StatusBadgeProps {
  status: string;
}

// Define the structure for a column definition, similar to the Svelte version
// The TableWithHeader component would be responsible for using this structure to render cells.
/* 
interface ColumnDefinition<T = any> {
  title: string;
  key: keyof T | string; // Allow string for flexibility, but keyof T is safer
  formatter: (
    value: any,
    record: T
  ) => {
    Component: React.ElementType; // e.g., Link, StatusBadge
    props: any; // Props for the Component
  };
}
 */
/* interface TableWithHeaderProps<T = any> {
  title: string;
  columns: ColumnDefinition<T>[];
  data: T[];
}
 */
// Define the structure of a single shipment item
interface Shipment {
  id: string;
  status: string;
  // Add other properties of a shipment if they exist
  // For example:
  // orderId: string;
  // trackingNumber?: string;
  // estimatedDelivery: string;
}

// Define the props for this page component
interface ShipmentsPageProps {
  data: {
    shipments: Shipment[];
  };
}

export default function ShipmentsPage() {
  const [shipments, setShipments] = useState<Shipment[]>([]);

  useEffect(() => {
    const fetchInitialShipments = async () => {
      try {
        const shipments = await fetchShipments();
        setShipments(shipments);
      } catch (error) {
        console.error('Error fetching orders:', error);
      }
    };
    fetchInitialShipments();
  }, []);

  const columns: TableColumns = useMemo(
    () => [
      {
        title: 'Shipment ID',
        key: 'id',
        render: (value: string, record: Shipment) => (
          <Link value={record.id} href={`/orders/${record.id}`} />
        )
      },
      {
        title: 'Status',
        key: 'status',
        render: (value: string, record: Shipment) => (
          <Link value={record.id} href={`/orders/${record.id}`} />
        )
      }
    ],
    []
  );

  return <TableWithHeader title="Shipments" columns={columns} data={shipments} />;
}
