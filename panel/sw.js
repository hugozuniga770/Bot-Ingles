/* panel/sw.js — el panel abre aunque no haya internet (NUEVO v21.18, idea 66).
   Guarda SOLO los archivos del panel (nunca lo que viene de api.github.com: tus datos no se guardan aquí).
   Primero intenta la red (así siempre tienes la versión nueva); si no hay, usa la copia. */
'use strict';
const C = 'edpanel-v21.18';
const F = ['./', 'index.html', 'app.js', 'cripto.js', 'estilo.css', 'nacl-fast.min.js', 'icono.svg', 'manifest.webmanifest'];
self.addEventListener('install', e => { e.waitUntil(caches.open(C).then(c => c.addAll(F)).then(() => self.skipWaiting())); });
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== C).map(k => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', e => {
  const u = new URL(e.request.url);
  if (e.request.method !== 'GET' || u.origin !== self.location.origin) return;
  e.respondWith(fetch(e.request).then(r => { const copia = r.clone(); caches.open(C).then(c => c.put(e.request, copia)); return r; })
    .catch(() => caches.match(e.request).then(r => r || caches.match('index.html'))));
});
