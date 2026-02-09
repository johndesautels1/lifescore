import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import './styles/dark-mode.css'
import App from './App.tsx'
import ErrorBoundary from './components/ErrorBoundary.tsx'

// Global error handlers to catch unhandled errors and promise rejections
window.onerror = (message, source, lineno, colno, error) => {
  console.error('[Global] Unhandled error:', { message, source, lineno, colno, error });
};

window.onunhandledrejection = (event: PromiseRejectionEvent) => {
  console.error('[Global] Unhandled promise rejection:', event.reason);
};

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
)
