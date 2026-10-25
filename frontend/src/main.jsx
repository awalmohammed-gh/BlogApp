import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { SiteSettingsProvider } from './context/SiteSettingsContext.jsx'
import AppErrorBoundary from './components/common/AppErrorBoundary.jsx'

import ToastViewport from './components/common/ToastViewport.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <AppErrorBoundary><SiteSettingsProvider>

        <ToastViewport />
        <App />

    </SiteSettingsProvider></AppErrorBoundary>
  </StrictMode>,
)

// Dual-PWA Service Worker Registration with root scope { scope: '/' }
// Covers both public routes (/) and admin CMS (/admin)
if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/sw.js', { scope: '/' })
      .then((registration) => {
        // Periodic check for worker updates
        setInterval(() => {
          registration.update().catch(() => {});
        }, 60 * 60 * 1000);
      })
      .catch((error) => {
        console.warn('[SW] Service Worker registration failed:', error);
      });
  });
}


