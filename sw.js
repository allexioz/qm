const CACHE_VERSION = '1.0.1';
const BUILD_TIME = new Date().getTime();
const CACHE_NAME = `badminton-queue-${CACHE_VERSION}-${BUILD_TIME}`;

// Add cache-busting query parameter to all cached URLs
function addCacheBuster(url) {
    const bustedUrl = new URL(url, self.location.href);
    bustedUrl.searchParams.set('v', `${CACHE_VERSION}-${BUILD_TIME}`);
    return bustedUrl.toString();
}

// Cache assets with cache busters
const ASSETS_TO_CACHE = [
    '/',
    '/index.html',
    '/styles.css',
    '/app.js',
    '/manifest.json',
    '/version.json',
    '/icons/icon.svg',
    '/icons/icon-192x192.png',
    '/icons/icon-512x512.png',
    'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css',
    '/offline.html'
].map(url => addCacheBuster(url));

// Install service worker and cache assets
self.addEventListener('install', (event) => {
    event.waitUntil(
        Promise.all([
            // Clear all existing caches
            caches.keys().then(cacheNames => {
                return Promise.all(
                    cacheNames.map(cache => caches.delete(cache))
                );
            }),
            // Cache new assets with cache busters
            caches.open(CACHE_NAME).then(cache => {
                console.log('Caching app shell');
                return cache.addAll(ASSETS_TO_CACHE);
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
    // Add cache buster to non-API requests
    if (!event.request.url.includes('/api/')) {
        const bustUrl = addCacheBuster(event.request.url);
        event.respondWith(
            fetch(bustUrl)
                .then(response => {
                    // Clone and cache the fresh response
                    const responseToCache = response.clone();
                    caches.open(CACHE_NAME).then(cache => {
                        cache.put(event.request, responseToCache);
                    });
                    return response;
                })
                .catch(() => {
                    return caches.match(event.request);
                })
        );
    }
}); 