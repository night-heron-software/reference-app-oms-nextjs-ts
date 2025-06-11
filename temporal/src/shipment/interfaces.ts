export type ShipmentStatus = 'pending' | 'shipped' | 'timed_out' | 'cancelled';

export interface Shipment {
  id: string; // Corresponds to ShipmentID in Go
  orderId: string;
  productId: string;
  quantity: number;
  status: ShipmentStatus;
  createdAt: Date; // Mapped from Go's time.Time
  updatedAt: Date; // Mapped from Go's time.Time
}

export interface CreateShipmentParams {
  orderId: string;
  productId: string;
  quantity: number;
}
export const ShipmentStatusUpdatedSignalName = 'ShipmentStatusUpdated';

export interface ShipmentStatusUpdatedSignal {
  shipmentId: string;
  status: ShipmentStatus;
  updatedAt: Date;
}

// Constants
// TASK_QUEUE_NAME is typically used when setting up the Worker, not directly in workflow code.
// We export it here for consistency if you wish to use it from a central place.
export const TASK_QUEUE_NAME = 'shipment-task-queue'; // From Go: TaskQueueName
export const SHIPMENT_SHIPPED_SIGNAL_NAME = 'SHIPMENT_SHIPPED_SIGNAL'; // From Go: ShipmentShippedSignalName
