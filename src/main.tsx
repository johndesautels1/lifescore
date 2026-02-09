import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import './styles/dark-mode.css'
import App from './App.tsx'

// Offline/online detection
window.addEventListener('offline', () => {
  const banner = document.createElement('div');
  banner.id = 'offline-banner';
  banner.setAttribute('role', 'alert');
  banner.style.cssText = 'position:fixed;top:0;left:0;right:0;z-index:99999;background:#dc2626;color:#fff;text-align:center;padding:8px 16px;font-size:14px;font-family:system-ui,sans-serif;';
  banner.textContent = 'No internet connection — some features may not work.';
  document.body.prepend(banner);
});

window.addEventListener('online', () => {
  document.getElementById('offline-banner')?.remove();
});

// Global unhandled rejection handler
window.onunhandledrejection = (event: PromiseRejectionEvent) => {
  console.error('[Unhandled Promise Rejection]', event.reason);
};

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
