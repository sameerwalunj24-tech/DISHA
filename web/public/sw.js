// Disha PWA Offline Service Worker
const CACHE_NAME = "disha-app-shell-v1";
const STATIC_ASSETS = [
  "/",
  "/index.html",
  "/manifest.webmanifest",
  "/icons/icon-192.png",
  "/icons/icon-512.png"
];

// Install Event - Pre-cache core app shell
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log("[Service Worker] Pre-caching App Shell...");
      return cache.addAll(STATIC_ASSETS);
    }).then(() => self.skipWaiting())
  );
});

// Activate Event - Clean up stale caches
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keyList) => {
      return Promise.all(
        keyList.map((key) => {
          if (key !== CACHE_NAME) {
            console.log("[Service Worker] Removing old cache:", key);
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch Event - Stale-while-revalidate for assets, cache fallback for navigation
self.addEventListener("fetch", (event) => {
  const request = event.request;

  // Handle navigation requests (loading pages/routes)
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((networkResponse) => {
          // Update cache with fresh version
          const clone = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put("/", clone));
          return networkResponse;
        })
        .catch(async () => {
          // Offline fallback - serve cached index.html
          const cachedResponse = await caches.match("/");
          return cachedResponse || caches.match("/index.html");
        })
    );
    return;
  }

  // Handle static assets & scripts
  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      if (cachedResponse) {
        // Return cached immediately, fetch in background to refresh cache
        fetch(request)
          .then((networkResponse) => {
            if (networkResponse && networkResponse.status === 200) {
              const clone = networkResponse.clone();
              caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
            }
          })
          .catch(() => {
            // Network failure is fine since cachedResponse is returned
          });
        return cachedResponse;
      }

      // Not in cache, fetch from network and store
      return fetch(request)
        .then((networkResponse) => {
          if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== "basic") {
            return networkResponse;
          }
          const clone = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          return networkResponse;
        })
        .catch(() => {
          // If offline and request is an image or document, handle gracefully
          return new Response("Offline", { status: 503, statusText: "Offline" });
        });
    })
  );
});
