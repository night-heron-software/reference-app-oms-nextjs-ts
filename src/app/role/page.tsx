'use client';
import TableWithHeader from '@/components/TableWithHeader';
import type { TableColumns } from '@/types/ui';
import type { Persona } from '@/types/ui';
import Link from '@/components/Link';

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

export default function RolePage() {
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
