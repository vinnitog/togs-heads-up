import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const SERVICE_WORKER_SOURCE = fs.readFileSync(path.join(ROOT, "public", "sw.js"), "utf8");
const ORIGIN = "https://portfolio.test";
const SCOPE = `${ORIGIN}/togs-heads-up/`;
const INDEX_URL = `${SCOPE}index.html`;
const CACHE_NAME = "togs-heads-up-v17";

function requestUrl(request) {
  return typeof request === "string" ? request : request.url;
}

function createHarness(initialRoutes = new Map()) {
  const listeners = new Map();
  const cacheStores = new Map();
  const routes = new Map(initialRoutes);
  const networkCalls = [];
  const timeline = [];
  const deletedCaches = [];
  let offline = false;

  async function networkFetch(request, options = {}) {
    const url = requestUrl(request);
    networkCalls.push({ url, options });
    if (offline) throw new TypeError("offline");

    const route = routes.get(url);
    if (!route) return new Response("not found", { status: 404 });
    if (route instanceof Error) throw route;
    const response = typeof route === "function" ? await route(request, options) : route;
    return response.clone();
  }

  function openCache(name) {
    if (!cacheStores.has(name)) cacheStores.set(name, new Map());
    const store = cacheStores.get(name);

    return {
      async addAll(urls) {
        await Promise.all(
          urls.map(async (url) => {
            const response = await networkFetch(url);
            if (!response.ok) throw new Error(`Failed to cache ${url}: HTTP ${response.status}`);
            await this.put(url, response);
          }),
        );
      },
      async put(request, response) {
        const url = requestUrl(request);
        store.set(url, response.clone());
        timeline.push(`put:${url}`);
      },
      async match(request) {
        return store.get(requestUrl(request))?.clone();
      },
    };
  }

  const caches = {
    async open(name) {
      return openCache(name);
    },
    async keys() {
      return [...cacheStores.keys()];
    },
    async delete(name) {
      deletedCaches.push(name);
      const deleted = cacheStores.delete(name);
      timeline.push(`delete:${name}`);
      return deleted;
    },
    async match(request) {
      for (const store of cacheStores.values()) {
        const response = store.get(requestUrl(request));
        if (response) return response.clone();
      }
      return undefined;
    },
  };

  const self = {
    registration: { scope: SCOPE },
    location: { origin: ORIGIN },
    clients: {
      async claim() {
        timeline.push("clients.claim");
      },
    },
    async skipWaiting() {
      timeline.push("skipWaiting");
    },
    addEventListener(type, listener) {
      listeners.set(type, listener);
    },
  };

  vm.runInNewContext(SERVICE_WORKER_SOURCE, {
    URL,
    Response,
    Set,
    Promise,
    Error,
    caches,
    fetch: networkFetch,
    self,
  });

  async function dispatchExtendable(type) {
    let pending;
    listeners.get(type)({
      waitUntil(promise) {
        pending = Promise.resolve(promise);
      },
    });
    assert.ok(pending, `${type} must register work with waitUntil`);
    return pending;
  }

  function dispatchFetch(request) {
    let response;
    listeners.get("fetch")({
      request,
      respondWith(promise) {
        response = Promise.resolve(promise);
      },
    });
    return response;
  }

  return {
    cacheStores,
    deletedCaches,
    dispatchExtendable,
    dispatchFetch,
    networkCalls,
    routes,
    setOffline(value) {
      offline = value;
    },
    seedCache(name, entries = []) {
      cacheStores.set(name, new Map(entries));
    },
    timeline,
  };
}

function productionRoutes() {
  const indexHtml = `<!doctype html>
    <html><head>
      <link rel="stylesheet" href="./assets/index-a1b2c3.css">
      <link rel="modulepreload" href="./assets/vendor-c4d5e6.js">
      <script type="module" src="./assets/index-f7g8h9.js"></script>
      <script src="https://third-party.test/tracker.js"></script>
    </head><body></body></html>`;

  return new Map([
    [INDEX_URL, new Response(indexHtml, { status: 200, headers: { "content-type": "text/html" } })],
    [SCOPE, new Response(indexHtml, { status: 200 })],
    [`${SCOPE}manifest.webmanifest`, new Response("{}", { status: 200 })],
    [`${SCOPE}icon.svg`, new Response("<svg/>", { status: 200 })],
    [`${SCOPE}assets/index-a1b2c3.css`, new Response("body{}", { status: 200 })],
    [`${SCOPE}assets/vendor-c4d5e6.js`, new Response("export{}", { status: 200 })],
    [`${SCOPE}assets/index-f7g8h9.js`, new Response("import'./vendor-c4d5e6.js'", { status: 200 })],
  ]);
}

