import React from 'react';
// Assuming your utility function is available at this path in your Next.js project
// Adjust the import path if your project structure is different.
import { spaceBetweenCapitalLetters } from '@/lib/utils/formatting';

interface StatusBadgeProps {
  status: string;
  className?: string; // Optional prop to allow consumers to add more classes
}

// Maps status strings to their corresponding Tailwind background color classes
const statusColorMap: Record<string, string> = {
  booked: 'bg-blue-400',
  dispatched: 'bg-teal-400',
  customerActionRequired: 'bg-rose-400',
  completed: 'bg-green-500',
  delivered: 'bg-green-500',
  failed: 'bg-rose-400',
  timedOut: 'bg-rose-400',
  cancelled: 'bg-rose-400'
};

const StatusBadge: React.FC<StatusBadgeProps> = ({ status, className }) => {
  // Determine the text to display, applying special formatting for 'customerActionRequired'
  const formattedStatus =
    status === 'customerActionRequired'
      ? spaceBetweenCapitalLetters('actionRequired') // Svelte version used 'actionRequired' here
      : spaceBetweenCapitalLetters(status);

  // Base Tailwind classes for styling, excluding background color initially
  const baseStylingClasses =
    'rounded-md text-white px-4 max-w-fit py-1 mx-auto text-sm whitespace-nowrap font-bold';

  // Determine the background color class based on the status, defaulting to gray
  const backgroundColorClass = statusColorMap[status] || 'bg-gray-400';

  // Combine all classes: base styling, dynamic background, and any custom classes
  const combinedClassName = [
    baseStylingClasses,
    backgroundColorClass,
    className // Append any custom classes passed via props
  ]
    .filter(Boolean) // Remove any falsy values (e.g., if className is undefined)
    .join(' ');

  return <div className={combinedClassName}>{formattedStatus}</div>;
};

export default StatusBadge;
