/**
 * LIFE SCORE™ Toast Notification Utility
 * Centralized toast helper for user-facing feedback
 *
 * Wraps react-hot-toast with consistent styling for the app.
 */

import toast from 'react-hot-toast';

/** Show a success toast */
export function toastSuccess(message: string) {
  toast.success(message, {
    duration: 3000,
    style: {
      background: '#0f172a',
      color: '#e2e8f0',
      border: '1px solid rgba(0, 71, 171, 0.3)',
    },
    iconTheme: {
      primary: '#22c55e',
      secondary: '#0f172a',
    },
  });
}

/** Show an error toast */
export function toastError(message: string) {
  toast.error(message, {
    duration: 5000,
    style: {
      background: '#0f172a',
      color: '#e2e8f0',
      border: '1px solid rgba(239, 68, 68, 0.3)',
    },
    iconTheme: {
      primary: '#ef4444',
      secondary: '#0f172a',
    },
  });
}

/** Show an info/loading toast */
export function toastInfo(message: string) {
  toast(message, {
    duration: 3000,
    icon: 'ℹ️',
    style: {
      background: '#0f172a',
      color: '#e2e8f0',
      border: '1px solid rgba(0, 71, 171, 0.3)',
    },
  });
}

/** Show a loading toast that can be dismissed programmatically */
export function toastLoading(message: string): string {
  return toast.loading(message, {
    style: {
      background: '#0f172a',
      color: '#e2e8f0',
      border: '1px solid rgba(0, 71, 171, 0.3)',
    },
  });
}

/** Dismiss a toast by ID */
export function toastDismiss(id: string) {
  toast.dismiss(id);
}

export { toast };
