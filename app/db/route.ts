'use server';
import 'server-only';
import { db } from '@vercel/postgres';
import { orders } from './seed-data';

const client = await db.connect();

export async function setupTables() {
  await client.sql`DROP INDEX IF EXISTS orders_received_at`;
  await client.sql`DROP TABLE IF EXISTS orders`;

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

// async function seedUsers() {
//   await client.sql`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`;
//   await client.sql`
//     CREATE TABLE IF NOT EXISTS users (
//       id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
//       name VARCHAR(255) NOT NULL,
//       email TEXT NOT NULL UNIQUE,
//       password TEXT NOT NULL
//     );
//   `;

//   const insertedUsers = await Promise.all(
//     users.map(async (user) => {
//       const hashedPassword = await bcrypt.hash(user.password, 10);
//       return client.sql`
//         INSERT INTO users (id, name, email, password)
//         VALUES (${user.id}, ${user.name}, ${user.email}, ${hashedPassword})
//         ON CONFLICT (id) DO NOTHING;
//       `;
//     })
//   );

//   return insertedUsers;
// }

// async function seedorderss() {
//   await client.sql`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`;

//   await client.sql`
//     CREATE TABLE IF NOT EXISTS orderss (
//       id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
//       customer_id UUID NOT NULL,
//       amount INT NOT NULL,
//       status VARCHAR(255) NOT NULL,
//       date DATE NOT NULL
//     );
//   `;

//   const insertedorderss = await Promise.all(
//     orderss.map(
//       (orders) => client.sql`
//         INSERT INTO orderss (customer_id, amount, status, date)
//         VALUES (${orders.customer_id}, ${orders.amount}, ${orders.status}, ${orders.date})
//         ON CONFLICT (id) DO NOTHING;
//       `
//     )
//   );

//   return insertedorderss;
// }

// async function seedCustomers() {
//   await client.sql`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`;

//   await client.sql`
//     CREATE TABLE IF NOT EXISTS customers (
//       id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
//       name VARCHAR(255) NOT NULL,
//       email VARCHAR(255) NOT NULL,
//       image_url VARCHAR(255) NOT NULL
//     );
//   `;

//   const insertedCustomers = await Promise.all(
//     customers.map(
//       (customer) => client.sql`
//         INSERT INTO customers (id, name, email, image_url)
//         VALUES (${customer.id}, ${customer.name}, ${customer.email}, ${customer.image_url})
//         ON CONFLICT (id) DO NOTHING;
//       `
//     )
//   );

//   return insertedCustomers;
// }

// async function seedRevenue() {
//   await client.sql`
//     CREATE TABLE IF NOT EXISTS revenue (
//       month VARCHAR(4) NOT NULL UNIQUE,
//       revenue INT NOT NULL
//     );
//   `;

//   const insertedRevenue = await Promise.all(
//     revenue.map(
//       (rev) => client.sql`
//         INSERT INTO revenue (month, revenue)
//         VALUES (${rev.month}, ${rev.revenue})
//         ON CONFLICT (month) DO NOTHING;
//       `
//     )
//   );

//   return insertedRevenue;
// }

async function seedOrders() {
  const insertedorders = await Promise.all(
    orders.map(
      (orders) => client.sql`
        INSERT INTO orders (status)
        VALUES (${orders.status})
        ON CONFLICT (id) DO NOTHING;
      `
    )
  );

  return insertedorders;
}

export async function GET() {
  try {
    await setupTables();
    await client.sql`BEGIN`;
    //await seedOrders();
    await client.sql`COMMIT`;

    return Response.json({ message: 'Database setup successfully' });
  } catch (error) {
    await client.sql`ROLLBACK`;
    return Response.json({ error }, { status: 500 });
  }
}
