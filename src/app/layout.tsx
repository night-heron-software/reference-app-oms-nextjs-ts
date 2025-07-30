'use client'; // Required to use the usePathname hook.

import '@/app/ui/globals.css'; // Renamed from app.css for Next.js convention
import Breadcrumbs from '@/components/Breadcrumbs'; // Assuming Next.js alias '@/' for 'src/'
import { capitalize } from '@/utils/formatting';
import { usePathname } from 'next/navigation';
import React, { useEffect } from 'react';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  // Derive title and breadcrumb paths from the current URL
  const pathSegments = pathname.split('/').filter(Boolean);
  const title = pathSegments[pathSegments.length - 1] || 'Home';

  useEffect(() => {
    document.title = `OMS | ${capitalize(title)}`;
  }, [title]);

  return (
    <html lang="en">
      <body>
        <div className="relative flex flex-col min-h-screen bg-gray-200/18 text-gray-900">
          <header className="px-4 py-1 flex justify-end bg-gray-900/20">
            <nav className="flex items-center justify-between w-full mx-auto h-[60px]">
              <Breadcrumbs paths={pathSegments} />
            </nav>
          </header>
          <main className="flex flex-col items-center justify-center p-4 w-full h-full">
            <div className="w-full mx-auto max-w-6xl flex flex-col items-start gap-4 py-6">
              {children}
            </div>
          </main>
        </div>
      </body>
    </html>
  );
}
