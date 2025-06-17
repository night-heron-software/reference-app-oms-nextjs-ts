'use client';
import { useMemo, useState } from 'react';
// This is a client-side component in Next.js
import Heading from './Heading'; // Assuming Heading.tsx or Heading.jsx
import type { TableColumns, TableData, Persona } from '@/src/types/ui'; // Adjust the import path as necessary
// Define types similar to what would be in $lib/types/ui
// In a real project, import these from your shared types location.
interface TableWithHeaderProps<R = any> {
  title: string;
  description?: string;
  action?: () => React.ReactNode; // Translated from Svelte Snippet
  columns: TableColumns;
  data: TableData;
}

/* const formatter = (value: string, row: any) => ({
  type: Link, // The React Link component
  props: { value: value, href: row.link } // Props for the Link component
});
 */
const TableWithHeader = <R extends Record<string, any>>({
  title,
  description,
  action,
  columns,
  data
}: TableWithHeaderProps<R>) => {
  const pageSize = 50;
  const [page, setPage] = useState(1);

  const pageData = useMemo(() => {
    const start = (page - 1) * pageSize;
    const end = start + pageSize;
    return (data || []).slice(start, end);
  }, [data, page, pageSize]);

  const nextPage = () => {
    if (page * pageSize < data.length) {
      setPage((prevPage) => prevPage + 1);
    }
  };

  const prevPage = () => {
    if (page > 1) {
      setPage((prevPage) => prevPage - 1);
    }
  };

  const totalItems = (data || []).length;
  const firstItemOnPage = totalItems > 0 ? (page - 1) * pageSize + 1 : 0;
  const lastItemOnPage = Math.min(page * pageSize, totalItems);

  return (
    <div className="px-4 sm:px-6 lg:px-8 w-full">
      <div className="sm:flex sm:items-center">
        <div className="sm:flex-auto">
          <Heading>{title}</Heading>
          {description && <p className="mt-2 text-sm text-gray-700">{description}</p>}
        </div>
        <div className="mt-4 sm:mt-0 sm:ml-16 sm:flex-none">{action && action()}</div>
      </div>
      <div className="mt-8 flow-root">
        <div className="-mx-4 -my-2 overflow-x-auto sm:-mx-6 lg:-mx-8">
          <div className="inline-block min-w-full py-2 align-middle sm:px-6 lg:px-8">
            <div className="overflow-hidden shadow-sm ring-1 ring-black/5 sm:rounded-lg">
              <table className="min-w-full divide-y divide-gray-300">
                <thead className="bg-gray-50">
                  <tr className="text-left">
                    {columns.map((column, colIndex) => (
                      <th
                        key={column.key || colIndex}
                        scope="col"
                        className="px-3 py-3.5 text-sm font-semibold text-gray-900"
                      >
                        {column.title}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 bg-white">
                  {pageData.length > 0 ? (
                    pageData.map((row, rowIndex) => (
                      <tr key={rowIndex}>
                        {/* Consider using a unique row.id if available */}
                        {columns.map((column, colIndex) => {
                          const cellValue = (row as any)[column.key];
                          let content: React.ReactNode;

                          if (column.formatter) {
                            const formattedValue = column.formatter(cellValue, row);
                            if (typeof formattedValue === 'string') {
                              content = formattedValue;
                            } else {
                              // Assumes formattedValue is { type: Component, props: {} }
                              const FormattedComponent = formattedValue.type as React.ElementType;
                              content = <FormattedComponent {...formattedValue.props} />;
                            }
                          } else {
                            content =
                              cellValue === null || typeof cellValue === 'undefined'
                                ? ''
                                : String(cellValue);
                          }

                          return (
                            <td
                              key={column.key || colIndex}
                              className={`px-3 py-4 text-sm whitespace-nowrap text-gray-700 ${
                                colIndex === 0 ? 'w-full' : ''
                              }`.trim()}
                            >
                              {content}
                            </td>
                          );
                        })}
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td
                        colSpan={columns.length}
                        className="px-3 py-4 text-sm text-gray-500 text-center"
                      >
                        No data available
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
              <div className="flex items-center justify-between bg-gray-50 p-2">
                <p className="text-xs text-gray-700">
                  {totalItems > 0
                    ? `${firstItemOnPage.toLocaleString()} - ${lastItemOnPage.toLocaleString()} of ${totalItems.toLocaleString()}`
                    : '0 results'}
                </p>
                <div className="flex flex-1 gap-2 justify-end">
                  <button
                    onClick={prevPage}
                    disabled={page <= 1}
                    className="relative cursor-pointer inline-flex items-center rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 ring-1 ring-gray-300 ring-inset hover:bg-gray-50 focus-visible:outline-offset-0 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Previous
                  </button>
                  <button
                    onClick={nextPage}
                    disabled={page * pageSize >= totalItems}
                    className="relative cursor-pointer inline-flex items-center rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 ring-1 ring-gray-300 ring-inset hover:bg-gray-50 focus-visible:outline-offset-0 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Next
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TableWithHeader;
