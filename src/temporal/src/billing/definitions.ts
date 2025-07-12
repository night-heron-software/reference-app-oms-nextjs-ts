export interface GenerateInvoiceInput {
  customerId: string;
  reference: string;
  items: Item[];
}

export interface Item {
  sku: string;
  quantity: number;
}

export interface GenerateInvoiceResult {
  invoiceReference: string;
  subTotal: number;
  shipping: number;
  tax: number;
  total: number;
}

export interface ChargeCustomerInput {
  customerId: string;
  reference: string;
  charge: number;
}

export interface FraudCheckResult {
  declined: boolean;
}

export interface ChargeCustomerResult {
  success: boolean;
  authCode: string;
}

export interface ChargeInput {
  customerId: string;
  reference: string;
  items: Item[];
  idempotencyKey: string;
}

// ChargeResult is the result for the Charge workflow.
export interface ChargeOutput {
  invoiceReference: string;
  subTotal: number;
  shipping: number;
  tax: number;
  total: number;
  success: boolean;
  authCode: string;
}
