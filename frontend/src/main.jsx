import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { SiteSettingsProvider } from './context/SiteSettingsContext.jsx'
import AppErrorBoundary from './components/common/AppErrorBoundary.jsx'

import { Toaster } from 'react-hot-toast'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <AppErrorBoundary><SiteSettingsProvider>

        <Toaster position="top-right" toastOptions={{ duration: 4000 }} />
        <App />

    </SiteSettingsProvider></AppErrorBoundary>
  </StrictMode>,
)

