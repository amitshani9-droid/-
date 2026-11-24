// Offline support: network-first for pages, cache-first for hashed assets. Bump VERSION on breaking changes.
const VERSION = "g4f-v1";
self.addEventListener("install", e => { e.waitUntil(caches.open(VERSION).then(c => c.addAll(["./", "./index.html", "./manifest.webmanifest", "./icon-192.png"]))); self.skipWaiting(); });
self.addEventListener("activate", e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== VERSION).map(k => caches.delete(k))))); self.clients.claim(); });
self.addEventListener("fetch", e => {
  const req = e.request;
  if (req.method !== "GET" || new URL(req.url).pathname.includes("/api/")) return;
  const hashed = new URL(req.url).pathname.includes("/assets/"); // Vite names assets with a content hash
  e.respondWith(hashed
    ? caches.match(req).then(hit => hit || fetch(req).then(r => { const c = r.clone(); caches.open(VERSION).then(x => x.put(req, c)); return r; }))
    : fetch(req).then(r => { if (r.ok) { const c = r.clone(); caches.open(VERSION).then(x => x.put(req, c)); } return r; }).catch(() => caches.match(req, { ignoreSearch: true }).then(h => h || caches.match("./index.html"))));
});
