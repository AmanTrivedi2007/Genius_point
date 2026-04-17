// ============================================================
// Genius Point — Production Service Worker
// Strategy:
// - Pre-cache core files
// - Network-first for HTML
// - Cache-first for assets
// - Offline fallback
// ============================================================

const CACHE_NAME = "genius-point-v3";
const OFFLINE_URL = "/static/offline.html";

// Files to cache on install
const PRECACHE_URLS = [
  "/",
  "/index.html",
  OFFLINE_URL
];

// ─────────────────────────────────────────
// INSTALL — Pre-cache core files
// ─────────────────────────────────────────
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(async (cache) => {
      try {
        await cache.addAll(PRECACHE_URLS);

        // Force cache homepage (important for iOS)
        const response = await fetch("/");
        await cache.put("/", response);
      } catch (err) {
        console.log("[SW] Install error:", err);
      }
    })
  );

  self.skipWaiting();
});

// ─────────────────────────────────────────
// ACTIVATE — Clean old caches
// ─────────────────────────────────────────
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      )
    )
  );

  self.clients.claim();
});

// ─────────────────────────────────────────
// FETCH — Handle requests
// ─────────────────────────────────────────
self.addEventListener("fetch", (event) => {
  const request = event.request;

  // Only handle GET requests
  if (request.method !== "GET") return;

  // Handle HTML pages (Network-first)
  if (request.headers.get("accept")?.includes("text/html")) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          // Cache latest version
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(request, clone);
          });
          return response;
        })
        .catch(async () => {
          // Try cache
          const cached = await caches.match(request);
          if (cached) return cached;

          // Fallback to homepage
          const fallback = await caches.match("/");
          if (fallback) return fallback;

          // Offline page
          return caches.match(OFFLINE_URL);
        })
    );
    return;
  }

  // Handle static assets (Cache-first)
  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) return cached;

      return fetch(request)
        .then((response) => {
          // Only cache valid responses
          if (!response || response.status !== 200) {
            return response;
          }

          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(request, clone);
          });

          return response;
        })
        .catch(() => {
          // If asset fails, just fail silently
          return new Response("", { status: 408 });
        });
    })
  );
});