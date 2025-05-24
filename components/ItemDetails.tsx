import React from 'react';
import type { OrderItem } from '@/types/order'; // Adjusted path for Next.js

interface ItemDetailsProps {
  items?: OrderItem[]; // Made items optional to match Svelte's default []
}

const ItemDetails: React.FC<ItemDetailsProps> = ({ items = [] }) => {
  return (
    <div className="flex flex-col gap-2 container">
      {items.map((item, index) => (
        <div key={index} className="flex gap-2 items-center">
          {/* Assuming OrderItem has an 'id' for the key */}
          <p className="flex flex-col items-center shadow-md justify-center w-8 h-8 rounded-full bg-blue-500/90 text-white font-semibold">
            {item.quantity}
          </p>
          <p className="text-base font-light">{item.sku}</p>
        </div>
      ))}
    </div>
  );
};

export default ItemDetails;
