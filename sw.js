// Service Worker para VoleyPlaya AMVA - Soporte PWA y funcionamiento offline
const CACHE_NAME = 'voleyplaya-amva-v1';

const ASSETS_ESTATICOS = [
  './',
  './index.html',
  './clubes.html',
  './manifest.webmanifest',
  './css/base.css',
  './css/navbar.css',
  './css/hero.css',
  './css/busqueda.css',
  './css/stats.css',
  './css/tarjetas.css',
  './css/modal.css',
  './css/blog.css',
  './css/clubes.css',
  './css/footer.css',
  './css/responsive.css',
  './js/config.js',
  './js/api.js',
  './js/mapa.js',
  './js/filtro.js',
  './js/ui.js',
  './js/navbar.js',
  './js/ficha.js',
  './js/favoritos.js',
  './js/geolocalizacion.js',
  './js/comunidad.js',
  './js/eventos.js',
  './js/toast.js',
  './js/supabase.js',
  './js/main.js',
  './data/canchas_manuales.geojson'
];

self.addEventListener('install', (evento) => {
  evento.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_ESTATICOS).catch((err) => {
        console.warn('Algunos archivos no se pudieron precachear:', err);
      });
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (evento) => {
  evento.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', (evento) => {
  const req = evento.request;
  const url = new URL(req.url);

  // Ignorar peticiones que no sean GET o que sean hacia APIs externas (Supabase, Overpass, Open-Meteo, Tiles)
  if (req.method !== 'GET' || url.protocol === 'chrome-extension:' || url.hostname.includes('supabase.co') || url.hostname.includes('open-meteo.com')) {
    return;
  }

  // Network First con fallback a Cache para que los datos siempre estén actualizados si hay conexión
  evento.respondWith(
    fetch(req)
      .then((respuestaRed) => {
        if (respuestaRed && respuestaRed.status === 200 && respuestaRed.type === 'basic') {
          const clon = respuestaRed.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(req, clon);
          });
        }
        return respuestaRed;
      })
      .catch(() => {
        return caches.match(req).then((respuestaCache) => {
          if (respuestaCache) return respuestaCache;
          if (req.headers.get('accept')?.includes('text/html')) {
            return caches.match('./index.html');
          }
        });
      })
  );
});
