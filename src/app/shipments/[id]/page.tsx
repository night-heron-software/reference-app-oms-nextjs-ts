'use client';

import { use, useEffect, useState } from 'react';

import { executeShipmentStatusUpdate, fetchShipmentById } from '@/actions/actions';
import Button from '@/components/Button';
import Card from '@/components/Card';
import Heading from '@/components/Heading';
import ItemDetails, { ItemDetailsItem } from '@/components/ItemDetails';
import ShipmentProgress from '@/components/ShipmentProgress';
import { ShipmentStatus } from '@/temporal/src/shipment/definitions';
import { OrderItem } from '@/types/order';

export interface Shipment {
  id: string;
  status: string;
  items: OrderItem[];
}

interface ShipmentDetailPageProps {
  params: Promise<{ id: string }>;
}

export default function ShipmentDetailPage(props: ShipmentDetailPageProps) {
  const params = use(props.params);
  const id = decodeURIComponent(params.id);

  const [shipment, setShipment] = useState<ShipmentStatus | null>(null);
  const [pageLoading, setPageLoading] = useState(true);
  const refetchShipment = async () => {
    // Don't set loading state if we already have shipment data so the UI doesn't flicker
    if (!shipment) {
      setPageLoading(true);
    }

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

  useEffect(() => {
    const fetchShipment = async () => {
      // Don't set loading state if we already have shipment data so the UI doesn't flicker
      if (!shipment) {
        setPageLoading(true);
      }

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
    fetchShipment();
  }, []);

  const updateShipmentStatus = async (newStatus: string) => {
    if (!shipment) return;
    const status = await executeShipmentStatusUpdate(shipment.id, shipment.workflowId, newStatus);
    setShipment({ ...shipment, status: status }); // Trigger re-render with updated status
  };

  const dispatchShipment = async () => {
    updateShipmentStatus('dispatched');
  };

  const deliverShipment = async () => {
    updateShipmentStatus('delivered');
  };

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
        <Button disabled={shipment?.status !== 'booked'} onClick={dispatchShipment}>
          Dispatch
        </Button>
        <Button disabled={shipment?.status !== 'dispatched'} onClick={deliverShipment}>
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
