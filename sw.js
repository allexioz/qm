const CACHE_NAME = 'queue-manager-v1';
const ASSETS_TO_CACHE = [
    '/',
    '/index.html',
    '/styles.css',
    '/app.js',
    '/manifest.json',
    '/icons/icon.svg',
    '/icons/icon-192x192.png',
    '/icons/icon-512x512.png',
    'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css'
];

// Install service worker and cache assets
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => cache.addAll(ASSETS_TO_CACHE))
    );
    self.skipWaiting(); // Ensure new service worker takes over immediately
});

// Activate and clean up old caches
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
        }).then(() => {
            clients.claim(); // Take control of all open pages
        })
    );
});

// Enhanced fetch handler with network-first strategy for API calls
self.addEventListener('fetch', (event) => {
    // Network-first strategy for API calls and dynamic content
    if (event.request.url.includes('/api/') || event.request.method !== 'GET') {
        event.respondWith(
            fetch(event.request)
                .catch(() => caches.match(event.request))
        );
        return;
    }

    // Cache-first strategy for static assets
    event.respondWith(
        caches.match(event.request)
            .then((response) => {
                if (response) {
                    return response; // Return cached version
                }
                return fetch(event.request)
                    .then((response) => {
                        // Cache new resources as they're fetched
                        if (response && response.status === 200 && response.type === 'basic') {
                            const responseToCache = response.clone();
                            caches.open(CACHE_NAME)
                                .then((cache) => {
                                    cache.put(event.request, responseToCache);
                                });
                        }
                        return response;
                    });
            })
    );
}); 