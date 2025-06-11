import { db } from '@vercel/postgres';
import {
  OrderQueryResult,
  OrderItem,
  Reservation,
  ReserveItemsInput,
  ReserveItemsResult
} from './order.js';

export async function reserveItems(input: ReserveItemsInput): Promise<ReserveItemsResult> {
  if (!input.items || input.items.length < 1) {
    throw new Error('Items cannot be empty');
  }
  if (!input.orderId) {
    throw new Error('Order ID cannot be empty');
  }

  const { unavailableItems, availableItems } = input.items.reduce(
    (acc, item) => {
      if (!item) {
        return acc;
      }
      if (item.quantity <= 0) {
        throw new Error(`Item quantity must be greater than zero for SKU: ${item.sku}`);
      }
      // Simulate checking availability
      if (item.sku.startsWith('Adidas')) {
        acc.unavailableItems.push(item);
      } else {
        acc.availableItems.push(item);
      }
      return acc;
    },
    { availableItems: [], unavailableItems: [] } as {
      availableItems: OrderItem[];
      unavailableItems: OrderItem[];
    }
  );
  const reservations: Reservation[] = [];

  if (unavailableItems.length > 0) {
    reservations.push({
      available: false,
      location: 'warehouse',
      items: unavailableItems
    });
  }
  if (availableItems.length > 0) {
    const poppedItem = availableItems.pop();
    if (poppedItem) {
      reservations.push({
        available: true,
        location: 'store',
        items: [poppedItem]
      });
    }
  }
  if (availableItems.length > 0) {
    reservations.push({
      available: true,
      location: 'warehouse',
      items: availableItems
    });
  }
  return {
    reservations: reservations
  };
}

export async function insertOrder(order: OrderQueryResult): Promise<OrderQueryResult> {
  const result = await db.sql`
    INSERT INTO orders (id, customer_id, status, received_at)
    VALUES (${order.id}, ${order.customerId}, ${order.status}, ${new Date().toISOString()})
    RETURNING id, customer_id, status, received_at
  `;
  if (result.rows.length === 0) {
    throw new Error('Failed to insert order');
  }
  return result.rows[0] as OrderQueryResult;
}

export async function fetchOrders(): Promise<OrderQueryResult[]> {
  const result =
    await db.sql`SELECT id, customer_id, status, received_at FROM orders ORDER BY received_at DESC`;
  return result.rows as OrderQueryResult[];
}
export async function updateOrderStatus(id: string, status: string): Promise<void> {
  const result = await db.sql`
	UPDATE orders
	SET status = ${status}
	WHERE id = ${id}
  `;
  if (result.rowCount === 0) {
    throw new Error(`Failed to update order status for ID: ${id}`);
  }
}

// UpdateOrderStatus stores the Order status to the database.
/* 
func (a *Activities) UpdateOrderStatus(ctx context.Context, status *OrderStatusUpdate) error {
	jsonInput, err := json.Marshal(status)
	if err != nil {
		return fmt.Errorf("unable to encode status: %w", err)
	}

	req, err := http.NewRequestWithContext(ctx, http.MethodPost, a.OrderURL+"/orders/"+status.ID+"/status", bytes.NewReader(jsonInput))
	if err != nil {
		return fmt.Errorf("unable to build request: %w", err)
	}

	req.Header.Set("Content-Type", "application/json")

	res, err := http.DefaultClient.Do(req)
	if err != nil {
		return err
	}
	defer res.Body.Close()

	if res.StatusCode < 200 || res.StatusCode >= 300 {
		body, _ := io.ReadAll(res.Body)
		return fmt.Errorf("%s: %s", http.StatusText(res.StatusCode), body)
	}

	return nil
}
 */
