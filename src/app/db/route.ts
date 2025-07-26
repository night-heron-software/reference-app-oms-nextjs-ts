'use server';
import 'server-only';
import { db } from '@vercel/postgres';

const client = await db.connect();

export async function setupTables() {
  await client.sql`DROP TABLE IF EXISTS settings`;
  await client.sql`DROP INDEX IF EXISTS orders_received_at`;
  await client.sql`DROP TABLE IF EXISTS orders`;

  await client.sql`
    CREATE TABLE IF NOT EXISTS settings (
      name VARCHAR(255) PRIMARY KEY NOT NULL,
      value JSONB NOT NULL
   )`;

  await client.sql`
    INSERT INTO settings (name, value)
    VALUES ('fraud', '{"limit": 100, "maintenanceMode": false}')
    ON CONFLICT (name) DO NOTHING`;

  await client.sql`
    CREATE TABLE IF NOT EXISTS orders (
      id VARCHAR(255) PRIMARY KEY  NOT NULL,
      customer_id VARCHAR(255) NOT NULL,
      received_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      status VARCHAR(255) NOT NULL
    )`;

  await client.sql`
    CREATE INDEX IF NOT EXISTS orders_received_at ON orders(received_at DESC)
    `;

  await client.sql`DROP INDEX IF EXISTS shipments_booked_at`;
  await client.sql`DROP TABLE IF EXISTS shipments`;

  await client.sql`
  CREATE TABLE IF NOT EXISTS shipments (
    id VARCHAR(255) PRIMARY KEY,
    status VARCHAR(255) NOT NULL,
    booked_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
  )
  `;

  await client.sql`
  CREATE INDEX IF NOT EXISTS shipments_booked_at ON shipments (booked_at DESC)
  `;
}

export async function GET() {
  try {
    await setupTables();
    await client.sql`BEGIN`;
    await client.sql`COMMIT`;
    return Response.json({ message: 'Database setup successfully' });
  } catch (error) {
    await client.sql`ROLLBACK`;
    return Response.json({ error }, { status: 500 });
  }
}
