export interface Item {
  sku: string;
  quantity: number;
}

export type Status = 'pending' | 'booked' | 'dispatched' | 'delivered';

// ShipmentCarrierUpdateSignalName is the name for a signal to update a shipment's status from the carrier.
export const ShipmentCarrierUpdateSignalName = 'ShipmentCarrierUpdate';

// ShipmentCarrierUpdateSignal is used by a carrier to update a shipment's status.
export interface ShipmentCarrierUpdateSignal {
  status: string;
}

// ShipmentStatusUpdatedSignal is used to notify the requestor of an update to a shipment's status.
export interface ShipmentStatusUpdatedSignal {
  shipmentId: string;
  status: string;
  updatedAt: string;
}

// ShipmentResult is the result of a Shipment workflow.
export interface ShipmentResult {
  courierReference: string;
}

export interface ShipmentImpl {
  requestorWorkflowId: string;
  id: string;
  Items: Item[];
  status: string;
  updatedAt: string;
}

// ShipmentStatusUpdate is used to update the status of a Shipment.
export interface ShipmentStatusUpdate {
  id: string;
  status: Status;
}

// ShipmentStatsResult holds the stats for the Shipment system.
export interface ShipmentStatsResult {
  workerCount: number;
  backlog: number;
}
// ShipmentInput is the input for a Shipment workflow.
export interface ShipmentInput {
  requestorWorkflowId: string;
  id: string;
  items: Item[];
}

export interface ShipmentStatus {
  id: string;
  items: Item[];
  status: Status;
  updatedAt: string;
}

export interface ShipmentResult {
  courierReference: string;
}

export interface BookShipmentInput {
  reference: string;
  items: Item[];
}

// BookShipmentResult is the result for the BookShipment operation.
// CourierReference is recorded where available, to allow tracking enquiries.
export interface BookShipmentResult {
  courierReference: string;
}
