// Nsemfoa News - Service Worker v3
const CACHE_NAME = "nsemfoa-news-v3";
const APP_SHELL_URL = "/index.html";

const PRECACHE_ASSETS = [
  "/",
  "/index.html",
  "/manifest.webmanifest",
  "/favicon.ico",
  "/favicon.svg",
  "/app-logo.png"
];

// 1. Install Event: Cache core app shell and immediately take over
self.addEventListener("install", (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(PRECACHE_ASSETS).catch((err) => {
        console.warn("[SW] Precache non-critical asset failure (ignored):", err);
      });
    })
  );
});

// 2. Activate Event: Clean up stale caches and claim all clients immediately
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME && !key.startsWith("workbox-")) {
            console.log("[SW] Purging outdated cache:", key);
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// 3. Fetch Event: Robust, error-resilient request handling
self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Ignore non-GET requests and unsupported protocols (e.g., chrome-extension)
  if (request.method !== "GET" || !url.protocol.startsWith("http")) {
    return;
  }

  // Admin and mutating endpoints are NetworkOnly (never cached)
  if (
    url.pathname.startsWith("/api/admin") ||
    url.pathname.startsWith("/api/internal") ||
    url.pathname.includes("/auth/")
  ) {
    return;
  }

  // --- A. HTML Navigation Requests (request.mode === 'navigate') ---
  // Network-First with fallback to cached App Shell (/index.html) so React Router handles all routes
  if (
    request.mode === "navigate" ||
    (request.headers.get("accept") && request.headers.get("accept").includes("text/html"))
  ) {
    event.respondWith(
      (async () => {
        try {
          const networkResponse = await fetch(request);
          if (networkResponse && networkResponse.status === 200) {
            try {
              const cache = await caches.open(CACHE_NAME);
              await cache.put(APP_SHELL_URL, networkResponse.clone());
            } catch (cacheErr) {
              // Caching failure must NEVER fail the navigation
            }
            return networkResponse;
          }
        } catch (fetchErr) {
          // Network failed (offline / transient drop) - fall back to App Shell
        }

        // Fall back to cached App Shell (/index.html)
        try {
          const cache = await caches.open(CACHE_NAME);
          const cachedShell = (await cache.match(APP_SHELL_URL)) || (await cache.match("/"));
          if (cachedShell) {
            return cachedShell;
          }
        } catch (cacheErr) {
          // ignore cache read errors
        }

        // Direct fetch of /index.html as last resort
        try {
          const direct = await fetch(APP_SHELL_URL);
          if (direct) return direct;
        } catch (err) {
          // ignore
        }

        // Return a graceful offline HTML document so event.respondWith NEVER returns undefined
        return new Response(
          '<!doctype html><html lang="en"><head><meta charset="UTF-8"><title>Nsemfoa News</title></head><body style="font-family:system-ui,sans-serif;text-align:center;padding:48px 16px;background:#f8fafc;color:#0f172a;"><div style="max-width:480px;margin:0 auto;background:#fff;padding:32px;border-radius:16px;box-shadow:0 10px 25px -5px rgba(0,0,0,0.1);"><h2>Nsemfoa News</h2><p style="color:#64748b;margin:16px 0;">You appear to be offline or your connection changed.</p><button onclick="window.location.reload()" style="background:#2563eb;color:#fff;border:none;padding:10px 20px;border-radius:8px;font-weight:600;cursor:pointer;">Try Again</button></div></body></html>',
          { headers: { "Content-Type": "text/html; charset=utf-8" }, status: 200 }
        );
      })()
    );
    return;
  }

  // --- B. Public API Requests (/api/...) ---
  // Safe Network-First with Cache Fallback for Public Feeds & Categories
  if (url.pathname.startsWith("/api/")) {
    event.respondWith(
      (async () => {
        try {
          const networkResponse = await fetch(request);
          // Only cache successful 200 responses
          if (networkResponse && networkResponse.status === 200) {
            try {
              const cache = await caches.open(CACHE_NAME);
              // Always clone BEFORE caching so the consumer stream is intact
              await cache.put(request, networkResponse.clone());
            } catch (cacheErr) {
              // Caching failure (quota, header) must NEVER crash the request
            }
          }
          return networkResponse;
        } catch (networkErr) {
          // Network failed: check cache for matching query (e.g. ?category=... or desk query)
          try {
            const cache = await caches.open(CACHE_NAME);
            const cachedResponse = await cache.match(request);
            if (cachedResponse) {
              return cachedResponse;
            }
          } catch (cacheErr) {
            // ignore
          }

          // Return graceful JSON response so fetch caller never crashes with unhandled exception
          return new Response(
            JSON.stringify({
              success: false,
              data: [],
              message: "Your connection may have changed. Please try loading the page again.",
              offline: true
            }),
            {
              status: 200,
              headers: { "Content-Type": "application/json" }
            }
          );
        }
      })()
    );
    return;
  }

  // --- C. Static Assets (CSS, JS, Fonts, Images) ---
  // Stale-While-Revalidate with network fallback
  event.respondWith(
    (async () => {
      try {
        const cache = await caches.open(CACHE_NAME);
        const cachedResponse = await cache.match(request);

        const networkFetchPromise = fetch(request)
          .then(async (networkResponse) => {
            if (networkResponse && networkResponse.status === 200) {
              try {
                await cache.put(request, networkResponse.clone());
              } catch (err) {
                // ignore
              }
            }
            return networkResponse;
          })
          .catch(() => null);

        if (cachedResponse) {
          return cachedResponse;
        }

        const networkResponse = await networkFetchPromise;
        if (networkResponse) {
          return networkResponse;
        }
      } catch (err) {
        // ignore
      }

      // Direct network fallback
      try {
        const fallback = await fetch(request);
        if (fallback) return fallback;
      } catch (err) {
        // ignore
      }

      return new Response("", { status: 404, statusText: "Not Found" });
    })()
  );
});
