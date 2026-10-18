import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { SiteSettingsProvider } from './context/SiteSettingsContext.jsx'
import { BlogProvider } from './context/BlogProvider.jsx'
import { AuthProvider } from './context/admin/AuthContext.jsx'
import { Toaster } from 'react-hot-toast'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <SiteSettingsProvider><AuthProvider>
      <BlogProvider>
        <Toaster position="top-right" toastOptions={{ duration: 4000 }} />
        <App />
      </BlogProvider>
    </AuthProvider></SiteSettingsProvider>
  </StrictMode>,
)

