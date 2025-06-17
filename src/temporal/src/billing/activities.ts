import { log } from '@temporalio/activity';
import {
  ChargeCustomerInput,
  ChargeCustomerResult,
  FraudCheckResult,
  GenerateInvoiceInput,
  GenerateInvoiceResult,
  Item
} from './definitions.js';

export async function generateInvoice(input: GenerateInvoiceInput): Promise<GenerateInvoiceResult> {
  if (!input?.customerId) {
    throw new Error('Customer ID cannot be empty');
  }
  if (!input?.reference) {
    throw new Error('Reference cannot be empty');
  }
  if (!input?.items?.length) {
    throw new Error('Items cannot be empty');
  }

  return input.items.reduce(
    (result, item) => {
      const [cost, tax] = calculateCosts(item);
      result.subTotal += cost;
      result.tax += tax;
      result.total += cost + tax;
      result.shipping += calculateShippingCost(item);
      return result;
    },
    {
      invoiceReference: input.reference,
      subTotal: 0,
      shipping: 0,
      tax: 0,
      total: 0
    }
  );
}

function calculateCosts(item: Item): [number, number] {
  const costPerUnit = 3500 + Math.floor(Math.random() * 8500);
  const totalCost = item.quantity * costPerUnit;
  const tax = Math.floor(totalCost * 0.2);
  return [totalCost, tax];
}

function calculateShippingCost(item: Item) {
  const costPerUnit = 500 + Math.floor(Math.random() * 500);
  return item.quantity * costPerUnit;
}

function fraudCheck(input: ChargeCustomerInput): FraudCheckResult {
  if (!input?.customerId) {
    throw new Error('Customer ID cannot be empty');
  }
  if (!input?.reference) {
    throw new Error('Reference cannot be empty');
  }
  return { declined: false };
}

export async function chargeCustomer(input: ChargeCustomerInput): Promise<ChargeCustomerResult> {
  const fraudCheckResult = fraudCheck(input);

  if (fraudCheckResult.declined) {
    throw new Error('Fraud check declined');
  }

  return {
    success: true,
    authCode: '123456789'
  };
}
