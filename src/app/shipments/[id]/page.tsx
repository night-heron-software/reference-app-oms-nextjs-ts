'use client';

import React, { use, useEffect, useRef, useState } from 'react';

import { fetchShipmentById, updateShipmentCarrierStatus } from '@/actions/actions';
import { ShipmentStatus } from '@/temporal/src/shipment/definitions';
import Button from '@/components/Button';
import Card from '@/components/Card';
import Heading from '@/components/Heading';
import ItemDetails, { ItemDetailsItem } from '@/components/ItemDetails';
import ShipmentProgress from '@/components/ShipmentProgress';
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
