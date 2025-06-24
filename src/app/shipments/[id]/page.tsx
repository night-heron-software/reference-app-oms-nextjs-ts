'use client';

import React, { use, useEffect, useRef, useState } from 'react';
import { router } from 'next/navigation';

// Assuming these components are converted to React and available at these paths.
// Adjust import paths based on your actual project structure (e.g., using path aliases like @/lib/components).
import { fetchShipmentById, updateShipmentCarrierStatus } from '@/actions/actions';
import { ShipmentStatus } from '@/actions/client';
import Button from '@/components/Button';
import Card from '@/components/Card';
import Heading from '@/components/Heading';
import ItemDetails, { ItemDetailsItem } from '@/components/ItemDetails';
import ShipmentProgress from '@/components/ShipmentProgress';
import { OrderItem } from '@/types/order'; // Adjust the import path as necessary

export interface Shipment {
  // Exporting if it's defined here, otherwise import
  id: string;
  status: string;
  items: OrderItem[];
  // Add other properties if they exist (e.g., orderId, trackingNumber, address)
}

// Define placeholder props for imported components for type safety.
// Actual props might differ based on your component implementations.
interface CardProps {
  children: React.ReactNode;
  actionButtons?: React.ReactNode;
}
interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
}
interface HeadingProps {
  children: React.ReactNode;
}
interface ItemDetailsProps {
  items: OrderItem[];
}
interface ShipmentProgressProps {
  status?: string;
}

// Props for this page component.
// In Next.js App Router, dynamic segments like [id] are passed via `params`.
// The `data` prop here mirrors the Svelte version's structure.
// In a typical Next.js app, `shipment` might be fetched server-side based on `params.id`
// or fetched client-side within this component.
interface ShipmentDetailPageProps {
  params: Promise<{ id: string }>;
  // params: { id: string }; // Next.js would provide this if this is a route component
}

export default function ShipmentDetailPage(props: ShipmentDetailPageProps) {
  const params = use(props.params);
  const id = decodeURIComponent(params.id);

  const [shipment, setShipment] = useState<ShipmentStatus | null>(null);
  const [pageLoading, setPageLoading] = useState(true);
  const refetchShipment = async () => {
    setPageLoading(true);

    try {
      const fetchedShipment = await fetchShipmentById(id);
      setShipment(fetchedShipment ?? null);
    } catch (error) {
      console.error('Error fetching shipment:', error);
      setShipment(null);
    } finally {
      setPageLoading(false);
    }
  };
  // Effect to synchronize local status if the initialShipment prop's status changes.
  // This handles cases where the parent component might pass updated shipment data.
  useEffect(() => {
    refetchShipment();
  }, []);

  const handleDispatchShipment = async () => {
    await updateShipmentCarrierStatus(shipment.id, shipment.workflowId, 'dispatched');
    await refetchShipment();
  };

  const handleDeliverShipment = async () => {
    await updateShipmentCarrierStatus(shipment.id, shipment.workflowId, 'delivered');
    await refetchShipment();
  };
  // Render loading state or error if shipment data is not available.
  if (pageLoading) {
    return (
      <div className="p-4">
        <Heading>Loading shipment details...</Heading>
      </div>
    );
  } else {
    if (!shipment) {
      return (
        <div className="p-4">
          <Heading>Shipment not found</Heading>
        </div>
      );
    }
    const actionButtonsContent = (
      <>
        <Button disabled={shipment?.status !== 'booked'} onClick={handleDispatchShipment}>
          Dispatch
        </Button>
        <Button disabled={shipment?.status !== 'dispatched'} onClick={handleDeliverShipment}>
          Deliver
        </Button>
      </>
    );

    return (
      <Card actionButtons={actionButtonsContent}>
        <div className="w-full flex flex-col gap-2">
          <div className="flex flex-col md:flex-row items-center justify-between gap-2 w-full">
            <Heading>{shipment.id}</Heading>
            <ShipmentProgress status={shipment.status} />
          </div>
          <ItemDetails items={shipment.items as ItemDetailsItem[]} />
        </div>
      </Card>
    );
  }
}
