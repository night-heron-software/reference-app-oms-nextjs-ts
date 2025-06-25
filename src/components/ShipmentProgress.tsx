'use client';
import React, { useMemo } from 'react';
import clsx from 'clsx';

// Define constants outside the component to avoid re-declaration on every render.
const INACTIVE_STATUSES = ['pending', 'unavailable', 'cancelled', 'failed'];
const ACTIVE_STATUSES = ['booked', 'dispatched', 'delivered'];

interface ShipmentProgressProps {
  status: string;
}

export const ShipmentProgress: React.FC<ShipmentProgressProps> = ({ status }) => {
  // Replicate Svelte's derived state with useMemo
  const finalStatus = useMemo(() => status || 'pending', [status]);
  const isInactive = useMemo(() => INACTIVE_STATUSES.includes(finalStatus), [finalStatus]);
  const statuses = useMemo(
    () => (isInactive ? [finalStatus] : ACTIVE_STATUSES),
    [isInactive, finalStatus]
  );
  const currentIndex = useMemo(
    () => (isInactive ? 0 : ACTIVE_STATUSES.indexOf(finalStatus)),
    [isInactive, finalStatus]
  );

  return (
    <ul className="list-none inline-flex px-4 relative overflow-hidden rounded-lg my-2">
      {statuses.map((s, index) => {
        const isCompleted = !isInactive && currentIndex >= index;
        const isActive = !isInactive && currentIndex === index - 1;
        const isIncomplete = !isInactive && currentIndex < index;

        // Combine all classes for the list item
        const liClasses = clsx(
          // Base styles
          'font-bold relative z-[1]',
          // Responsive text and padding
          'text-xs py-1.5 px-3 sm:text-sm sm:py-1 sm:px-4',
          // Base pseudo-element styles for the skewed background
          "before:content-[''] before:absolute before:inset-0 before:border-l-2 before:border-black before:skew-x-[30deg] before:z-[-1]",
          // Responsive first/last child styles for extending edges
          'first:ml-[-2rem] first:pl-[2rem] sm:first:ml-[-4rem] sm:first:pl-[4rem]',
          'last:mr-[-2rem] last:pr-[2rem]',
          {
            // Conditional ::before background colors and animations
            'before:bg-green-500': isCompleted,
            'animate-pulse-color': isActive,
            'before:bg-rose-400': s === 'cancelled' || s === 'failed',
            'before:bg-[lightgoldenrodyellow]':
              isIncomplete || s === 'pending' || s === 'unavailable'
          }
        );

        return (
          <li key={s} className={liClasses}>
            {s.toUpperCase()}
          </li>
        );
      })}
    </ul>
  );
};

export default ShipmentProgress;
