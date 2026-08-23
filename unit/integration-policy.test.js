import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  buildCptecCitySearchUrl,
  buildCptecForecastUrl,
  buildFireballUrl,
  buildGeocodingUrl,
  buildOpenMeteoForecastUrl,
  buildReverseGeocodingUrl,
} from "../src/services/earthSpaceApi.js";
import { getConfiguredSources } from "../src/services/incidentsApi.js";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const RUNTIME_FILES = [
  ".env.example",
  ".github/workflows/deploy-pages.yml",
  "index.html",
  "src/App.jsx",
  "src/data/incidents.js",
  "src/services/earthSpaceApi.js",
  "src/services/incidentsApi.js",
  "src/services/weatherSource.js",
];

function readRuntimeSources() {
  return RUNTIME_FILES.map((file) => fs.readFileSync(path.join(ROOT, file), "utf8")).join("\n");
}

function sorted(values) {
  return [...new Set(values)].sort();
}

test("regional integrations use an exact allowlist of source IDs and public request hosts", () => {
  const sources = getConfiguredSources();
  assert.deepEqual(sorted(sources.map(({ id }) => id)), [
    "g1-bauru-marilia",
    "giro-marilia",
    "inmet-alertas",
    "open-meteo",
  ]);
  assert.deepEqual(sorted(sources.map(({ url }) => new URL(url).hostname)), [
    "api.open-meteo.com",
    "api.rss2json.com",
    "apiprevmet3.inmet.gov.br",
  ]);

  const rssFeedHosts = sources
    .filter(({ parser }) => parser === "rss2json")
    .map(({ url }) => new URL(new URL(url).searchParams.get("rss_url")).hostname);
  assert.deepEqual(sorted(rssFeedHosts), ["g1.globo.com", "www.giromarilia.com.br"]);
});

test("earth and space URL builders stay on the approved keyless hosts", () => {
  const urls = [
    buildOpenMeteoForecastUrl(),
    buildGeocodingUrl("Marília"),
    buildReverseGeocodingUrl({ latitude: -22.2171, longitude: -49.9501 }),
    buildCptecCitySearchUrl("Marília"),
    buildCptecForecastUrl(),
    buildFireballUrl(),
  ];

  assert.deepEqual(sorted(urls.map((url) => new URL(url).hostname)), [
    "api.bigdatacloud.net",
    "api.open-meteo.com",
    "geocoding-api.open-meteo.com",
    "servicos.cptec.inpe.br",
    "ssd-api.jpl.nasa.gov",
  ]);
  urls.forEach((url) => assert.doesNotMatch(url, /api[_-]?key|apikey|client_secret|token=/i));
});

test("runtime code has an exact host and Vite variable allowlist", () => {
  const runtimeSources = readRuntimeSources();
  const hosts = [...runtimeSources.matchAll(/https:\/\/([a-z0-9.-]+)/gi)].map((match) => match[1].toLowerCase());
  const viteVariables = [...runtimeSources.matchAll(/\bVITE_[A-Z0-9_]+\b/g)].map((match) => match[0]);

  assert.deepEqual(sorted(hosts), [
    "api.allorigins.win",
    "api.bigdatacloud.net",
    "api.open-meteo.com",
    "api.rss2json.com",
    "apiprevmet3.inmet.gov.br",
    "g1.globo.com",
    "geocoding-api.open-meteo.com",
    "open-meteo.com",
    "portal.inmet.gov.br",
    "servicos.cptec.inpe.br",
    "ssd-api.jpl.nasa.gov",
    "www.giromarilia.com.br",
  ]);
  assert.deepEqual(sorted(viteVariables), ["VITE_CORS_PROXY"]);
});

test("removed paid, private-key and broken integrations cannot return unnoticed", () => {
  const runtimeSources = readRuntimeSources();
  const forbidden = [
    "VITE_NASA_API_KEY",
    "VITE_INCIDENTS_API_URL",
    "VITE_INFOSIGA_API_URL",
    "planetary/apod",
    "neo/rest/v1/feed",
    "cad.api",
    "mars-photos",
    "images-api.nasa.gov",
  ];

  for (const fragment of forbidden) {
    assert.ok(!runtimeSources.toLowerCase().includes(fragment.toLowerCase()), `${fragment} must stay removed`);
  }
});
