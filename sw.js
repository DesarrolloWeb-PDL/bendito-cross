const CACHE_NAME = 'bendito-cross-v2';
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
  '/sw-register.js',
  '/manifest.json',
  '/img/logo-bendito.png',
  '/img/benditocross.png',
  '/img/favicon.ico'
];

// Instalar el service worker inmediatamente
self.addEventListener('install', event => {
  console.log('Service Worker: Instalando nueva versión...');
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(urlsToCache).catch(err => {
        console.warn('Error cacheando recursos:', err);
      });
    }).then(() => {
      console.log('Service Worker: Instalación completada');
    })
  );
  // Forzar activación inmediata sin esperar
  self.skipWaiting();
});

// Limpiar caches antiguos y tomar control inmediato
self.addEventListener('activate', event => {
  console.log('Service Worker: Activando nueva versión...');
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            console.log('Service Worker: Eliminando caché antigua:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      console.log('Service Worker: Activación completada');
      // Recargar todas las páginas abiertas con la nueva versión
      return self.clients.matchAll().then(clients => {
        clients.forEach(client => {
          client.postMessage({ type: 'RELOAD' });
        });
      });
    })
  );
  // Tomar control de todas las páginas inmediatamente
  return self.clients.claim();
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
