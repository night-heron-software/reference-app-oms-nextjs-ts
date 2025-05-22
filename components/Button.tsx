import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
  loading?: boolean;
  // onClick is already part of React.ButtonHTMLAttributes<HTMLButtonElement>
  // type is already part of React.ButtonHTMLAttributes<HTMLButtonElement>
  // disabled is already part of React.ButtonHTMLAttributes<HTMLButtonElement>
}

const Button: React.FC<ButtonProps> = ({
  children,
  type = 'button',
  disabled = false,
  loading = false,
  onClick,
  className, // Allow passing additional classes
  ...props // Spread other native button attributes
}) => {
  const baseClasses =
    'cursor-pointer block rounded-md min-w-24 transition-colors bg-blue-500 px-3 py-2 text-center text-base font-medium text-white shadow-xs hover:bg-blue-700/90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600';

  const disabledClasses = 'opacity-50 cursor-not-allowed hover:bg-blue-700/50';
  const loadingClasses = 'relative cursor-wait';

  const combinedClassName = [
    baseClasses,
    disabled || loading ? disabledClasses : '', // Apply disabled styles if loading too
    loading ? loadingClasses : '',
    className // User-provided classes
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <button
      type={type}
      disabled={disabled || loading} // Button should be disabled when loading
      onClick={onClick}
      className={combinedClassName}
      {...props}
    >
      <div className="flex items-center justify-center">
        {loading && (
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-b-transparent mr-2"></div>
        )}
        {children}
      </div>
    </button>
  );
};

export default Button;
