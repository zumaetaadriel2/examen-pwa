/**
 * Service Worker - QuizMaster PWA
 * Estrategia de caché para funcionamiento offline e instalación
 */

const CACHE_NAME = 'quizmaster-pwa-v4';

// Recursos críticos necesarios para ejecutar la aplicación sin conexión
const STATIC_ASSETS = [
  './',
  './index.html',
  './styles.css',
  './app.js',
  './preguntas.json',
  './manifest.json',
  './icons/favicon.svg',
  './icons/icon-192.svg',
  './icons/icon-512.svg'
];

// 1. Evento Install: Pre-almacenamiento en caché de la Shell de la aplicación
self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[SW] Pre-caching recursos esenciales');
      return cache.addAll(STATIC_ASSETS);
    })
  );
});

// 2. Evento Activate: Limpieza de versiones antiguas de caché y control de clientes
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME) {
            console.log('[SW] Eliminando caché obsoleta:', cache);
            return caches.delete(cache);
          }
        })
      );
    }).then(() => {
      return self.clients.claim();
    })
  );
});

// 3. Evento Fetch: Estrategia Network-First para desarrollo (siempre fresco si hay red, fallback a caché offline)
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET' || !event.request.url.startsWith('http')) {
    return;
  }

  // Las peticiones al API no deben cachearse con fallback estático
  if (event.request.url.includes('/api/')) {
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then((networkResponse) => {
        if (
          networkResponse &&
          networkResponse.status === 200 &&
          event.request.url.startsWith(self.location.origin)
        ) {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
        }
        return networkResponse;
      })
      .catch(() => {
        // Modo offline: devolver desde caché
        return caches.match(event.request).then((cachedResponse) => {
          if (cachedResponse) {
            return cachedResponse;
          }
          if (event.request.mode === 'navigate') {
            return caches.match('./index.html');
          }
        });
      })
  );
});
