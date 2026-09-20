// OsakaGo PWA Service Worker v5.0 (Force Fresh)
const CACHE_NAME = 'osakago-v5.0-fresh';
const ASSETS_TO_CACHE = [
  './manifest.json',
  './icon-192.png',
  './icon-512.png',
  './apple-touch-icon.png'
];

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            console.log('Deleting old SW cache:', key);
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  // HTML, JS, CSS는 항상 최신 네트워크 데이터를 우선 가져오고 캐시 무효화 보장
  event.respondWith(
    fetch(event.request, { cache: 'no-cache' }).catch(() => {
      return caches.match(event.request);
    })
  );
});
