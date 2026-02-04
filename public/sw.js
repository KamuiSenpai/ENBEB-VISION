// ENBEB Vision - Service Worker
// Enables offline functionality and PWA installation

const CACHE_NAME = 'enbeb-vision-v1';
const OFFLINE_URL = '/offline.html';

// Assets to cache immediately on install
const PRECACHE_ASSETS = [
    '/',
    '/manifest.json',
    '/icons/icon.svg'
];

// Install event - cache essential assets
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            console.log('[SW] Precaching assets');
            return cache.addAll(PRECACHE_ASSETS);
        })
    );
    // Activate immediately
    self.skipWaiting();
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames
                    .filter((name) => name !== CACHE_NAME)
                    .map((name) => {
                        console.log('[SW] Deleting old cache:', name);
                        return caches.delete(name);
                    })
            );
        })
    );
    // Take control of all pages immediately
    self.clients.claim();
});

// Fetch event - Network first, fallback to cache
self.addEventListener('fetch', (event) => {
    // Skip non-GET requests
    if (event.request.method !== 'GET') return;

    // Skip non-http(s) requests (chrome-extension, etc.)
    const url = new URL(event.request.url);
    if (!url.protocol.startsWith('http')) return;

    // Skip API calls and Firebase requests (always need network)
    if (url.pathname.startsWith('/api') ||
        url.hostname.includes('firebase') ||
        url.hostname.includes('googleapis')) {
        return;
    }

    event.respondWith(
        fetch(event.request)
            .then((response) => {
                // Clone the response before caching
                const responseClone = response.clone();

                // Cache successful responses (wrapped in try-catch for unsupported schemes)
                if (response.status === 200) {
                    caches.open(CACHE_NAME).then((cache) => {
                        try {
                            cache.put(event.request, responseClone);
                        } catch (e) {
                            // Ignore cache errors for unsupported request types
                        }
                    }).catch(() => { });
                }

                return response;
            })
            .catch(() => {
                // Network failed, try cache
                return caches.match(event.request).then((cachedResponse) => {
                    if (cachedResponse) {
                        return cachedResponse;
                    }

                    // For navigation requests, show offline page
                    if (event.request.mode === 'navigate') {
                        return caches.match(OFFLINE_URL);
                    }

                    return new Response('Offline', { status: 503 });
                });
            })
    );
});

// Listen for messages from the main app
self.addEventListener('message', (event) => {
    if (event.data === 'skipWaiting') {
        self.skipWaiting();
    }
});

console.log('[SW] Service Worker loaded');
