// /Users/jeffromine/src/learning/temporal/reference-app-oms-nextjs-ts/app/shipments/page.tsx
'use client'; // Assuming child components might have client-side interactions

import React, { useEffect, useState } from 'react';

// Assuming these components are converted to React and available at these paths
// You might need to adjust the import paths based on your project structure
import { fetchShipments } from '@/actions/actions';
import Link from '@/components/Link'; // Placeholder for Link.tsx
import StatusBadge from '@/components/StatusBadge'; // Placeholder for StatusBadge.tsx
import TableWithHeader from '@/components/TableWithHeader'; // Placeholder for TableWithHeader.tsx

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

// Define the structure of a single shipment item
interface Shipment {
  id: string;
  status: string;
}

const columns = [
  {
    title: 'Shipment ID',
    key: 'id',
    formatter: (value: string) => ({
      type: Link,
      props: { value, href: `/shipments/${value}` }
    })
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

  return <TableWithHeader title="Shipments" columns={columns} data={shipments} />;
}
