/**
 * LIFE SCORE - Error Tracking Service (E10)
 * Lightweight error tracking that captures unhandled errors and reports them.
 * Can be extended to send to Sentry/LogRocket when ready.
 */

interface ErrorReport {
  message: string;
  stack?: string;
  source?: string;
  timestamp: string;
  userAgent: string;
  url: string;
  componentStack?: string;
}

const ERROR_BUFFER: ErrorReport[] = [];
const MAX_BUFFER_SIZE = 50;
const REPORTING_ENDPOINT = import.meta.env.VITE_ERROR_REPORTING_URL || '';

function createReport(error: Error | string, source?: string, componentStack?: string): ErrorReport {
  const err = typeof error === 'string' ? new Error(error) : error;
  return {
    message: err.message,
    stack: err.stack,
    source: source || 'unknown',
    timestamp: new Date().toISOString(),
    userAgent: navigator.userAgent,
    url: window.location.href,
    componentStack,
  };
}

function bufferError(report: ErrorReport): void {
  if (ERROR_BUFFER.length >= MAX_BUFFER_SIZE) {
    ERROR_BUFFER.shift();
  }
  ERROR_BUFFER.push(report);

  // Log in development
  if (import.meta.env.DEV) {
    console.group(`[ErrorTracking] ${report.source}`);
    console.error(report.message);
    if (report.stack) console.debug(report.stack);
    console.groupEnd();
  }
}

async function sendToEndpoint(report: ErrorReport): Promise<void> {
  if (!REPORTING_ENDPOINT) return;

  try {
    await fetch(REPORTING_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(report),
      keepalive: true,
    });
  } catch {
    // Silently fail — don't create error loops
  }
}

/**
 * Track an error manually from anywhere in the app.
 */
export function trackError(error: Error | string, source?: string, componentStack?: string): void {
  const report = createReport(error, source, componentStack);
  bufferError(report);
  sendToEndpoint(report);
}

/**
 * Get buffered errors for debugging.
 */
export function getErrorBuffer(): ReadonlyArray<ErrorReport> {
  return [...ERROR_BUFFER];
}

/**
 * Initialize global error handlers.
 * Call once in main.tsx.
 */
export function initErrorTracking(): void {
  // Unhandled JS errors
  window.addEventListener('error', (event) => {
    trackError(
      event.error || event.message,
      `window.onerror: ${event.filename}:${event.lineno}:${event.colno}`
    );
  });

  // Unhandled promise rejections
  window.addEventListener('unhandledrejection', (event) => {
    const error = event.reason instanceof Error
      ? event.reason
      : new Error(String(event.reason));
    trackError(error, 'unhandledrejection');
  });

  if (import.meta.env.DEV) {
    console.log('[ErrorTracking] Initialized. Errors will be logged to console.');
    if (REPORTING_ENDPOINT) {
      console.log(`[ErrorTracking] Reporting to: ${REPORTING_ENDPOINT}`);
    }
  }
}
