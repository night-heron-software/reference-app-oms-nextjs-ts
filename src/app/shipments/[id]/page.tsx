// /Users/jeffromine/src/learning/temporal/reference-app-oms-nextjs-ts/app/shipments/[id]/page.tsx
'use client';

import React, { useEffect, useRef, useState } from 'react';

// Assuming these components are converted to React and available at these paths.
// Adjust import paths based on your actual project structure (e.g., using path aliases like @/lib/components).
import Button from '@/components/Button';
import Card from '@/components/Card';
import Heading from '@/components/Heading';
import ItemDetails from '@/components/ItemDetails'; // Converted from ItemDetails.svelte
import ShipmentProgress from '@/components/ShipmentProgress';
import { OrderItem } from '@/src/types/order'; // Adjust the import path as necessary

// Type definitions (assuming they are in a shared types file, e.g., ../@/types/order)
// You should import these from your actual types file.
/* interface OrderItem {
  sku: string;
  quantity: number;
  // Add other properties if they exist (e.g., name, price)
}
 */
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
  data: {
    shipment: Shipment | null; // Shipment could be null if not found or during initial loading
  };
  // params: { id: string }; // Next.js would provide this if this is a route component
}

export default function ShipmentDetailPage({ data }: ShipmentDetailPageProps) {
  const initialShipment = data.shipment;

  const [status, setStatus] = useState<string | undefined>(initialShipment?.status);
  const broadcasterRef = useRef<BroadcastChannel | null>(null);

  // Effect to synchronize local status if the initialShipment prop's status changes.
  // This handles cases where the parent component might pass updated shipment data.
  useEffect(() => {
    setStatus(initialShipment?.status);
  }, [initialShipment?.status]);

  // Effect for BroadcastChannel setup, message handling, and cleanup.
  useEffect(() => {
    if (initialShipment?.id) {
      const bc = new BroadcastChannel(`shipment-${initialShipment.id}`);
      broadcasterRef.current = bc;

      const handleMessage = (event: MessageEvent) => {
        if (typeof event.data === 'string') {
          setStatus(event.data);
        }
      };

      bc.addEventListener('message', handleMessage);

      // Cleanup function: remove listener and close channel when component unmounts or ID changes.
      return () => {
        bc.removeEventListener('message', handleMessage);
        bc.close();
        broadcasterRef.current = null;
      };
    }
  }, [initialShipment?.id]); // Re-run effect if the shipment ID changes.

  // Render loading state or error if shipment data is not available.
  if (!initialShipment) {
    return (
      <div className="p-4">
        <Heading>Loading shipment details...</Heading>
        {/* Or a more sophisticated loading component */}
      </div>
    );
  }

  const handleApiCall = async (
    currentShipment: Shipment,
    newStatus: 'dispatched' | 'delivered',
    signalName: 'ShipmentUpdate'
  ) => {
    const signal = { name: signalName, status: newStatus };
    try {
      await fetch('/api/shipment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ shipment: currentShipment, signal })
      });
      setStatus(newStatus);
      broadcasterRef.current?.postMessage(newStatus);
    } catch (error) {
      console.error(`Failed to set shipment status to ${newStatus}:`, error);
      // Optionally, provide user feedback about the error
    }
  };

  const dispatchShipmentHandler = () => {
    handleApiCall(initialShipment, 'dispatched', 'ShipmentUpdate');
  };

  const deliverShipmentHandler = () => {
    handleApiCall(initialShipment, 'delivered', 'ShipmentUpdate');
  };

  const actionButtonsContent = (
    <>
      <Button disabled={status !== 'booked'} onClick={dispatchShipmentHandler}>
        Dispatch
      </Button>
      <Button disabled={status !== 'dispatched'} onClick={deliverShipmentHandler}>
        Deliver
      </Button>
    </>
  );

  return (
    <Card actionButtons={actionButtonsContent}>
      <div className="w-full flex flex-col gap-2">
        <div className="flex flex-col md:flex-row items-center justify-between gap-2 w-full">
          <Heading>{initialShipment.id}</Heading>
          <ShipmentProgress status={status} />
        </div>
        <ItemDetails items={initialShipment.items} />
      </div>
    </Card>
  );
}
