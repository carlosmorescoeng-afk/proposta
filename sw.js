// Guarda a página da proposta no aparelho para funcionar sem internet.
// Com internet, a página vem sempre do site (versão mais nova); sem internet, usa a cópia guardada.
// Ao publicar uma versão nova do index.html, aumente o número da versão abaixo.
const CACHE = "proposta-moresco-v4";
const ASSETS = [
  "./index.html",
  "./fonts/caladea-400-normal.woff2",
  "./fonts/caladea-700-normal.woff2",
  "./fonts/caladea-400-italic.woff2",
  "./fonts/carlito-400-normal.woff2",
  "./fonts/carlito-700-normal.woff2",
  "./fonts/carlito-400-italic.woff2",
];

self.addEventListener("install", (event) => {
  // cache: "reload" ignora o cache do navegador, para não guardar uma cópia antiga
  event.waitUntil(
    caches.open(CACHE)
      .then((c) => c.addAll(ASSETS.map((u) => new Request(u, { cache: "reload" }))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

function withTimeout(promise, ms) {
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error("timeout")), ms);
    promise.then((r) => { clearTimeout(t); resolve(r); }, (e) => { clearTimeout(t); reject(e); });
  });
}

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET" || new URL(req.url).origin !== self.location.origin) return;

  if (req.mode === "navigate") {
    // Página: primeiro o site (sem cache do navegador); se não houver internet em 6 s, a cópia guardada.
    event.respondWith(
      caches.open(CACHE).then(async (cache) => {
        try {
          const res = await withTimeout(fetch(req, { cache: "no-store" }), 6000);
          if (res && res.ok) {
            cache.put("./index.html", res.clone());
            return res;
          }
          throw new Error("bad response");
        } catch (e) {
          const cached = await cache.match("./index.html");
          return cached || new Response("Sem conexão e sem cópia salva.", { status: 503 });
        }
      })
    );
    return;
  }

  // Fontes e demais arquivos: cópia guardada primeiro (não mudam).
  event.respondWith(
    caches.open(CACHE).then(async (cache) => {
      const cached = await cache.match(req, { ignoreSearch: true });
      if (cached) return cached;
      try {
        const res = await fetch(req);
        if (res && res.ok) cache.put(req, res.clone());
        return res;
      } catch (e) {
        return new Response("", { status: 503 });
      }
    })
  );
});
