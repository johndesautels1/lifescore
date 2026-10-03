import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { Toaster } from 'react-hot-toast'
import './index.css'
import './styles/dark-mode.css'
import { loadPublicSupabaseSettings } from './lib/publicConfig.ts'
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

/**
 * Start the app. The sign-in settings are loaded FIRST (from the build, else
 * from the server — lib/publicConfig.ts), and only then is the app imported,
 * because importing it creates the Supabase client from those settings.
 */
async function boot(): Promise<void> {
  await loadPublicSupabaseSettings();
  const { default: App } = await import('./App.tsx');
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
  );
}

boot().catch((error: unknown) => {
  console.error('[boot] LIFE SCORE could not start:', error);
  const root = document.getElementById('root');
  if (root) root.textContent = 'LIFE SCORE could not start. Please refresh the page.';
});
