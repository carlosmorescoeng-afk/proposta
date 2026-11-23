// Guarda a página da proposta no aparelho para funcionar sem internet.
// Ao publicar uma versão nova do index.html, aumente o número da versão abaixo.
const CACHE = "proposta-moresco-v3";
const ASSETS = [
  "./",
  "./index.html",
  "./fonts/caladea-400-normal.woff2",
  "./fonts/caladea-700-normal.woff2",
  "./fonts/caladea-400-italic.woff2",
  "./fonts/carlito-400-normal.woff2",
  "./fonts/carlito-700-normal.woff2",
  "./fonts/carlito-400-italic.woff2",
];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE).then((c) => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// Primeiro a cópia guardada (abre na hora, com ou sem internet); com internet, atualiza a cópia em segundo plano.
self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET" || new URL(req.url).origin !== self.location.origin) return;
  const isPage = req.mode === "navigate";
  event.respondWith(
    caches.open(CACHE).then(async (cache) => {
      const key = isPage ? "./index.html" : req;
      const cached = await cache.match(key, { ignoreSearch: true });
      const network = fetch(req)
        .then((res) => {
          if (res && res.ok) cache.put(key, res.clone());
          return res;
        })
        .catch(() => null);
      if (cached) {
        event.waitUntil(network);
        return cached;
      }
      const res = await network;
      return res || new Response("Sem conexão e sem cópia salva.", { status: 503 });
    })
  );
});
