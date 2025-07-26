'use client';

import Link from 'next/link';
import React from 'react';
import { capitalize } from '@/lib/utils/formatting';
import Logo from './OmsLogo'; // Adjust the import path as necessary

interface BreadcrumbsProps {
  paths: string[];
}

const Breadcrumbs: React.FC<BreadcrumbsProps> = ({ paths }) => {
  return (
    <nav aria-label="Breadcrumb">
      <ol className="flex items-center space-x-2 text-sm text-gray-800">
        <li>
          <Link href="/" className="hover:underline">
            <Logo />
            <span className="sr-only">Home</span>
          </Link>
        </li>
        {paths.map((path, index) => {
          const href = `/${paths.slice(0, index + 1).join('/')}`;
          const isLast = index === paths.length - 1;

          return (
            <React.Fragment key={href}>
              <li>
                <span className="mx-2">/</span>
              </li>
              <li>
                {isLast ? (
                  <span className="font-medium text-gray-900">{capitalize(path)}</span>
                ) : (
                  <Link href={href} className="hover:underline">
                    {capitalize(path)}
                  </Link>
                )}
              </li>
            </React.Fragment>
          );
        })}
      </ol>
    </nav>
  );
};

export default Breadcrumbs;
