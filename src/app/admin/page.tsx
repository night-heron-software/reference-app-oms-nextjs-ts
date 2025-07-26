'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

import Card from '@/components/Card';
import Button from '@/components/Button';
import Heading from '@/components/Heading';
import { fetchFraudSettings } from '@/actions/actions';

interface AdminPageProps {
  limit: number | null;
  maintenanceMode: boolean;
}

export default function AdminPage() {
  const router = useRouter();

  // State for the form input. It's initialized from the prop but can be changed by the user.
  const [fraudSettings, setFraudSettings] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const newSettings = await fetchFraudSettings();
        setFraudSettings(newSettings);
      } catch (error) {
        console.error('Error fetching orders:', error);
      }
    };
    fetchData();
  }, []);

  const onReset = async () => {
    router.refresh();
  };

  const onLimit = async () => {
    router.refresh();
  };

  const onMaintenanceMode = async () => {
    router.refresh();
  };
  const { limit, maintenanceMode } = fraudSettings || { limit: 10, maintenanceMode: false };

  return (
    <>
      <Heading>Store Manager</Heading>
      <Card>
        <div className="w-full flex flex-col gap-4">
          <h3 className="text-xl font-bold">Fraud</h3>
          <p>
            Fraud Limit:{' '}
            <strong>
              {limit
                ? (limit / 100).toLocaleString('en-US', {
                    style: 'currency',
                    currency: 'USD'
                  })
                : 'Unlimited'}
            </strong>
          </p>
          <p>
            Maintenance Mode: <strong>{maintenanceMode ? 'Enabled' : 'Disabled'}</strong>
          </p>
          <div className="flex items-center gap-2">
            <div className="flex items-center rounded-md bg-white px-3 outline-1 -outline-offset-1 outline-gray-300 focus-within:outline-2 focus-within:-outline-offset-2 focus-within:outline-indigo-600">
              <div className="shrink-0 text-base text-gray-500 select-none sm:text-sm/6">$</div>
              <input
                value={limit / 100}
                onChange={(e) =>
                  setFraudSettings({ ...fraudSettings, limit: Number(e.target.value) * 100 })
                }
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
          {/* The Svelte snippet was not explicitly rendered, so its content is placed here. */}
          <div className="flex items-center gap-2">
            <Button onClick={onReset}>Reset</Button>
            <Button onClick={onMaintenanceMode} disabled={maintenanceMode}>
              Toggle Maintenance Mode
            </Button>
          </div>
        </div>
      </Card>
    </>
  );
}
