import React from 'react';

// Assuming type definition is in a shared location, e.g., @/types/order
// You would need to create/update this file (e.g., src/types/order.ts) with a definition like:
//
// export interface Payment {
//   status: string;
//   subTotal: number; // in cents
//   tax: number;      // in cents
//   shipping: number; // in cents
//   total: number;    // in cents
//   // ... any other payment properties
// }
import type { Payment as PaymentType } from '@/types/order';

// Assuming capitalize utility is in a shared location, e.g., @/utils/formatting
// You would need to create/update this file (e.g., src/utils/formatting.ts) with:
//
// export const capitalize = (s: string): string => {
//   if (typeof s !== 'string' || s.length === 0) return '';
//   return s.charAt(0).toUpperCase() + s.slice(1);
// };
import { capitalize } from '@/utils/formatting';

interface PaymentProps {
  payment: PaymentType;
}

const Payment: React.FC<PaymentProps> = ({ payment }) => {
  const formatCurrency = (amountInCents: number) => {
    return (amountInCents / 100).toLocaleString('en-US', {
      style: 'currency',
      currency: 'USD'
    });
  };

  return (
    <table className="w-full divide-y divide-gray-600 border-collapse bg-white shadow-sm">
      <thead>
        {/* The original Svelte component had an empty thead, kept for structural similarity */}
      </thead>
      <tbody className="divide-y divide-gray-200 bg-gray-100/50">
        <tr>
          <td className="px-3 py-1.5 text-sm whitespace-nowrap text-gray-700 w-full">Payment</td>
          <td className="px-3 py-1.5 text-sm whitespace-nowrap text-gray-700 text-right">
            {capitalize(payment.status)}
          </td>
        </tr>
        <tr>
          <td className="px-3 py-1.5 text-sm whitespace-nowrap text-gray-700 w-full">Subtotal</td>
          <td className="px-3 py-1.5 text-sm whitespace-nowrap text-gray-700 text-right font-mono">
            {formatCurrency(payment.subTotal)}
          </td>
        </tr>
        <tr>
          <td className="px-3 py-1.5 text-sm whitespace-nowrap text-gray-700 w-full">Tax</td>
          <td className="px-3 py-1.5 text-sm whitespace-nowrap text-gray-700 text-right font-mono">
            {formatCurrency(payment.tax)}
          </td>
        </tr>
        <tr>
          <td className="px-3 py-1.5 text-sm whitespace-nowrap text-gray-700 w-full">Shipping</td>
          <td className="px-3 py-1.5 text-sm whitespace-nowrap text-gray-700 text-right font-mono">
            {formatCurrency(payment.shipping)}
          </td>
        </tr>
        <tr>
          <td className="px-3 py-1.5 text-sm whitespace-nowrap text-gray-700 w-full">Total</td>
          <td className="px-3 py-1.5 text-sm whitespace-nowrap text-gray-700 text-right font-mono font-bold">
            {formatCurrency(payment.total)}
          </td>
        </tr>
      </tbody>
    </table>
  );
};

export default Payment;
