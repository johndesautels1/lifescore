/**
 * LIFE SCORE™ Toast Notification Utility
 * Centralized toast helper for user-facing feedback
 *
 * Wraps react-hot-toast with consistent styling for the app.
 */

import React from 'react';
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

/** Non-blocking confirmation toast with Confirm/Cancel buttons */
export function toastConfirm(message: string, onConfirm: () => void) {
  toast(
    (t) => (
      <div style={{ display: 'flex', flexDirection: 'column' as const, gap: '10px' }}>
        <p style={{ margin: 0, fontSize: '0.9rem', lineHeight: 1.4 }}>{message}</p>
        <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
          <button
            onClick={() => toast.dismiss(t.id)}
            style={{
              padding: '6px 14px',
              borderRadius: '6px',
              border: '1px solid rgba(148, 163, 184, 0.3)',
              background: 'transparent',
              color: '#94a3b8',
              cursor: 'pointer',
              fontSize: '0.8rem',
            }}
          >
            Cancel
          </button>
          <button
            onClick={() => { toast.dismiss(t.id); onConfirm(); }}
            style={{
              padding: '6px 14px',
              borderRadius: '6px',
              border: 'none',
              background: '#ef4444',
              color: '#fff',
              cursor: 'pointer',
              fontSize: '0.8rem',
              fontWeight: 600,
            }}
          >
            Confirm
          </button>
        </div>
      </div>
    ),
    {
      duration: Infinity,
      style: {
        background: '#0f172a',
        color: '#e2e8f0',
        border: '1px solid rgba(239, 68, 68, 0.3)',
        maxWidth: '400px',
        padding: '16px',
      },
    }
  );
}

export { toast };
