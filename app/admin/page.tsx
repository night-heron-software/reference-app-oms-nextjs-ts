// /Users/jeffromine/src/learning/temporal/reference-app-oms-nextjs-ts/app/admin/page.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { fetchOrders } from '@/actions/actions';

// Assuming these components are converted to React and available at these paths
// You might need to adjust the import paths based on your project structure (e.g., using aliases like @/lib/components)
import Card from '@/components/Card'; // Placeholder for Card.tsx
import Button from '@/components/Button'; // Placeholder for Button.tsx
import Heading from '@/components/Heading'; // Placeholder for Heading.tsx

// Define placeholder props for imported components for type safety
// Actual props might differ based on your component implementations
interface CardProps {
  children: React.ReactNode;
  actionButtons?: React.ReactNode;
}
interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
}
interface HeadingProps {
  children: React.ReactNode;
}

// Define the props for this page component
interface AdminPageProps {
  data: {
    limit?: number | null;
    maintenanceMode: boolean;
  };
}

export default function AdminPage({ data }: AdminPageProps) {
  const router = useRouter();
  const { limit, maintenanceMode } = data;

  // State for the input field, managed as a string for better UX with number inputs
  const [newLimitInput, setNewLimitInput] = useState<string>('');

  // Effect to initialize or update newLimitInput when the `limit` prop changes
  useEffect(() => {
    setNewLimitInput(limit ? (limit / 100).toString() : '0');
  }, [limit]);

  const handleNewLimitInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setNewLimitInput(e.target.value);
  };

  const onReset = async () => {
    await fetch('/api/reset', { method: 'POST' });
    router.refresh(); // Equivalent to SvelteKit's invalidateAll() for refreshing server data
  };

  const onLimit = async () => {
    const numericNewLimit = parseFloat(newLimitInput);
    if (isNaN(numericNewLimit)) {
      console.error('Invalid limit value:', newLimitInput);
      // Optionally, show an error message to the user
      return;
    }
    await fetch('/api/limit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ limit: numericNewLimit * 100 })
    });
    router.refresh();
  };

  const onMaintenanceMode = async () => {
    await fetch('/api/maintenance', { method: 'POST' });
    router.refresh();
  };

  const displayLimit = limit
    ? (limit / 100).toLocaleString('en-US', { style: 'currency', currency: 'USD' })
    : 'Unlimited';

  const actionButtonsContent = (
    <>
      <Button onClick={onReset}>Reset</Button>
      <Button onClick={onMaintenanceMode} disabled={maintenanceMode}>
        Toggle Maintenance Mode
      </Button>
    </>
  );

  return (
    <>
      <Heading>Store Manager</Heading>
      <Card actionButtons={actionButtonsContent}>
        <div className="w-full flex flex-col gap-4">
          <h3 className="text-xl font-bold">Fraud</h3>
          <p>
            Fraud Limit: <strong>{displayLimit}</strong>
          </p>
          <p>
            Maintenance Mode: <strong>{maintenanceMode ? 'Enabled' : 'Disabled'}</strong>
          </p>
          <div className="flex items-center gap-2">
            <div className="flex items-center rounded-md bg-white px-3 outline-1 -outline-offset-1 outline-gray-300 focus-within:outline-2 focus-within:-outline-offset-2 focus-within:outline-indigo-600">
              <div className="shrink-0 text-base text-gray-500 select-none sm:text-sm/6">$</div>
              <input
                value={newLimitInput}
                onChange={handleNewLimitInputChange}
                type="number"
                name="price"
                id="price"
                className="block min-w-0 grow py-1.5 pr-3 pl-1 text-base text-gray-900 placeholder:text-gray-400 focus:outline-none sm:text-sm/6"
                placeholder="0.00"
                aria-describedby="price-currency"
              />
              <div
                id="price-currency"
                className="shrink-0 text-base text-gray-500 select-none sm:text-sm/6"
              >
                USD
              </div>
            </div>
            <Button onClick={onLimit}>Set Limit</Button>
          </div>
        </div>
      </Card>
    </>
  );
}
