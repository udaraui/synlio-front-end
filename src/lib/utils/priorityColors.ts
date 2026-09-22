/**
 * Consistent priority color utilities for the entire application
 * Priority levels: Low (Green) → Moderate (Blue) → High (Orange) → Critical (Red)
 */

export type PriorityLevel = 'low' | 'moderate' | 'high' | 'critical';

/**
 * Get priority colors for icons and text (Flag icons, etc.)
 * Returns both text and fill colors for consistency
 */
export const getPriorityColor = (priority: string): string => {
  switch (priority?.toLowerCase()) {
    case 'low':
      return 'text-green-600 fill-green-600 dark:text-green-500 dark:fill-green-500';
    case 'moderate':
      return 'text-blue-600 fill-blue-600 dark:text-blue-500 dark:fill-blue-500';
    case 'high':
      return 'text-orange-600 fill-orange-600 dark:text-orange-500 dark:fill-orange-500';
    case 'critical':
      return 'text-red-600 fill-red-600 dark:text-red-500 dark:fill-red-500';
    default:
      return 'text-gray-600 fill-gray-600 dark:text-gray-500 dark:fill-gray-500';
  }
};

/**
 * Get priority badge/pill colors with background
 * Used for priority labels and badges
 */
export const getPriorityBadgeColor = (priority: string): string => {
  switch (priority?.toLowerCase()) {
    case 'low':
      return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300';
    case 'moderate':
      return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300';
    case 'high':
      return 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300';
    case 'critical':
      return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300';
    default:
      return 'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-300';
  }
};

/**
 * Get priority text color only (for plain text)
 */
export const getPriorityTextColor = (priority: string): string => {
  switch (priority?.toLowerCase()) {
    case 'low':
      return 'text-green-700 dark:text-green-400';
    case 'moderate':
      return 'text-blue-700 dark:text-blue-400';
    case 'high':
      return 'text-orange-700 dark:text-orange-400';
    case 'critical':
      return 'text-red-700 dark:text-red-400';
    default:
      return 'text-gray-700 dark:text-gray-400';
  }
};

/**
 * Get priority border color
 */
export const getPriorityBorderColor = (priority: string): string => {
  switch (priority?.toLowerCase()) {
    case 'low':
      return 'border-green-300 dark:border-green-700';
    case 'moderate':
      return 'border-blue-300 dark:border-blue-700';
    case 'high':
      return 'border-orange-300 dark:border-orange-700';
    case 'critical':
      return 'border-red-300 dark:border-red-700';
    default:
      return 'border-gray-300 dark:border-gray-700';
  }
};

/**
 * Priority styles object for Record-based implementations
 */
export const priorityStyles: Record<string, string> = {
  low: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
  moderate: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
  high: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300',
  critical: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
};

/**
 * Get priority label display text
 */
export const getPriorityLabel = (priority: string): string => {
  switch (priority?.toLowerCase()) {
    case 'low':
      return 'Low';
    case 'moderate':
      return 'Moderate';
    case 'high':
      return 'High';
    case 'critical':
      return 'Critical';
    default:
      return priority || 'None';
  }
};
