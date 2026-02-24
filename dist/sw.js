const CACHE_NAME = 'radio-pro-cache-v2';
const STATIC_ASSETS = [
    '/',
    '/index.html',
    '/manifest.json',
    '/pwa-192x192.png',
    '/pwa-512x512.png',
    '/tv-lite.html',
    '/stations.json'
];

// Instalar y cachear activos estáticos iniciales
self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME).then(cache => {
            console.log('[SW] Instalando activos estáticos');
            return Promise.allSettled(STATIC_ASSETS.map(url => cache.add(url)));
        })
    );
    self.skipWaiting();
});

// Limpieza de cachés antiguos
self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys().then(keys => Promise.all(
            keys.map(key => {
                if (key !== CACHE_NAME) {
                    console.log('[SW] Borrando caché antiguo:', key);
                    return caches.delete(key);
                }
            })
        ))
    );
    self.clients.claim();
});

// Estrategia: Stale-While-Revalidate para activos de la App
self.addEventListener('fetch', event => {
    const { request } = event;
    const url = new URL(request.url);

    // Ignorar peticiones externas no deseadas o de streaming
    if (url.origin !== self.location.origin) {
        // Permitir streaming sin cachear
        if (url.pathname.endsWith('.m3u8') || url.pathname.endsWith('.ts')) return;
        return;
    }

    // Ignorar Socket.io y extensiones
    if (url.pathname.includes('socket.io') || url.protocol === 'chrome-extension:') return;

    event.respondWith(
        caches.open(CACHE_NAME).then(cache => {
            return cache.match(request).then(response => {
                const fetchPromise = fetch(request).then(networkResponse => {
                    // Si la respuesta es válida y es un asset o página, guardarla/actualizarla en caché
                    if (networkResponse.ok && (
                        url.pathname.startsWith('/assets/') ||
                        STATIC_ASSETS.includes(url.pathname) ||
                        url.pathname.endsWith('.js') ||
                        url.pathname.endsWith('.css')
                    )) {
                        cache.put(request, networkResponse.clone());
                    }
                    return networkResponse;
                }).catch(() => {
                    // Fallback para navegación si falla la red y no hay caché
                    if (request.mode === 'navigate') {
                        return cache.match('/index.html');
                    }
                });

                // Devolver caché de inmediato si existe, sino esperar a la red
                return response || fetchPromise;
            });
        })
    );
});
