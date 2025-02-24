const CACHE_VERSION = '1.0.1'; // Increment this for each deployment
const CACHE_NAME = `badminton-queue-${CACHE_VERSION}`;

// Add timestamp to cache name for Safari
const TIMESTAMP = new Date().getTime();
const RUNTIME_CACHE = `runtime-${CACHE_VERSION}-${TIMESTAMP}`;

const ASSETS_TO_CACHE = [
    '/',
    '/index.html',
    '/styles.css',
    '/app.js',
    '/manifest.json',
    '/icons/icon.svg',
    '/icons/icon-192x192.png',
    '/icons/icon-512x512.png',
    'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css',
    '/offline.html'
];

// Install service worker and cache assets
self.addEventListener('install', (event) => {
    event.waitUntil(
        Promise.all([
            // Clear all caches first
            caches.keys().then(cacheNames => {
                return Promise.all(
                    cacheNames.map(cache => caches.delete(cache))
                );
            }),
            // Then cache new assets
            caches.open(CACHE_NAME).then((cache) => {
                console.log('Caching app shell');
                return cache.addAll(ASSETS_TO_CACHE.map(url => {
                    // Add cache-busting query parameter
                    return `${url}${url.includes('?') ? '&' : '?'}v=${CACHE_VERSION}-${TIMESTAMP}`;
                }));
            })
        ])
    );
    self.skipWaiting();
});

// Activate and clean up old caches
self.addEventListener('activate', (event) => {
    event.waitUntil(
        Promise.all([
            // Clear old caches
            caches.keys().then(cacheNames => {
                return Promise.all(
                    cacheNames
                        .filter(name => name.startsWith('badminton-queue-') && name !== CACHE_NAME)
                        .map(name => caches.delete(name))
                );
            }),
            // Clear Safari's aggressive cache
            fetch('clear-site-data', {
                headers: {
                    'Clear-Site-Data': '"cache", "storage"'
                }
            }).catch(() => {}), // Ignore if not supported
            self.clients.claim()
        ])
    );
});

// Enhanced fetch handler with network-first strategy for API calls
self.addEventListener('fetch', (event) => {
    // Add version to all requests
    const url = new URL(event.request.url);
    if (!url.pathname.startsWith('/api/')) {
        url.searchParams.set('v', CACHE_VERSION + '-' + TIMESTAMP);
    }

    event.respondWith(
        fetch(event.request)
            .then(response => {
                // Clone the response
                const responseToCache = response.clone();

                // Update cache
                caches.open(RUNTIME_CACHE).then(cache => {
                    cache.put(event.request, responseToCache);
                });

                return response;
            })
            .catch(() => {
                return caches.match(event.request);
            })
    );
}); 