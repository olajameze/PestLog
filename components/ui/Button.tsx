import { ReactNode } from 'react';

interface ButtonProps {
  children: ReactNode;
  variant?: 'primary' | 'secondary' | 'success' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  fullWidth?: boolean;
  disabled?: boolean;
  onClick?: () => void;
  type?: 'button' | 'submit';
  className?: string;
}

export default function Button({
  children,
  variant = 'primary',
  size = 'md',
  fullWidth = false,
  disabled = false,
  onClick,
  type = 'button',
  className = '',
}: ButtonProps) {
  const baseClasses = [
    'inline-flex items-center justify-center gap-2 font-medium whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-offset-2 focus-visible:ring-2 active:scale-[0.98] transition-[transform,box-shadow,background-color,border-color,color] duration-200',
    fullWidth ? 'w-full' : '',
    size === 'sm' ? 'px-4 py-2 text-sm' : '',
    size === 'lg' ? 'px-8 py-3 text-lg' : 'px-6 py-3',
  ];

  const variantClasses = {
    primary: 'btn-primary bg-primary-500 hover:bg-primary-600 text-white focus:ring-primary-500 shadow-md hover:shadow-lg hover-lift',
    secondary: 'btn-secondary border border-zinc-300 hover:bg-zinc-50 dark:border-zinc-600 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 focus:ring-zinc-400',
    success: 'btn-success bg-green-500 hover:bg-green-600 text-white focus:ring-green-500 shadow-sm hover:shadow-md',
    danger: 'btn-danger bg-red-500 hover:bg-red-600 text-white focus:ring-red-500 shadow-sm hover:shadow-md',
  };

  return (
    <button
      type={type}
      disabled={disabled}
      onClick={onClick}
      className={`btn btn-${variant} ${size} ${baseClasses.join(' ')} ${variantClasses[variant]} ${className}`}
    >
      {children}
    </button>
  );
}

