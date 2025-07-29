'use server';
import 'server-only';
import { sql } from '@/temporal/src/db/client'; // Adjust the import path as necessary

export async function setupTables() {
  let rows = [];
  rows = await sql`DROP TABLE IF EXISTS settings`;
  console.log(JSON.stringify(rows, null, 2));
  rows = await sql`DROP INDEX IF EXISTS orders_received_at`;
  console.log(JSON.stringify(rows, null, 2));
  rows = await sql`DROP TABLE IF EXISTS orders`;
  console.log(JSON.stringify(rows, null, 2));

  rows = await sql`
    CREATE TABLE IF NOT EXISTS settings (
      name VARCHAR(255) PRIMARY KEY NOT NULL,
      value JSONB NOT NULL
   )`;
  console.log(JSON.stringify(rows, null, 2));

  rows = await sql`
    INSERT INTO settings (name, value)
    VALUES ('fraud', '{"limit": 100, "maintenanceMode": false}')
    ON CONFLICT (name) DO NOTHING`;
  console.log(JSON.stringify(rows, null, 2));

  rows = await sql`
    CREATE TABLE IF NOT EXISTS orders (
      id VARCHAR(255) PRIMARY KEY  NOT NULL,
      customer_id VARCHAR(255) NOT NULL,
      received_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      status VARCHAR(255) NOT NULL
    )`;
  console.log(JSON.stringify(rows, null, 2));

  rows = await sql`
    CREATE INDEX IF NOT EXISTS orders_received_at ON orders(received_at DESC)
    `;
  console.log(JSON.stringify(rows, null, 2));

  rows = await sql`DROP INDEX IF EXISTS shipments_booked_at`;
  console.log(JSON.stringify(rows, null, 2));
  rows = await sql`DROP TABLE IF EXISTS shipments`;
  console.log(JSON.stringify(rows, null, 2));

  rows = await sql`
  CREATE TABLE IF NOT EXISTS shipments (
    id VARCHAR(255) PRIMARY KEY,
    status VARCHAR(255) NOT NULL,
    booked_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
  )
  `;
  console.log(JSON.stringify(rows, null, 2));

  rows = await sql`
  CREATE INDEX IF NOT EXISTS shipments_booked_at ON shipments (booked_at DESC)
  `;
  console.log(JSON.stringify(rows, null, 2));
}

export async function GET() {
  try {
    await setupTables();
    return Response.json({ message: 'Database setup successfully' });
  } catch (error) {
    await sql`ROLLBACK`;
    return Response.json({ error }, { status: 500 });
  }
}
