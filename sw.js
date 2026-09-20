// OsakaGo Service Worker Cleaner (Forces cache wipe & unregisters SW)
self.addEventListener('install', (e) => {
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((names) => {
      return Promise.all(names.map((n) => {
        console.log('Clearing cache:', n);
        return caches.delete(n);
      }));
    }).then(() => {
      return self.clients.claim();
    }).then(() => {
      return self.registration.unregister();
    })
  );
});

self.addEventListener('fetch', (e) => {
  e.respondWith(fetch(e.request));
});
