'use client'; // This line is not necessary for server components, but included if you need client-side features
import TableWithHeader from '@/components/TableWithHeader'; // Assuming alias or adjust path
import type { TableColumns } from '@/src/types/ui'; // Adjust the import path as necessary
import type { Persona } from '@/src/types/ui'; // Adjust the import path as necessary
import Link from '@/components/Link'; // Adjust the import path as necessary
// Define the expected shape of the data prop, particularly for 'personas'
// This should match the actual data structure you're passing to this page.

const personas: Persona[] = [
  {
    role: 'Customer',
    description: 'Someone who orders products from the store',
    link: '/orders'
  },
  {
    role: 'Courier',
    description: 'Someone who delivers products to the customer',
    link: '/shipments'
  },
  {
    role: 'Store Manager',
    description: 'Someone who performs administrative functions',
    link: '/admin'
  },
  {
    role: 'Operator',
    description: "Someone who manages deployments and tests the system's performance",
    link: '/operator'
  }
];

// This is a Server Component by default in Next.js App Router
export default function RolePage() {
  // Define columns for the TableWithHeader component
  // Ensure TableColumn<Persona> matches the structure of your TableWithHeader component's column type
  const columns: TableColumns = [
    {
      title: 'Role',
      key: 'role',
      formatter: (value, row: Record<string, string>) => ({
        type: Link,
        props: { value, href: row.link }
      })
    },
    {
      title: 'Description',
      key: 'description'
    }
  ];

  return <TableWithHeader title="Select Your Role" columns={columns} data={personas} />;
}
