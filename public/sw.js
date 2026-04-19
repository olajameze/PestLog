// Enhanced Service Worker for Pest Trace with Background Sync
const CACHE_NAME = 'pesttrace-v3';
const urlsToCache = [
  '/',
  '/offline.html',
  '/_offline',
  '/manifest.json',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(urlsToCache);
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;

  event.respondWith(
    fetch(event.request).then((response) => {
      if (!response || response.status !== 200 || response.type === 'error') {
        return response;
      }
      const responseToCache = response.clone();
      caches.open(CACHE_NAME).then((cache) => {
        cache.put(event.request, responseToCache);
      });
      return response;
    }).catch(() => caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) return cachedResponse;
      if (event.request.mode === 'navigate') {
        return caches.match('/offline.html');
      }
      return new Response('Offline', {
        status: 503,
        statusText: 'Service Unavailable',
      });
    }))
  );
});

// Background sync for offline queue
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-offline-queue') {
    event.waitUntil(syncOfflineQueue());
  }
});

async function syncOfflineQueue() {
  try {
    const clients = await self.clients.matchAll({ type: 'window' });
    clients.forEach((client) => {
      client.postMessage({ type: 'SYNC_STARTED' });
    });

    // Trigger sync via postMessage to API or direct fetch
    const response = await fetch('/api/offline/sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ trigger: 'background-sync' }),
    });

    clients.forEach((client) => {
      client.postMessage({ type: 'SYNC_COMPLETE', success: response.ok });
    });
  } catch (error) {
    console.error('Background sync failed:', error);
  }
}

// Push notifications (existing)
self.addEventListener('push', (event) => {
  const data = event.data?.json();
  event.waitUntil(
    self.registration.showNotification(data?.title || 'Pest Trace', {
      body: data?.body || 'You have a new notification',
      icon: '/icon-192.png',
    })
  );
});
