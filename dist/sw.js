// Service Worker para PWA de ComunApp
// v2: se cambió la estrategia a Network First y se eliminó el pre-cache de
// '/' e '/#/entrar'. Motivo (bug histórico): con cache-first, si el servidor
// respondía index.html (text/html) en una URL de asset (/assets/*.js), esa
// respuesta "envenenada" quedaba guardada en la caché y el error MIME
// persistía incluso después de arreglar el servidor. Con esta versión:
//  - los assets con hash (/assets/*-XXXX.js) son inmutables: se cachean pero
//    SIEMPRE se valida primero que el Content-Type sea el correcto;
//  - cualquier otra respuesta HTML solo se usa como fallback de navegación,
//    nunca se cachea bajo la URL de un .js/.css.
const CACHE_NAME = 'comunapp-v2';
const urlsToCache = [
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

  const url = new URL(event.request.url);
  const isAsset = /^\/assets\//.test(url.pathname); // bundles con hash: inmutables
  const isNavigation = event.request.mode === 'navigate';

  // Assets estaticos (.js/.css con hash): primero red; solo se cachea si el
  // Content-Type es el esperado (nunca guardar HTML bajo una URL de asset).
  event.respondWith(
    fetch(event.request)
      .then(response => {
        const contentType = response.headers.get('Content-Type') || '';
        const looksLikeHtml = contentType.includes('text/html');

        // Respuesta valida para cachear: GET, 200 y (si es asset) NO-HTML.
        if (
          response.ok &&
          event.request.method === 'GET' &&
          !(isAsset && looksLikeHtml)
        ) {
          const responseToCache = response.clone();
          caches.open(CACHE_NAME).then(cache => {
            cache.put(event.request, responseToCache);
          });
        }

        // Si un asset llegara como HTML (config rota), no servirlo: 404 limpio
        // para que el navegador intente de nuevo en el proximo deploy.
        if (isAsset && looksLikeHtml) {
          return new Response('Recurso no disponible', {
            status: 404,
            headers: { 'Content-Type': 'text/plain; charset=utf-8' },
          });
        }

        return response;
      })
      .catch(() => {
        // Offline: intentar desde la caché
        return caches.match(event.request).then(cachedResponse => {
          if (cachedResponse) {
            return cachedResponse;
          }
          // Fallback offline SOLO para navegación (HTML nunca reemplaza un asset)
          if (isNavigation) {
            return caches.match('/manifest.json') || Response.error();
          }
          return new Response('Sin conexión', {
            status: 503,
            headers: { 'Content-Type': 'text/plain; charset=utf-8' },
          });
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
