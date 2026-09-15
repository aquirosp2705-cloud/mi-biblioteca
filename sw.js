/* Hace que la biblioteca funcione sin internet.
 *
 * Dos comportamientos distintos a propósito:
 *  - Los libros (libros/*.txt) nunca cambian: se sirven de lo guardado, al instante.
 *  - La app (html, js, css, catálogos) se pide primero a internet, para que las
 *    mejoras lleguen siempre; si no hay conexión, se usa lo guardado.
 */
const VERSION = 'biblioteca-v2';
const BASE = new URL('./', self.location).pathname;
const ESENCIALES = [
  BASE, BASE + 'index.html', BASE + 'app.js', BASE + 'estilo.css',
  BASE + 'catalogo.json', BASE + 'modernos.json', BASE + 'abiertos.json',
  BASE + 'icono.png', BASE + 'manifest.json',
];

self.addEventListener('install', ev => {
  ev.waitUntil(
    caches.open(VERSION)
      .then(c => Promise.allSettled(ESENCIALES.map(u => c.add(u))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', ev => {
  ev.waitUntil(
    caches.keys()
      .then(ks => Promise.all(ks.filter(k => k !== VERSION).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', ev => {
  const req = ev.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;      // portadas y demás: no tocar

  const esLibro = url.pathname.startsWith(BASE + 'libros/');

  ev.respondWith((async () => {
    const cache = await caches.open(VERSION);

    // --- un libro: ya guardado, se devuelve tal cual ---
    if (esLibro) {
      const guardado = await cache.match(req, { ignoreSearch: true });
      if (guardado) return guardado;
      try {
        const r = await fetch(req);
        if (r && r.ok) cache.put(req, r.clone());
        return r;
      } catch (e) {
        return new Response('Sin conexión', { status: 503 });
      }
    }

    // --- la app: primero internet, para no quedarse con una versión vieja ---
    try {
      const r = await fetch(req);
      if (r && r.ok) cache.put(req, r.clone());
      return r;
    } catch (e) {
      const guardado = await cache.match(req, { ignoreSearch: true });
      if (guardado) return guardado;
      if (req.mode === 'navigate') {
        const inicio = await cache.match(BASE + 'index.html');
        if (inicio) return inicio;
      }
      return new Response('Sin conexión', { status: 503, statusText: 'Sin conexión' });
    }
  })());
});
