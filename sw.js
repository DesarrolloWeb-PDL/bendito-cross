const CACHE_NAME = 'bendito-cross-v1';
const urlsToCache = [
  '/',
  '/index.html',
  '/rm.html',
  '/fortime.html',
  '/ejercicios.html',
  '/horarios.html',
  '/diccionario.html',
  '/css/style.css',
  '/css/body.css',
  '/css/nav.css',
  '/css/modulos.css',
  '/css/videos.css',
  '/css/styles_js.css',
  '/script.js',
  '/manifest.json',
  '/img/logo-bendito.png',
  '/img/favicon.ico'
];

// Instalar el service worker
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(urlsToCache).catch(err => {
        console.warn('Error cacheando recursos:', err);
      });
    })
  );
  self.skipWaiting();
});

// Limpiar caches antiguos
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Estrategia: Network first, fall back to cache
self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') {
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then(response => {
        if (!response || response.status !== 200 || response.type === 'error') {
          return response;
        }
        
        const responseToCache = response.clone();
        caches.open(CACHE_NAME).then(cache => {
          cache.put(event.request, responseToCache);
        });
        
        return response;
      })
      .catch(() => {
        return caches.match(event.request).then(response => {
          return response || new Response('Contenido no disponible offline', {
            status: 503,
            statusText: 'Service Unavailable',
            headers: new Headers({
              'Content-Type': 'text/plain'
            })
          });
        });
      })
  );
});
