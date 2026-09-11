const CACHE_PREFIX = "togs-heads-up-";
const CACHE_NAME = `${CACHE_PREFIX}v17`;
// A v12 pertence ao escopo antigo /Togs-heads-up/. Cache Storage e compartilhado
// por origem, entao apaga-la aqui quebraria o shell offline da instalacao antiga.
const LEGACY_SCOPE_CACHE_NAME = `${CACHE_PREFIX}v12`;
const toScopeUrl = (path) => new URL(path, self.registration.scope).toString();
const INDEX_URL = toScopeUrl("index.html");
const STATIC_APP_SHELL = ["./", "manifest.webmanifest", "icon.svg"].map(toScopeUrl);

function getIndexAssetUrls(indexHtml) {
  const assetUrls = new Set();
  const attributePattern = /<(?:script|link)\b[^>]*(?:src|href)=["']([^"']+)["'][^>]*>/gi;

  for (const match of indexHtml.matchAll(attributePattern)) {
    const assetUrl = new URL(match[1], INDEX_URL);
    const isScopedAsset = assetUrl.origin === self.location.origin && assetUrl.href.startsWith(self.registration.scope);
    if (isScopedAsset && /\.(?:css|js)(?:\?|$)/i.test(assetUrl.href)) {
      assetUrls.add(assetUrl.toString());
    }
  }

  return [...assetUrls];
}

async function precacheAppShell() {
  const indexResponse = await fetch(INDEX_URL, { cache: "no-store" });
  if (!indexResponse.ok) {
    throw new Error(`Unable to precache index.html: HTTP ${indexResponse.status}`);
  }

  const indexHtml = await indexResponse.clone().text();
  const cache = await caches.open(CACHE_NAME);
  await Promise.all([
    cache.put(INDEX_URL, indexResponse),
    cache.addAll([...STATIC_APP_SHELL, ...getIndexAssetUrls(indexHtml)]),
  ]);
}

self.addEventListener("install", (event) => {
  event.waitUntil(precacheAppShell().then(() => self.skipWaiting()));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter(
              (key) =>
                key.startsWith(CACHE_PREFIX) && key !== CACHE_NAME && key !== LEGACY_SCOPE_CACHE_NAME,
            )
            .map((key) => caches.delete(key)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  const requestUrl = new URL(request.url);
  const accept = request.headers.get("accept") || "";
  const isExternalRequest = requestUrl.origin !== self.location.origin;
  const acceptsDynamicData =
    accept.includes("application/json") ||
    accept.includes("application/xml") ||
    accept.includes("text/xml") ||
    accept.includes("text/plain");

  if (request.method !== "GET") {
    return;
  }

  if (request.mode === "navigate") {
    event.respondWith(fetch(request).catch(() => caches.match(INDEX_URL)));
    return;
  }

  // Fontes externas / dados dinamicos: nao interceptar. Deixa o browser fazer a
  // requisicao direto, para que o proprio app trate erros (CORS, 429, rede) sem
  // gerar rejeicoes nao capturadas dentro do service worker.
  if (isExternalRequest || acceptsDynamicData || requestUrl.pathname.includes("/api/")) {
    return;
  }

  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) {
        return cached;
      }

      return fetch(request).then((response) => {
        if (!response || !response.ok) {
          return response;
        }

        const copy = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
        return response;
      });
    }),
  );
});
