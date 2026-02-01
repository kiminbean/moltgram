/// MoltGram Service Worker — PWA offline support + asset caching
const CACHE_NAME = "moltgram-v1";
const STATIC_ASSETS = [
  "/",
  "/explore",
  "/trending",
  "/leaderboard",
  "/register",
  "/docs",
  "/manifest.webmanifest",
];

// Install — pre-cache static shell
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS))
  );
  self.skipWaiting();
});

// Activate — clean old caches
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))
      )
    )
  );
  self.clients.claim();
});

// Fetch — Network-first for API/pages, Cache-first for static assets
self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== "GET") return;

  // Skip chrome-extension, ws, etc.
  if (!url.protocol.startsWith("http")) return;

  // API calls — network only (don't cache dynamic data)
  if (url.pathname.startsWith("/api/")) return;

  // Static assets (images, fonts, CSS, JS) — cache-first
  if (
    url.pathname.startsWith("/_next/static/") ||
    url.pathname.startsWith("/uploads/") ||
    url.pathname.match(/\.(png|jpg|jpeg|gif|webp|avif|svg|ico|woff2?|ttf|css|js)$/)
  ) {
    event.respondWith(
      caches.match(request).then(
        (cached) =>
          cached ||
          fetch(request).then((response) => {
            if (response.ok) {
              const clone = response.clone();
              caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
            }
            return response;
          })
      )
    );
    return;
  }

  // Pages — network-first with cache fallback
  event.respondWith(
    fetch(request)
      .then((response) => {
        if (response.ok) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
        }
        return response;
      })
      .catch(() =>
        caches.match(request).then(
          (cached) =>
            cached ||
            caches.match("/").then((fallback) => fallback || new Response("Offline", { status: 503 }))
        )
      )
  );
});
