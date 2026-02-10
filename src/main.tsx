import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { Toaster } from 'react-hot-toast'
import './index.css'
import './styles/dark-mode.css'
import App from './App.tsx'
import ErrorBoundary from './components/ErrorBoundary.tsx'
import { initErrorTracking } from './lib/errorTracking.ts'
import { toastError } from './utils/toast'

// E10: Initialize global error tracking (internal buffer + reporting)
initErrorTracking();

// Global unhandled promise rejection handler — show toast to user
window.onunhandledrejection = (event: PromiseRejectionEvent) => {
  console.error('[Unhandled Rejection]', event.reason);
  const message = event.reason instanceof Error
    ? event.reason.message
    : 'An unexpected error occurred';
  toastError(message);
};

// Global error handler — show toast to user
window.onerror = (_message, _source, _lineno, _colno, error) => {
  console.error('[Global Error]', error);
  if (error) {
    toastError(error.message || 'An unexpected error occurred');
  }
};

// Offline/online detection
window.addEventListener('offline', () => {
  toastError('No internet connection — some features may not work');
});

window.addEventListener('online', () => {
  import('./utils/toast').then(({ toastSuccess }) => {
    toastSuccess('Back online');
  });
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <Toaster
        position="top-right"
        toastOptions={{
          style: {
            maxWidth: '400px',
            fontSize: '0.875rem',
          },
        }}
      />
      <App />
    </ErrorBoundary>
  </StrictMode>,
)
