// /Users/jeffromine/src/learning/temporal/reference-app-oms-nextjs-ts/components/ShipmentProgress.tsx
'use client';

import React, { useMemo } from 'react';
import clsx from 'clsx';
import styles from './ShipmentProgress.module.css'; // CSS Module import

interface ShipmentProgressProps {
  status?: string; // The Svelte component's logic implies `status` can be undefined, defaulting to 'pending'
}

const inactiveStatuses = ['pending', 'unavailable', 'cancelled', 'failed'];
const activeStatuses = ['booked', 'dispatched', 'delivered'];

const ShipmentProgress: React.FC<ShipmentProgressProps> = ({ status }) => {
  const finalStatus = useMemo(() => status || 'pending', [status]);
  const isInactive = useMemo(() => inactiveStatuses.includes(finalStatus), [finalStatus]);

  const statusesToDisplay = useMemo(
    () => (isInactive ? [finalStatus] : activeStatuses),
    [isInactive, finalStatus]
  );
  const currentIndex = useMemo(
    () => (isInactive ? 0 : activeStatuses.indexOf(finalStatus)),
    [isInactive, finalStatus]
  );

  return (
    <ul
      className={clsx(
        'list-none',
        'inline-flex',
        'px-4',
        'relative',
        'overflow-hidden',
        'rounded-lg',
        'my-2'
        // styles.progressList // Only if .progressList has unique styles not covered by Tailwind
      )}
    >
      {statusesToDisplay.map((s, index) => (
        <li
          key={s}
          className={clsx(
            styles.progressItem, // Base styles from CSS Module
            {
              // Conditional classes from CSS Module, mirroring Svelte's logic
              [styles.active]: !isInactive && currentIndex === index - 1,
              [styles.completed]: !isInactive && currentIndex >= index,
              [styles.incomplete]: !isInactive && currentIndex < index,
              [styles.failed]: s === 'failed',
              [styles.pending]: s === 'pending',
              [styles.unavailable]: s === 'unavailable',
              [styles.cancelled]: s === 'cancelled',
              [styles.booked]: s === 'booked', // These specific status classes are for ::before styling
              [styles.dispatched]: s === 'dispatched',
              [styles.delivered]: s === 'delivered'
            }
          )}
        >
          {s.toUpperCase()}
        </li>
      ))}
    </ul>
  );
};

export default ShipmentProgress;
