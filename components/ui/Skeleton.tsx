import { forwardRef } from 'react';

interface SkeletonProps {
  className?: string;
  count?: number;
  width?: string;
  height?: string;
  circle?: boolean;
  animate?: boolean;
}

export const Skeleton = forwardRef<HTMLDivElement, SkeletonProps>(
  ({ 
    className = '', 
    count = 1, 
    width, 
    height, 
    circle = false, 
    animate = true 
  }, ref) => {
    const baseClasses = `relative overflow-hidden bg-gradient-to-r from-gray-200 via-gray-200 to-gray-300 animate-shimmer ${animate ? 'dark:from-slate-700 dark:via-slate-700 dark:to-slate-800' : ''}`;
    
    const style: React.CSSProperties = {};
    if (width) style.width = width;
    if (height) style.height = height;

    const shapeClass = circle ? 'rounded-full' : 'rounded-lg';

    return (
      <>
        {Array.from({ length: count }).map((_, index) => (
          <div
            key={index}
            ref={index === 0 ? ref : null}
            className={`${baseClasses} ${shapeClass} ${className}`}
            style={style}
          />
        ))}
      </>
    );
  }
);

Skeleton.displayName = 'Skeleton';

export const SkeletonCard = ({
  children,
  className = '',
}: {
  children: React.ReactNode;
  className?: string;
}) => (
  <div className={`animate-pulse bg-gradient-to-r from-slate-200 via-slate-100 to-slate-200 p-6 rounded-2xl shadow-sm ${className}`}>
    {children}
  </div>
);

SkeletonCard.displayName = 'SkeletonCard';
