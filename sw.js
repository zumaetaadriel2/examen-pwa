/**
 * Service Worker - QuizMaster PWA
 * Estrategia de caché para funcionamiento offline e instalación
 */

const CACHE_NAME = 'quizmaster-pwa-v2';

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
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[SW] Pre-caching recursos esenciales');
      return cache.addAll(STATIC_ASSETS);
    }).then(() => {
      return self.skipWaiting();
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

// 3. Evento Fetch: Estrategia Cache First con fallback a Red
self.addEventListener('fetch', (event) => {
  // Ignorar peticiones que no sean GET o esquemas no soportados (ej. chrome-extension)
  if (event.request.method !== 'GET' || !event.request.url.startsWith('http')) {
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      // Si el recurso ya está en caché, servirlo inmediatamente
      if (cachedResponse) {
        return cachedResponse;
      }

      // Si no está en caché, buscar en la red
      return fetch(event.request)
        .then((networkResponse) => {
          // Si la respuesta es válida y del mismo origen, guardarla en caché dinámicamente
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
          // Si falla la red y es una navegación HTML, servir la página principal offline
          if (event.request.mode === 'navigate') {
            return caches.match('./index.html');
          }
        });
    })
  );
});
