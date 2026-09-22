import React from 'react';
import { cn } from '@/lib/utils';

interface StarRatingProps {
  /**
   * Number of filled stars to display
   */
  count: number;
  /**
   * Maximum number of stars (default: 5)
   */
  maxStars?: number;
  /**
   * Size of the stars
   */
  size?: 'sm' | 'md' | 'lg';
  /**
   * Custom className for styling
   */
  className?: string;
  /**
   * Color variant for the stars
   */
  variant?: 'yellow' | 'orange' | 'red' | 'blue' | 'green';
  /**
   * Whether to show empty stars as outlines
   */
  showEmpty?: boolean;
}

const sizeClasses = {
  sm: 'h-3 w-3',
  md: 'h-4 w-4', 
  lg: 'h-5 w-5'
};

const colorClasses = {
  yellow: 'text-yellow-500',
  orange: 'text-orange-500',
  red: 'text-red-500',
  blue: 'text-blue-500',
  green: 'text-green-500'
};

/**
 * Filled Star Icon Component
 */
const FilledStar: React.FC<{ className?: string }> = ({ className }) => (
  <svg
    className={className}
    fill="currentColor"
    viewBox="0 0 24 24"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" />
  </svg>
);

/**
 * Empty Star Icon Component (outline)
 */
const EmptyStar: React.FC<{ className?: string }> = ({ className }) => (
  <svg
    className={className}
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    viewBox="0 0 24 24"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" />
  </svg>
);

/**
 * Star Rating Component
 * Displays a row of filled stars based on the count prop
 */
export const StarRating: React.FC<StarRatingProps> = ({
  count,
  maxStars = 5,
  size = 'md',
  className,
  variant = 'yellow',
  showEmpty = false
}) => {
  const filledStars = Math.min(Math.max(count, 0), maxStars);
  const emptyStars = showEmpty ? maxStars - filledStars : 0;

  return (
    <div className={cn('flex items-center gap-1', className)}>
      {/* Filled stars */}
      {Array.from({ length: filledStars }, (_, index) => (
        <FilledStar
          key={`filled-${index}`}
          className={cn(sizeClasses[size], colorClasses[variant])}
        />
      ))}
      
      {/* Empty stars (if showEmpty is true) */}
      {Array.from({ length: emptyStars }, (_, index) => (
        <EmptyStar
          key={`empty-${index}`}
          className={cn(sizeClasses[size], colorClasses[variant], 'opacity-30')}
        />
      ))}
    </div>
  );
};

/**
 * Simple Filled Star Icon Export
 */
export const StarFilled = FilledStar;

export default StarRating;
