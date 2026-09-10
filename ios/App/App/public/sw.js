const CACHE_NAME = 'epj-entregador-v4';
const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/manifest.json',
  '/logo.png',
  '/favicon.ico'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS_TO_CACHE).catch(() => {}))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('message', (event) => {
  if (event.data === 'SKIP_WAITING') self.skipWaiting();
});

self.addEventListener('fetch', (event) => {
  const req = event.request;

  // Only handle GET requests
  if (req.method !== 'GET') return;

  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  // Skip Supabase, API, and auth callback routes
  if (url.hostname.includes('supabase.co')) return;
  if (url.pathname.startsWith('/~oauth')) return;
  if (url.pathname.startsWith('/api')) return;

  const isNavigationOrSpaRoute =
    req.mode === 'navigate' ||
    (req.headers.get('accept') && req.headers.get('accept').includes('text/html')) ||
    (!url.pathname.split('/').pop().includes('.') && !url.pathname.startsWith('/api'));

  // SPA navigation fallback: always serve index.html for navigation / SPA page routes
  if (isNavigationOrSpaRoute) {
    event.respondWith(
      fetch(req).catch(async () => {
        const cachedIndex = await caches.match('/index.html');
        if (cachedIndex) return cachedIndex;
        const cachedRoot = await caches.match('/');
        if (cachedRoot) return cachedRoot;
        return new Response('<!DOCTYPE html><html><head><meta charset="utf-8"><title>É Pra Já - Entregador</title></head><body><script>window.location.reload();</script></body></html>', {
          headers: { 'Content-Type': 'text/html' }
        });
      })
    );
    return;
  }

  // Cache-first for static assets, with safe network fallback (never throw Response.error)
  event.respondWith(
    caches.match(req).then((cached) => {
      if (cached) return cached;
      return fetch(req)
        .then((res) => {
          if (res && res.status === 200 && res.type === 'basic') {
            const resClone = res.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(req, resClone)).catch(() => {});
          }
          return res;
        })
        .catch(async () => {
          const fallback = await caches.match(req);
          if (fallback) return fallback;
          return new Response('', { status: 504, statusText: 'Gateway Timeout' });
        });
    })
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: 'window' }).then((clientList) => {
      if (clientList.length > 0) return clientList[0].focus();
      return clients.openWindow('/');
    })
  );
});
