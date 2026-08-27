// Service Worker para PWA de ComunApp
const CACHE_NAME = 'comunapp-v1';
const urlsToCache = [
  '/',
  '/#/entrar',
  '/manifest.json'
];

// Instalación del Service Worker
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Archivos cacheados');
        return cache.addAll(urlsToCache);
      })
      .catch(err => {
        console.log('Error al cachear:', err);
      })
  );
});

// Activación y limpieza de cachés antiguos
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            console.log('Eliminando caché antiguo:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});

// Interceptación de solicitudes - Estrategia: Network First, fallback a Cache
self.addEventListener('fetch', event => {
  // Solo interceptar solicitudes del mismo origen
  if (!event.request.url.startsWith(self.location.origin)) {
    return;
  }

  event.respondWith(
    caches.match(event.request)
      .then(cachedResponse => {
        if (cachedResponse) {
          // Devolver respuesta cacheada mientras se actualiza en segundo plano
          return cachedResponse;
        }
        
        // Si no está en caché, intentar obtener de la red
        return fetch(event.request).then(response => {
          // No cachear respuestas con errores o que no sean GET
          if (!response || response.status !== 200 || event.request.method !== 'GET') {
            return response;
          }
          
          // Clonar la respuesta para guardarla en caché
          const responseToCache = response.clone();
          caches.open(CACHE_NAME)
            .then(cache => {
              cache.put(event.request, responseToCache);
            });
          
          return response;
        }).catch(() => {
          // Fallback offline para navegación
          if (event.request.mode === 'navigate') {
            return caches.match('/#/entrar');
          }
        });
      })
  );
});

// Notificación de actualización disponible
self.addEventListener('updatefound', event => {
  const newWorker = self.registration.installing;
  newWorker.addEventListener('statechange', () => {
    if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
      // Nueva versión disponible
      self.clients.matchAll().then(clients => {
        clients.forEach(client => {
          client.postMessage({ type: 'UPDATE_AVAILABLE' });
        });
      });
    }
  });
});
