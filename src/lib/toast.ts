import { toast as sonnerToast } from 'sonner';

/**
 * Common Toast Utility
 * A centralized wrapper for Sonner toast notifications
 * Positioned at top-right with consistent styling
 */

export const toast = {
  /**
   * Show success message
   * @param message - The success message to display
   * @param description - Optional description for more details
   */
  success: (message: string, description?: string) => {
    sonnerToast.success(message, {
      description,
      duration: 3000,
    });
  },

  /**
   * Show error message
   * @param message - The error message to display
   * @param description - Optional description for more details
   */
  error: (message: string, description?: string, position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left' | 'top-center' | 'bottom-center') => {
    sonnerToast.error(message, {
      description,
      duration: 4000,
      ...(position ? { position } : {}),
    });
  },

  /**
   * Show warning message
   * @param message - The warning message to display
   * @param description - Optional description for more details
   */
  warning: (message: string, description?: string) => {
    sonnerToast.warning(message, {
      description,
      duration: 3500,
    });
  },

  /**
   * Show info message
   * @param message - The info message to display
   * @param description - Optional description for more details
   */
  info: (message: string, description?: string) => {
    sonnerToast.info(message, {
      description,
      duration: 3000,
    });
  },

  /**
   * Show loading message
   * @param message - The loading message to display
   * @returns Toast ID that can be used to dismiss or update the toast
   */
  loading: (message: string) => {
    return sonnerToast.loading(message);
  },

  /**
   * Show promise-based toast
   * Automatically shows loading, success, or error based on promise state
   * @param promise - The promise to track
   * @param messages - Messages for loading, success, and error states
   */
  promise: <T>(
    promise: Promise<T>,
    messages: {
      loading: string;
      success: string | ((data: T) => string);
      error: string | ((error: any) => string);
    }
  ) => {
    return sonnerToast.promise(promise, messages);
  },

  /**
   * Dismiss a specific toast or all toasts
   * @param toastId - Optional toast ID to dismiss. If not provided, dismisses all toasts
   */
  dismiss: (toastId?: string | number) => {
    sonnerToast.dismiss(toastId);
  },

  /**
   * Show custom toast with full control
   * @param message - The message to display
   * @param options - Sonner toast options
   */
  custom: (message: string, options?: any) => {
    return sonnerToast(message, options);
  },
};

/**
 * Usage Examples:
 *
 * // Basic success
 * toast.success('Ticket created');
 *
 * // Success with description
 * toast.success('Ticket created', 'Your ticket #123 has been created');
 *
 * // Error
 * toast.error('Failed to delete ticket');
 *
 * // Warning
 * toast.warning('You can only pin up to 5 filters');
 *
 * // Loading with update
 * const toastId = toast.loading('Saving');
 * // Later...
 * toast.dismiss(toastId);
 * toast.success('Saved');
 *
 * // Promise-based
 * toast.promise(
 *   updateTicket(id, data),
 *   {
 *     loading: 'Updating ticket',
 *     success: 'Ticket updated',
 *     error: 'Failed to update ticket'
 *   }
 * );
 */

