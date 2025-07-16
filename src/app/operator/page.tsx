'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

// NOTE: Component paths are assumed to be configured with an alias like `@/`.
import Heading from '@/components/Heading';
import Card from '@/components/Card';
import Button from '@/components/Button';
import Charts from '@/components/Charts';

// Define the shape of the config object for type safety.
interface LoadGeneratorConfig {
  ordersPerSecond?: number;
}

/**
 * In a real Next.js app, these props would likely be passed from a parent
 * Server Component which fetches the initial data.
 */
interface OperatorPageProps {
  running: boolean;
  config: LoadGeneratorConfig;
}

export default function OperatorPage() {
  const router = useRouter();
  const { running, config } = { running: false, config: {} };
  // State for the controlled input, initialized from props.
  const [newLimit, setNewLimit] = useState(1);

  // This effect syncs the local state with the `config` prop when it changes.
  // This mirrors the behavior of Svelte's `$derived`.
  /* useEffect(() => {
    setNewLimit(config.ordersPerSecond ?? 1);
  }, [config.ordersPerSecond]);
 */
  const onStop = async () => {
    await fetch('/api/load-generator', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'stop' })
    });
    router.refresh(); // Re-fetch server data and re-render.
  };

  const onStart = async () => {
    await fetch('/api/load-generator', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'start', config: { ...config, ordersPerSecond: newLimit } })
    });
    router.refresh(); // Re-fetch server data and re-render.
  };

  const onToggle = async () => {
    if (running) {
      await onStop();
    } else {
      await onStart();
    }
  };

  return (
    <>
      <Heading>Operator</Heading>
      <Card>
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
              value={newLimit}
              onChange={(e) => setNewLimit(Number(e.target.value))}
              type="number"
              name="price"
              id="price"
              className="block min-w-0 grow py-1.5 pr-3 pl-1 text-base text-gray-900 placeholder:text-gray-400 focus:outline-none sm:text-sm/6"
              placeholder="1"
              aria-describedby="price-currency"
            />
            <div
              id="price-currency"
              className="shrink-0 text-base text-gray-500 select-none sm:text-sm/6"
            >
              orders / second
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button onClick={onToggle} disabled={!running}>
              Stop
            </Button>
            <Button onClick={onToggle} disabled={running}>
              Start
            </Button>
          </div>
        </div>
      </Card>
      <Charts />
    </>
  );
}
