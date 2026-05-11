// sw.js - Service Worker for PWA
const CACHE_NAME = 'patrol-system-v1';
const STATIC_CACHE = 'patrol-static-v1';
const DYNAMIC_CACHE = 'patrol-dynamic-v1';

// Files to cache immediately
const STATIC_FILES = [
  '/',
  '/index.html',
  '/login.html',
  '/inspector-mobile.html',
  '/admin-dashboard.html',
  '/firebase-config.js',
  '/qr-generator.js',
  '/qr-scanner.js',
  '/cloudinary-uploader.js',
  '/inspection-recorder.js',
  '/inspector-app.js',
  '/admin-dashboard.js'
];

// Install event - cache static files
self.addEventListener('install', (event) => {
  console.log('[SW] Installing...');
  
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then((cache) => {
        console.log('[SW] Caching static files');
        return cache.addAll(STATIC_FILES);
      })
      .then(() => self.skipWaiting())
      .catch((error) => {
        console.error('[SW] Install failed:', error);
      })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating...');
  
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames
            .filter((name) => {
              return name !== STATIC_CACHE && name !== DYNAMIC_CACHE;
            })
            .map((name) => {
              console.log('[SW] Deleting old cache:', name);
              return caches.delete(name);
            })
        );
      })
      .then(() => self.clients.claim())
  );
});

// Fetch event - serve from cache, fallback to network
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);
  
  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }
  
  // Skip Firebase and Cloudinary API calls
  if (
    url.origin.includes('firebaseio.com') ||
    url.origin.includes('cloudinary.com') ||
    url.origin.includes('googleapis.com')
  ) {
    return;
  }
  
  // Cache strategy
  event.respondWith(
    caches.match(request)
      .then((cachedResponse) => {
        if (cachedResponse) {
          // Return cached version
          console.log('[SW] Serving from cache:', request.url);
          return cachedResponse;
        }
        
        // Fetch from network
        return fetch(request)
          .then((networkResponse) => {
            // Cache dynamic content
            if (
              request.url.includes('.js') ||
              request.url.includes('.css') ||
              request.url.includes('.html')
            ) {
              return caches.open(DYNAMIC_CACHE)
                .then((cache) => {
                  cache.put(request, networkResponse.clone());
                  return networkResponse;
                });
            }
            
            return networkResponse;
          })
          .catch((error) => {
            console.error('[SW] Fetch failed:', error);
            
            // Return offline page if available
            if (request.destination === 'document') {
              return caches.match('/index.html');
            }
          });
      })
  );
});

// Background sync (for offline support)
self.addEventListener('sync', (event) => {
  console.log('[SW] Background sync:', event.tag);
  
  if (event.tag === 'sync-inspections') {
    event.waitUntil(syncInspections());
  }
});

// Push notification
self.addEventListener('push', (event) => {
  console.log('[SW] Push received');
  
  const data = event.data ? event.data.json() : {};
  const title = data.title || 'Patrol System';
  const options = {
    body: data.body || 'มีการแจ้งเตือนใหม่',
    icon: '/icon-192.png',
    badge: '/badge-72.png',
    vibrate: [200, 100, 200],
    data: data
  };
  
  event.waitUntil(
    self.registration.showNotification(title, options)
  );
});

// Notification click
self.addEventListener('notificationclick', (event) => {
  console.log('[SW] Notification clicked');
  
  event.notification.close();
  
  event.waitUntil(
    clients.openWindow(event.notification.data.url || '/')
  );
});

// Helper: Sync inspections
async function syncInspections() {
  // Placeholder for offline sync logic
  console.log('[SW] Syncing inspections...');
  
  // TODO: Implement actual sync with IndexedDB
  return Promise.resolve();
}
