// /Users/jeffromine/src/learning/temporal/reference-app-oms-nextjs-ts/app/operator/page.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

// Assuming these components are converted to React and available at these paths
// You might need to adjust the import paths based on your project structure
import Heading from '@/components/Heading'; // Placeholder for Heading.tsx
import Card from '@/components/Card'; // Placeholder for Card.tsx
import Button from '@/components/Button'; // Placeholder for Button.tsx
import Charts from '@/components/Charts'; // Placeholder for Charts.tsx

// Define placeholder props for imported components for type safety
// Actual props might differ based on your component implementations
interface HeadingProps {
  children: React.ReactNode;
}
interface CardProps {
  children: React.ReactNode;
  actionButtons?: React.ReactNode;
}
interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
}
interface ChartsProps {
  // Define props for Charts if any, e.g., data, options
}

// Define the props for this page component
interface OperatorPageDataConfig {
  ordersPerSecond?: number | null;
  // Add other properties of config if they exist
}

interface OperatorPageData {
  running: boolean;
  config: OperatorPageDataConfig;
}

interface OperatorPageProps {
  data: OperatorPageData;
}

export default function OperatorPage({ data }: OperatorPageProps) {
  const router = useRouter();
  const { running, config } = data;

  // State for the input field, managed as a string for better UX with number inputs
  const [newLimitInput, setNewLimitInput] = useState<string>('');

  // Effect to initialize or update newLimitInput when config.ordersPerSecond changes
  useEffect(() => {
    // Svelte logic: newLimit = $derived(config.ordersPerSecond ? config.ordersPerSecond : 1);
    // This means if ordersPerSecond is 0, null, or undefined, it defaults to 1.
    const initialValue = config.ordersPerSecond ? config.ordersPerSecond.toString() : '1';
    setNewLimitInput(initialValue);
  }, [config.ordersPerSecond]);

  const handleNewLimitInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setNewLimitInput(e.target.value);
  };

  const onStop = async () => {
    await fetch('/api/load-generator', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'stop' })
    });
    router.refresh(); // Equivalent to SvelteKit's invalidateAll()
  };

  const onStart = async () => {
    const numericNewLimit = parseInt(newLimitInput, 10);
    if (isNaN(numericNewLimit)) {
      console.error('Invalid ordersPerSecond value:', newLimitInput);
      // Optionally, show an error message to the user
      return;
    }
    await fetch('/api/load-generator', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'start',
        config: { ...config, ordersPerSecond: numericNewLimit }
      })
    });
    router.refresh();
  };

  const onToggle = async () => {
    if (running) {
      await onStop();
    } else {
      await onStart();
    }
  };

  const actionButtonsContent = (
    <>
      <Button onClick={onToggle} disabled={!running}>
        Stop
      </Button>
      <Button onClick={onToggle} disabled={running}>
        Start
      </Button>
    </>
  );

  return (
    <>
      <Heading>Operator</Heading>
      <Card actionButtons={actionButtonsContent}>
        <div className="w-full flex flex-col gap-4">
          <h3 className="text-xl font-bold">Load Testing</h3>
          <p>
            Status:{' '}
            <strong className={running ? 'text-green-500' : 'text-red-500'}>
              {running ? 'Running' : 'Stopped'}
            </strong>
          </p>
          <div className="flex w-48 items-center rounded-md bg-white px-3 outline-1 -outline-offset-1 outline-gray-300 focus-within:outline-2 focus-within:-outline-offset-2 focus-within:outline-blue-600">
            <input
              value={newLimitInput}
              onChange={handleNewLimitInputChange}
              type="number"
              name="ordersPerSecond"
              id="ordersPerSecond"
              className="block min-w-0 grow py-1.5 pr-3 pl-1 text-base text-gray-900 placeholder:text-gray-400 focus:outline-none sm:text-sm/6"
              placeholder="1"
              aria-describedby="orders-per-second-unit"
            />
            <div
              id="orders-per-second-unit"
              className="shrink-0 text-base text-gray-500 select-none sm:text-sm/6"
            >
              orders / second
            </div>
          </div>
        </div>
      </Card>
      <Charts />
    </>
  );
}
