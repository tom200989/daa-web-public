const CACHE_NAME = "daa-web-v7";
const LATEST_FALLBACK_URLS = [
  "https://tom200989.github.io/daa-web-https/data/latest.json",
  "https://raw.githubusercontent.com/tom200989/daa-web-https/main/data/latest.json",
  "https://cdn.jsdelivr.net/gh/tom200989/daa-web-https@main/data/latest.json",
  "https://ghfast.top/https://raw.githubusercontent.com/tom200989/daa-web-https/main/data/latest.json"
];
const CORE = [
  "./",
  "./index.html",
  "./styles.css",
  "./data-client.js",
  "./app.js",
  "./manifest.webmanifest",
  "./data/latest.json"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => Promise.allSettled(CORE.map((item) => cache.add(item))))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))))
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  const url = new URL(event.request.url);
  if (url.pathname.endsWith("/data/latest.json")) {
    const canonical = new Request(new URL("./data/latest.json", self.registration.scope).toString());
    event.respondWith(
      fetchLatest(event.request, canonical)
    );
    return;
  }
  if (url.pathname.startsWith("/api/")) {
    event.respondWith(fetch(event.request, { cache: "no-store" }));
    return;
  }
  event.respondWith(
    fetch(event.request).then((response) => {
      const copy = response.clone();
      caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
      return response;
    }).catch(() => caches.match(event.request))
  );
});

async function fetchLatest(request, canonical) {
  const cache = await caches.open(CACHE_NAME);
  const sources = [request, ...LATEST_FALLBACK_URLS];
  for (const source of sources) {
    try {
      const response = await fetch(source, {
        cache: "no-store",
        headers: { "Accept": "application/json,text/plain,*/*" }
      });
      if (!response.ok) continue;
      await cache.put(canonical, response.clone());
      return response;
    } catch (_) {}
  }
  const cached = await caches.match(canonical);
  return cached || new Response(JSON.stringify({ error: "latest_data_unavailable" }), {
    status: 503,
    headers: { "Content-Type": "application/json; charset=utf-8" }
  });
}
