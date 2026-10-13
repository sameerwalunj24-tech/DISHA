// Disha PWA Offline Service Worker (Version 2)
const CACHE_NAME = "disha-app-shell-v2";
const STATIC_ASSETS = [
  "/",
  "/index.html",
  "/offline.html",
  "/manifest.webmanifest",
  "/icons/icon-192.png",
  "/icons/icon-512.png"
];

// Install Event - Pre-cache core app shell & offline fallback
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log("[Service Worker v2] Pre-caching App Shell & Offline Fallback...");
      return cache.addAll(STATIC_ASSETS);
    })
  );
});

// Activate Event - Clean up stale caches from previous versions
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

// Message listener for skipWaiting triggered by "Update Available" prompt
self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SKIP_WAITING") {
    console.log("[Service Worker] Received SKIP_WAITING signal, activating new version...");
    self.skipWaiting();
  }
});

// Fetch Event - Stale-while-revalidate for assets, cache fallback with offline.html for navigation
self.addEventListener("fetch", (event) => {
  const request = event.request;

  // Handle navigation requests (loading pages/routes)
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((networkResponse) => {
          // Update cache with fresh version
          if (networkResponse && networkResponse.status === 200) {
            const clone = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put("/", clone));
          }
          return networkResponse;
        })
        .catch(async () => {
          // Offline fallback - serve cached app shell or dedicated offline fallback page
          const cachedApp = await caches.match("/");
          if (cachedApp) return cachedApp;
          const cachedIndex = await caches.match("/index.html");
          if (cachedIndex) return cachedIndex;
          const cachedOffline = await caches.match("/offline.html");
          return cachedOffline || new Response("Offline", { status: 503, statusText: "Offline" });
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
            // Background update failed due to offline; cachedResponse served successfully
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
