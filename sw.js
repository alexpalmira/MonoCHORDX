/**
 * sw.js - Service Worker para MonoCHORD PWA
 * Permite que la aplicación funcione sin conexión (Offline).
 */

const CACHE_NAME = 'monochord-v1';
const ASSETS_TO_CACHE = [
  'index.html',
  'renderer.js',
  'db-browser.js',
  'style.css',
  'logo.png'
];

// Instalación: Guardamos los archivos básicos en la caché
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('SW: Cacheando assets básicos');
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
});

// Activación: Limpiamos cachés antiguas
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME) {
            console.log('SW: Eliminando caché antigua', cache);
            return caches.delete(cache);
          }
        })
      );
    })
  );
});

// Estrategia de red: Intentamos red, si falla usamos caché (Network First)
self.addEventListener('fetch', (event) => {
  event.respondWith(
    fetch(event.request).catch(() => {
      return caches.match(event.request);
    })
  );
});
