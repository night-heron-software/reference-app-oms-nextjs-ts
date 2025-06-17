'use server';
'use strict';

import 'server-only';
import { Client, Connection } from '@temporalio/client';
import { defineQuery } from '@temporalio/workflow';
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
export type ListOrderEntry = {
  id: string;
  status: string;
  received_at: string;
};

export type OrderStatus =
  | 'pending'
  | 'processing'
  | 'customerActionRequired'
  | 'completed'
  | 'failed'
  | 'cancelled';

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

const client = makeClient();

function makeClient() {
  const connection = Connection.lazy({
    address: 'localhost:7233'
    // In production, pass options to configure TLS and other settings.
  });
  return new Client({ connection });
}
export async function getTemporalClient() {
  return client;
}
