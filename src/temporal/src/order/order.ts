import * as wf from '@temporalio/workflow';
/*
  To avoid needing explicit file extensions in relative imports, set the `moduleResolution` option to `node` or `classic` in your `tsconfig.json`:

  {
    "compilerOptions": {
      "moduleResolution": "node"
    }
  }

  The `node16` and `nodenext` options require explicit file extensions for ECMAScript modules.
*/

export type OrderStatus =
  | 'pending'
  | 'processing'
  | 'customerActionRequired'
  | 'completed'
  | 'failed'
  | 'cancelled'
  | 'timedOut';

export interface OrderItem extends ItemInput {
  sku: string;
  quantity: number;
}

export type FulfillmentStatus =
  | 'unavailable'
  | 'pending'
  | 'processing'
  | 'completed'
  | 'cancelled'
  | 'failed';

export interface Fulfillment {
  orderId: string;
  customerId: string;
  id: string;
  shipment?: Shipment;
  items: OrderItem[];
  payment?: Payment;
  location: string;
  status?: FulfillmentStatus;
}

export interface Shipment {
  id: string;
  status: string;
  items: OrderItem[];
  updatedAt: Date;
}

export type PaymentStatus = 'pending' | 'success' | 'failed';

export interface Payment {
  shipping: number;
  tax: number;
  subTotal: number;
  total: number;
  status: PaymentStatus;
}

export type Action = 'amend' | 'cancel';

export interface OrderQueryResult {
  id: string;
  customerId: string;
  items: OrderItem[];
  receivedAt: string;
  fulfillments?: Fulfillment[];
  status: OrderStatus;
}

export interface ReserveItemsInput {
  orderId: string;
  items: OrderItem[];
}

export interface Reservation {
  available: boolean;
  location: string;
  items: OrderItem[];
}

export interface ReserveItemsResult {
  reservations: Reservation[];
}

export const ShipmentStatusUpdatedSignalName = 'ShipmentStatusUpdated';

export type ShipmentStatus = 'pending' | 'shipped' | 'timed_out' | 'cancelled';

export interface ShipmentStatusUpdatedSignal {
  shipmentId: string;
  status: ShipmentStatus;
  updatedAt: Date;
}

export const shipmentStatusSignal =
  wf.defineSignal<[ShipmentStatusUpdatedSignal]>('ShipmentStatusUpdated');

export type ItemInput = {
  sku: string;
  quantity?: number;
  description?: string;
};

export type OrderInput = {
  id: string;
  customerId: string;
  items: ItemInput[];
};

export type OrderOutput = {
  status: OrderStatus;
};

export type ListOrderEntry = {
  id: string;
  status: string;
  received_at: string;
};

export function orderWorkflowIdFromOrderId(id: string): string {
  return 'Order:' + id;
}

export function orderIdFromOrderWorkflowId(id: string): string {
  return id.replace(/^Order:/, '');
}

export interface OrderContext {
  id: string;
  customerId: string;
  items: OrderItem[];
  receivedAt: string;
  fulfillments?: Fulfillment[];
  status: OrderStatus;
}

export interface FulfillmentResult {
  id: string;
  status: FulfillmentStatus;
}
