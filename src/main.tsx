import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { Toaster } from 'react-hot-toast'
import './index.css'
import './styles/dark-mode.css'
import App from './App.tsx'
import { toastError } from './utils/toast'

// Global unhandled promise rejection handler (Error #6)
window.onunhandledrejection = (event: PromiseRejectionEvent) => {
  console.error('[Unhandled Rejection]', event.reason);
  const message = event.reason instanceof Error
    ? event.reason.message
    : 'An unexpected error occurred';
  toastError(message);
};

// Global error handler
window.onerror = (_message, _source, _lineno, _colno, error) => {
  console.error('[Global Error]', error);
  if (error) {
    toastError(error.message || 'An unexpected error occurred');
  }
};

// Offline/online detection (Error #7)
window.addEventListener('offline', () => {
  toastError('No internet connection — some features may not work');
});

window.addEventListener('online', () => {
  // Use dynamic import to avoid circular deps
  import('./utils/toast').then(({ toastSuccess }) => {
    toastSuccess('Back online');
  });
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
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
  </StrictMode>,
)