test("install precaches index and every scoped JS/CSS asset before taking control", async () => {
  const harness = createHarness(productionRoutes());
  harness.seedCache("togs-heads-up-v10");
  harness.seedCache("togs-heads-up-v11");
  harness.seedCache("togs-heads-up-v12");
  harness.seedCache("togs-heads-up-v13");
  harness.seedCache("togs-heads-up-v14");
  harness.seedCache("togs-heads-up-v15");
  harness.seedCache("togs-heads-up-v16");
  harness.seedCache("another-app-v3");

  await harness.dispatchExtendable("install");

  const cachedUrls = [...harness.cacheStores.get(CACHE_NAME).keys()].sort();
  assert.deepEqual(cachedUrls, [
    SCOPE,
    `${SCOPE}assets/index-a1b2c3.css`,
    `${SCOPE}assets/index-f7g8h9.js`,
    `${SCOPE}assets/vendor-c4d5e6.js`,
    `${SCOPE}icon.svg`,
    INDEX_URL,
    `${SCOPE}manifest.webmanifest`,
  ].sort());
  assert.ok(!harness.networkCalls.some(({ url }) => url.includes("third-party.test")));
  assert.equal(harness.networkCalls.find(({ url }) => url === INDEX_URL).options.cache, "no-store");
  assert.equal(harness.timeline.at(-1), "skipWaiting");
  assert.ok(harness.timeline.slice(0, -1).every((entry) => entry.startsWith("put:")));
  assert.ok(harness.cacheStores.has("togs-heads-up-v12"), "legacy-scope v12 remains during install");
  assert.deepEqual(harness.deletedCaches, [], "install must not remove any active cache");

  await harness.dispatchExtendable("activate");

  assert.deepEqual(harness.deletedCaches, ["togs-heads-up-v10", "togs-heads-up-v11", "togs-heads-up-v13", "togs-heads-up-v14", "togs-heads-up-v15", "togs-heads-up-v16"]);
  assert.ok(harness.cacheStores.has(CACHE_NAME));
  assert.ok(harness.cacheStores.has("togs-heads-up-v12"), "activation preserves the old uppercase-scope shell");
  assert.ok(harness.cacheStores.has("another-app-v3"));
  assert.equal(harness.timeline.at(-1), "clients.claim");
});

test("a failed hashed asset prevents activation and preserves the previous cache", async () => {
  const routes = productionRoutes();
  routes.set(`${SCOPE}assets/index-f7g8h9.js`, new Response("unavailable", { status: 503 }));
  const harness = createHarness(routes);
  harness.seedCache("togs-heads-up-v12", [[INDEX_URL, new Response("old offline shell")]]);
  harness.seedCache("togs-heads-up-v16", [[INDEX_URL, new Response("current offline shell")]]);

  await assert.rejects(harness.dispatchExtendable("install"), /Failed to cache.*HTTP 503/);

  assert.ok(harness.cacheStores.has("togs-heads-up-v12"), "legacy-scope cache remains available");
  assert.ok(harness.cacheStores.has("togs-heads-up-v16"), "current cache remains available");
  assert.ok(!harness.timeline.includes("skipWaiting"));
  assert.deepEqual(harness.deletedCaches, []);
});

test("offline navigation falls back to the installed index and cached assets remain readable", async () => {
  const harness = createHarness(productionRoutes());
  await harness.dispatchExtendable("install");
  await harness.dispatchExtendable("activate");
  harness.setOffline(true);

  const navigation = {
    url: `${SCOPE}weather/today`,
    method: "GET",
    mode: "navigate",
    headers: { get: () => "text/html" },
  };
  const navigationResponse = await harness.dispatchFetch(navigation);
  assert.match(await navigationResponse.text(), /index-a1b2c3\.css/);

  const assetRequest = {
    url: `${SCOPE}assets/index-a1b2c3.css`,
    method: "GET",
    mode: "cors",
    headers: { get: () => "text/css" },
  };
  const assetResponse = await harness.dispatchFetch(assetRequest);
  assert.equal(await assetResponse.text(), "body{}");
});

test("external, dynamic API and non-GET requests stay outside the asset cache handler", () => {
  const harness = createHarness();
  const requests = [
    { url: "https://api.open-meteo.com/v1/forecast", method: "GET", mode: "cors", accept: "application/json" },
    { url: "https://api.openweathermap.org/data/2.5/weather?appid=test-only", method: "GET", mode: "cors", accept: "application/json" },
    { url: "https://tile.openweathermap.org/map/temp_new/2/1/1.png?appid=test-only", method: "GET", mode: "cors", accept: "image/png" },
    { url: "https://tile.openstreetmap.org/2/1/1.png", method: "GET", mode: "cors", accept: "image/png" },
    { url: `${SCOPE}api/status`, method: "GET", mode: "cors", accept: "application/json" },
    { url: `${SCOPE}assets/update.js`, method: "POST", mode: "cors", accept: "text/javascript" },
  ];

  for (const request of requests) {
    const response = harness.dispatchFetch({
      ...request,
      headers: { get: () => request.accept },
    });
    assert.equal(response, undefined, `${request.url} should bypass respondWith`);
  }
});
