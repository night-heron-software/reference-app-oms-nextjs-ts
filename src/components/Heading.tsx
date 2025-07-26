import React from 'react';

export default function Heading({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-w-0 flex-1">
      <h2 className="text-2xl/7 font-bold text-gray-900 sm:truncate sm:text-3xl sm:tracking-tight">
        {children}
      </h2>
    </div>
  );
}
