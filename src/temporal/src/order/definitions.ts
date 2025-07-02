// This file contains type definitions for your data.
// It describes the shape of the data, and what data type each property should accept.
// For simplicity of teaching, we're manually defining these types.
// However, these types are generated automatically if you're using an ORM such as Prisma.

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

export function orderWorkflowIdFromOrderId(id: string): string {
  return 'Order:' + id;
}

export function orderIdFromOrderWorkflowId(id: string): string {
  return id.replace(/^Order:/, '');
}
