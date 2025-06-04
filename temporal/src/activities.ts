import { Order, Reservation, ReserveItemsInput, ReserveItemsResult } from './order.js';
import { db } from '@vercel/postgres';

export async function reserveItems(input: ReserveItemsInput): Promise<ReserveItemsResult> {
  const reservations: Reservation[] = [
    { available: true, location: 'warehouse', items: input.items }
  ];

  return {
    reservations: reservations
  };
}

export async function insertOrder(order: Order): Promise<Order> {
  const result = await db.sql`
    INSERT INTO orders (id, customer_id, status, received_at)
    VALUES (${order.id}, ${order.customerId}, ${order.status}, ${new Date().toISOString()})
    RETURNING id, customer_id, status, received_at
  `;
  if (result.rows.length === 0) {
    throw new Error('Failed to insert order');
  }
  return result.rows[0] as Order;
}

export async function fetchOrders(): Promise<Order[]> {
  const result =
    await db.sql`SELECT id, customer_id, status, received_at FROM orders ORDER BY received_at DESC`;
  return result.rows as Order[];
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
