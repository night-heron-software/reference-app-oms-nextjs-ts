'use client';

import React, { useState, useMemo, useCallback } from 'react';
import type { TableColumns, TableData } from '@/types/ui';
import Heading from './Heading';
import clsx from 'clsx';

interface TableWithHeaderProps {
  title: string;
  description?: string;
  action?: () => React.ReactNode;
  columns: TableColumns;
  data: TableData;
}

const pageSize = 50;

const TableWithHeader: React.FC<TableWithHeaderProps> = ({
  title,
  description,
  action,
  columns,
  data
}) => {
  const [page, setPage] = useState(1);

  const pageData = useMemo(() => {
    const start = (page - 1) * pageSize;
    const end = page * pageSize;
    return (data || []).slice(start, end);
  }, [data, page]);

  const nextPage = useCallback(() => {
    if (page * pageSize < (data || []).length) {
      setPage((prevPage) => prevPage + 1);
    }
  }, [page, (data || []).length]);

  const prevPage = useCallback(() => {
    if (page > 1) {
      setPage((prevPage) => prevPage - 1);
    }
  }, [page]);

  const canGoNext = page * pageSize < pageData.length;
  const canGoPrev = page > 1;

  return (
    <div className="px-4 sm:px-6 lg:px-8 w-full">
      <div className="sm:flex sm:items-center">
        <div className="sm:flex-auto">
          <Heading>{title}</Heading>
          {description && <p className="mt-2 text-sm text-gray-700">{description}</p>}
        </div>
        <div className="mt-4 sm:mt-0 sm:ml-16 sm:flex-none">
          {action && action()} {/* Call the action function if it exists */}
        </div>
      </div>
      <div className="mt-8 flow-root">
        <div className="-mx-4 -my-2 overflow-x-auto sm:-mx-6 lg:-mx-8">
          <div className="inline-block min-w-full py-2 align-middle sm:px-6 lg:px-8">
            <div className="overflow-hidden shadow-sm ring-1 ring-black/5 sm:rounded-lg">
              <table className="min-w-full divide-y divide-gray-300">
                <thead className="bg-gray-50">
                  <tr className="text-left">
                    {columns.map((column, i) => (
                      <th
                        key={column.key || i}
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
                      // Ideally, use a stable unique ID from `row` (e.g., row.id) instead of rowIndex
                      <tr key={rowIndex}>
                        {columns.map((column, colIndex) => {
                          const value = row[column.key];
                          let content: React.ReactNode;

                          if (column.formatter) {
                            const formattedValue = column.formatter(value, row);
                            if (typeof formattedValue === 'string') {
                              content = formattedValue;
                            } else {
                              // Assuming formattedValue is { type: Component, props: {} }
                              const FormattedComponent = formattedValue.type;
                              content = <FormattedComponent {...formattedValue.props} />;
                            }
                          } else {
                            content = value;
                          }
                          return (
                            <td
                              key={column.key} // Use column.key for cell key
                              className={clsx('px-3 py-4 text-sm whitespace-nowrap text-gray-700', {
                                'w-full': colIndex === 0
                              })}
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
                  {(page * pageSize - pageSize + 1).toLocaleString()} -{' '}
                  {Math.min(page * pageSize, pageData.length).toLocaleString()} of{' '}
                  {pageData.length.toLocaleString()}
                </p>
                <div className="flex flex-1 gap-2 justify-end">
                  <button
                    onClick={prevPage}
                    disabled={!canGoPrev} // Disable button when no previous page
                    className={clsx(
                      'relative cursor-pointer inline-flex items-center rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 ring-1 ring-gray-300 ring-inset hover:bg-gray-50 focus-visible:outline-offset-0',
                      { 'opacity-50 cursor-not-allowed': !canGoPrev } // Add disabled styling
                    )}
                  >
                    Previous
                  </button>
                  <button
                    onClick={nextPage}
                    disabled={!canGoNext} // Disable button when no next page
                    className={clsx(
                      'relative cursor-pointer inline-flex items-center rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 ring-1 ring-gray-300 ring-inset hover:bg-gray-50 focus-visible:outline-offset-0',
                      { 'opacity-50 cursor-not-allowed': !canGoNext } // Add disabled styling
                    )}
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
