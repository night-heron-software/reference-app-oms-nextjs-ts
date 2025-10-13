import * as wf from '@temporalio/workflow';

export interface ShipmentItem {
  sku: string;
  quantity: number;
}

export type Status = 'pending' | 'booked' | 'dispatched' | 'delivered' | 'cancelled' | 'failed';

export interface ShipmentCarrierShipmentStatusUpdate {
  status: string;
}

// ShipmentStatusUpdatedSignal is used to notify the requesting workflow of an update to a shipment's status.
export interface ShipmentStatusUpdatedSignal {
  shipmentId: string;
  status: string;
  updatedAt: string;
}

// ShipmentResult is the result of a Shipment workflow.
export interface ShipmentResult {
  courierReference: string;
}

// ShipInput is the input for a Ship workflow.
export interface ShipInput {
  requestorWorkflowId: string;
  id: string;
  items: ShipmentItem[];
}
// ShipOutput is the output of the Ship workflow.
export interface ShipOutput {
  id: string;
  status: Status;
}

export interface ShipmentStatus {
  workflowId: string;
  id: string;
  items: ShipmentItem[];
  status: string;
  updatedAt: string;
}

export interface ShipmentResult {
  courierReference: string;
}

export interface BookShipmentInput {
  reference: string;
  items: ShipmentItem[];
}

// BookShipmentResult is the result for the BookShipment operation.
// CourierReference is recorded where available, to allow tracking enquiries.
export interface BookShipmentResult {
  courierReference: string;
}

export function shipmentIdToWorkflowId(id: string): string {
  return 'Ship:' + id;
}

export function workflowIdFromShipmentId(id: string): string {
  return id.replace(/^Ship:/, '');
}

export const shipmentCarrierShipmentStatusUpdate = wf.defineUpdate<
  ShipmentCarrierShipmentStatusUpdate,
  [ShipmentCarrierShipmentStatusUpdate]
>('shipmentCarrierShipmentStatusUpdate');

export const getShipmentStatus = wf.defineQuery<ShipmentStatus>('getShipmentStatus');
