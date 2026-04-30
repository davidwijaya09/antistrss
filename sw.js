const CACHE_NAME = "napas-v2";
const ASSETS = [
  "/index.html",
  "/style.css",
  "/app.js",
  "/favicon.svg",
  "/manifest.json",
  "/data/mood-responses.json",
  "/data/quotes.json",
  "/data/micro-steps.json",
  "/data/motivasi.json",
  "/data/percintaan.json",
  "/data/masa-depan.json"
];

// Install — cache core assets
self.addEventListener("install", (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS))
  );
  self.skipWaiting();
});

// Activate — clean old caches
self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Fetch — cache-first, fallback to network
self.addEventListener("fetch", (e) => {
  // Skip non-GET and external requests
  if (e.request.method !== "GET") return;

  e.respondWith(
    caches.match(e.request).then((cached) => {
      if (cached) return cached;
      return fetch(e.request).then((response) => {
        // Cache successful responses
        if (response.ok && response.type === "basic") {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(e.request, clone));
        }
        return response;
      }).catch(() => {
        // Offline fallback for navigation
        if (e.request.mode === "navigate") {
          return caches.match("/index.html");
        }
      });
    })
  );
});
