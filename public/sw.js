/* Ekran Yönlendirme service worker — cache app shell + media */
const CACHE = "ekran-yonlendirme-v2";
const PRECACHE = ["/", "/offline", "/manifest.webmanifest"];

function isSensitivePath(pathname) {
  return pathname.startsWith("/admin") || pathname.startsWith("/api");
}

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(PRECACHE).catch(() => undefined)),
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))),
    ),
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;

  const url = new URL(req.url);

  if (url.origin === self.location.origin && isSensitivePath(url.pathname)) {
    return;
  }

  // Cache-first for Supabase storage media
  if (url.hostname.includes("supabase.co") && url.pathname.includes("/storage/")) {
    event.respondWith(
      caches.open(CACHE).then(async (cache) => {
        const hit = await cache.match(req);
        if (hit) return hit;
        try {
          const res = await fetch(req);
          if (res.ok) cache.put(req, res.clone());
          return res;
        } catch {
          return hit || Response.error();
        }
      }),
    );
    return;
  }

  // Network-first for same-origin navigations / assets
  if (url.origin === self.location.origin) {
    event.respondWith(
      fetch(req)
        .then(async (res) => {
          const finalUrl = new URL(res.url);
          if (!isSensitivePath(finalUrl.pathname) && res.ok && res.type === "basic") {
            const cache = await caches.open(CACHE);
            cache.put(req, res.clone());
          }
          return res;
        })
        .catch(async () => {
          const hit = await caches.match(req);
          if (hit) return hit;
          if (req.mode === "navigate") {
            return (await caches.match("/offline")) || Response.error();
          }
          return Response.error();
        }),
    );
  }
});
