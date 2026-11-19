// Kinetic — hors ligne : les fichiers de l'appli sont gardés en cache après la première visite
const CACHE = 'kinetic-v1';
const CORE = ['./', 'index.html', 'css/style.css', 'js/app.js', 'js/avatar.js', 'js/store.js', 'js/data.js', 'vendor/three.module.min.js', 'vendor/RoomEnvironment.js', 'assets/body.json', 'assets/body.data.json', 'assets/catalog.json', 'assets/proxies.json', 'manifest.json', 'icons/icon-192.png'];
self.addEventListener('install', (e) => { e.waitUntil(caches.open(CACHE).then((c) => c.addAll(CORE)).then(() => self.skipWaiting())); });
self.addEventListener('activate', (e) => { e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  const isPage = req.mode === 'navigate';
  if (isPage) { e.respondWith(fetch(req).then((r) => { caches.open(CACHE).then((c) => c.put(req, r.clone())); return r; }).catch(() => caches.match('index.html'))); return; }
  e.respondWith(caches.match(req).then((hit) => hit || fetch(req).then((r) => {
    if (r.ok && (url.origin === location.origin || url.hostname.endsWith('gstatic.com') || url.hostname.endsWith('googleapis.com'))) { const copy = r.clone(); caches.open(CACHE).then((c) => c.put(req, copy)); }
    return r;
  })));
});
