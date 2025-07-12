import { Fulfillment, OrderItem, OrderStatus } from './definitions.js';

export interface OrderContext {
  id: string;
  customerId: string;
  items: OrderItem[];
  receivedAt: string;
  fulfillments: Fulfillment[];
  status: OrderStatus;
  workflowId: string;
  updatedAt?: string;
}
