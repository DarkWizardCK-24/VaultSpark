/* VaultSpark service worker: caches the app shell so it opens offline.
   It never caches API/Firestore traffic or URLs with query strings; Firestore keeps its own encrypted offline cache. */
const CACHE = "vaultspark-shell-v2";
const SHELL = ["/", "/login", "/vault", "/icons/icon-192.png"];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL).catch(() => {})).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()),
  );
});

const putIfOk = (req, res) => {
  if (res && res.ok && res.type === "basic") {
    const copy = res.clone();
    caches.open(CACHE).then((c) => c.put(req, copy));
  }
  return res;
};

self.addEventListener("fetch", (e) => {
  const req = e.request;
  const url = new URL(req.url);
  if (req.method !== "GET" || url.origin !== self.location.origin || url.search) return;

  // Static build assets & icons: cache-first (content-hashed). Only successful responses are stored.
  if (url.pathname.startsWith("/_next/static/") || url.pathname.startsWith("/icons/") || url.pathname === "/logo.svg") {
    e.respondWith(caches.match(req).then((hit) => hit || fetch(req).then((res) => putIfOk(req, res))));
    return;
  }

  // Pages: network-first, fall back to the cached shell when offline.
  if (req.mode === "navigate") {
    e.respondWith(
      fetch(req)
        .then((res) => putIfOk(req, res))
        .catch(() => caches.match(req).then((hit) => hit || caches.match("/vault") || caches.match("/"))),
    );
  }
});
