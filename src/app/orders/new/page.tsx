'use client';
import { generateOrders, type Order, type OrderItem } from '@/types/order';
import { createOrder } from '@/actions/actions'; // Adjust the import path as necessary
import Button from '@/components/Button';
import ItemDetails from '@/components/ItemDetails';
import Card from '@/components/Card';
import Heading from '@/components/Heading';
import { useState } from 'react';

export default function NewOrder() {
  const orders = generateOrders(20);
  const [order, setOrder] = useState(orders[0]);
  let loading = false;
  const onItemClick = async (item: Order) => {
    setOrder(item);
  };

  return (
    <>
      <Heading>New Order</Heading>
      <div className="flex flex-col gap-2">
        <div className="flex flex-wrap gap-0.5">
          {orders.map((item, index) => (
            <button
              key={index}
              onClick={() => onItemClick(item)}
              type="button"
              className="relative cursor-pointer inline-flex items-center {order.id === item.id
                                ? 'bg-blue-500 hover:bg-blue-600 text-white'
                                : 'bg-white hover:bg-gray-50'} px-3 py-2 text-sm font-semibold text-gray-900 ring-1 ring-gray-200 ring-inset focus:z-10"
            >
              Package {index + 1}
            </button>
          ))}
        </div>
        <form
          action={createOrder}
          className="flex w-full flex-col gap-2 items-end"
          /*    use:enhance={() => {
                    loading = true;
                    return async ({ result }) => {
                        if (result.type === 'redirect') {
                            goto(result.location);
                        } else {
                            loading = false;
                        }
                    };
                }} */
        >
          {order.items.map((item, index) => {
            return (
              <Card key={index}>
                <ItemDetails items={[item]} />
                <div className="text-xs text-gray-600/80 px-4">{item.description}</div>
              </Card>
            );
          })}
          <input type="hidden" name="order" value={JSON.stringify(order)} />
          <Button type="submit" disabled={!order}>
            Submit
          </Button>
        </form>
      </div>
    </>
  );
}
