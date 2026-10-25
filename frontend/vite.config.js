import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from "@tailwindcss/vite"
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: 'auto',
      includeAssets: ['favicon.svg', 'apple-touch-icon-180x180.png', 'pwa-*.png', 'icons/*.png'],
      manifest: {
        name: 'Nsemfoa News - Stories That Matter',
        short_name: 'Nsemfoa News',
        description: 'Independent news, reporting, insights, and analysis from Ghana, Africa, and around the world.',
        theme_color: '#0B1B3A',
        background_color: '#ffffff',
        display: 'standalone',
        orientation: 'portrait-primary',
        id: '/',
        start_url: '/',
        scope: '/',
        prefer_related_applications: false,
        icons: [
          {
            src: '/icons/icon-192x192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any'
          },
          {
            src: '/icons/icon-192x192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'maskable'
          },
          {
            src: '/icons/icon-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any'
          },
          {
            src: '/icons/icon-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable'
          }
        ],
        shortcuts: [
          {
            name: 'Admin Panel',
            short_name: 'Admin',
            url: '/admin',
            icons: [
              {
                src: '/icons/shortcut-admin.png',
                sizes: '192x192',
                type: 'image/png',
                purpose: 'any'
              }
            ]
          },
          {
            name: 'Projects',
            short_name: 'Projects',
            url: '/?section=projects',
            icons: [
              {
                src: '/icons/shortcut-projects.png',
                sizes: '192x192',
                type: 'image/png',
                purpose: 'any'
              }
            ]
          },
          {
            name: 'Services',
            short_name: 'Services',
            url: '/?section=services',
            icons: [
              {
                src: '/icons/shortcut-services.png',
                sizes: '192x192',
                type: 'image/png',
                purpose: 'any'
              }
            ]
          },
          {
            name: 'Contact Me',
            short_name: 'Contact',
            url: '/?section=contact',
            icons: [
              {
                src: '/icons/shortcut-contact.png',
                sizes: '192x192',
                type: 'image/png',
                purpose: 'any'
              }
            ]
          }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,webp,woff,woff2}'],
        cleanupOutdatedCaches: true,
        clientsClaim: true,
        skipWaiting: true,
        navigateFallback: '/index.html',
        navigateFallbackDenylist: [/^\/api\//, /^\/admin\//],
        runtimeCaching: [
          // 1. Google Fonts Cache-First
          {
            urlPattern: /^https:\/\/fonts\.(?:googleapis|gstatic)\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-cache',
              expiration: {
                maxEntries: 20,
                maxAgeSeconds: 60 * 60 * 24 * 365 // 1 year
              },
              cacheableResponse: {
                statuses: [0, 200]
              }
            }
          },
          // 2. Images (Stale-While-Revalidate)
          {
            urlPattern: /\.(?:png|jpg|jpeg|svg|gif|webp|avif)$/i,
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'blog-images-cache',
              expiration: {
                maxEntries: 100,
                maxAgeSeconds: 60 * 60 * 24 * 30 // 30 days
              }
            }
          },
          // 3. Blog Public GET APIs (NetworkFirst with 5s timeout & safe cache fallback)
          {
            urlPattern: ({ url, request }) =>
              request.method === 'GET' &&
              (url.pathname.startsWith('/api/articles') ||
               url.pathname.startsWith('/api/site') ||
               url.pathname.startsWith('/api/posts')),
            handler: 'NetworkFirst',
            options: {
              cacheName: 'api-articles-cache',
              networkTimeoutSeconds: 5,
              expiration: {
                maxEntries: 100,
                maxAgeSeconds: 60 * 60 * 24 * 7 // 7 days
              },
              cacheableResponse: {
                statuses: [0, 200]
              }
            }
          },
          // 4. Admin & Mutating Requests (NetworkOnly - never cache)
          {
            urlPattern: ({ url, request }) =>
              request.method !== 'GET' ||
              url.pathname.startsWith('/api/admin') ||
              url.pathname.startsWith('/api/internal'),
            handler: 'NetworkOnly'
          }
        ]
      },
      devOptions: {
        enabled: true
      }
    })
  ],
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
      },
    },
  },
})
