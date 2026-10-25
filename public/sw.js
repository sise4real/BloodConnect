const CACHE_NAME = 'blood-donation-v2';
const APP_SHELL = ['/', '/index.html', '/manifest.json'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  const requestUrl = new URL(request.url);

  // Leave cross-origin services (such as OpenStreetMap tiles), non-GET
  // requests, and API data out of the app-shell cache strategy.
  if (
    request.method !== 'GET' ||
    requestUrl.origin !== self.location.origin ||
    requestUrl.pathname === '/api' ||
    requestUrl.pathname.startsWith('/api/')
  ) {
    return;
  }

  event.respondWith((async () => {
    const cache = await caches.open(CACHE_NAME);
    const cachedResponse = await cache.match(request);

    try {
      const networkResponse = await fetch(request);

      if (networkResponse.ok && networkResponse.type === 'basic') {
        await cache.put(request, networkResponse.clone());
      }

      return networkResponse;
    } catch {
      if (cachedResponse) return cachedResponse;

      if (request.mode === 'navigate') {
        const cachedAppShell = await cache.match('/index.html');
        if (cachedAppShell) return cachedAppShell;
      }

      return new Response('This resource is unavailable offline.', {
        status: 503,
        statusText: 'Service Unavailable',
        headers: { 'Content-Type': 'text/plain; charset=utf-8' },
      });
    }
  })());
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => Promise.all(
        cacheNames
          .filter((cacheName) => cacheName.startsWith('blood-donation-') && cacheName !== CACHE_NAME)
          .map((cacheName) => caches.delete(cacheName))
      ))
      .then(() => self.clients.claim())
  );
});
