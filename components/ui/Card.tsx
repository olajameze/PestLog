import { ReactNode } from 'react';

interface CardProps {
  children: ReactNode;
  className?: string;
  hoverLift?: boolean;
  shadow?: 'sm' | 'md' | 'lg' | 'xl' | '2xl';
}

export default function Card({ children, className = '', hoverLift = false, shadow = 'md' }: CardProps) {
  const baseClasses = `bg-white dark:bg-zinc-800 rounded-2xl border border-zinc-200 dark:border-zinc-700 p-6 shadow-${shadow}`;
  const hoverClasses = hoverLift ? 'hover-lift hover:shadow-lg transition-all' : '';
  
  return (
    <div className={`${baseClasses} ${hoverClasses} ${className}`}>
      {children}
    </div>
  );
}

