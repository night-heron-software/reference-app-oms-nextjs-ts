import React from 'react';

interface CardProps {
  children: React.ReactNode;
  actionButtons?: React.ReactNode;
}

const Card: React.FC<CardProps> = ({ children, actionButtons }) => {
  return (
    <div className="w-full divide-y divide-gray-200 rounded-lg bg-white shadow-sm">
      <div className="flex w-full items-center justify-between space-x-6 p-6">{children}</div>
      {actionButtons && (
        <div className="-mt-px flex justify-end divide-x divide-gray-200 gap-2 p-2">
          {actionButtons}
        </div>
      )}
    </div>
  );
};

export default Card;
