import test from "node:test";
import assert from "node:assert/strict";
import {
  DEFAULT_LOCATION,
  buildCptecForecastUrl,
  buildFireballUrl,
  buildGeocodingUrl,
  buildOpenMeteoForecastUrl,
  fetchEarthSpaceDashboard,
  normalizeBrasilApiCptecCities,
  normalizeBrasilApiCptecForecast,
  normalizeFireballPayload,
  normalizeGeocodingResults,
  normalizeReverseGeocodingResult,
  normalizeWeatherPayload,
  resolveLocationFromCoords,
  selectBrasilApiCptecCity,
} from "../src/services/earthSpaceApi.js";

test("public API URLs contain no private key", () => {
  const urls = [
    buildOpenMeteoForecastUrl(DEFAULT_LOCATION),
    buildGeocodingUrl("Marilia"),
    buildCptecForecastUrl(),
    buildFireballUrl(),
  ];

  assert.match(urls[0], /api\.open-meteo\.com/);
  assert.match(urls[0], /latitude=-22\.2171/);
  assert.match(urls[1], /geocoding-api\.open-meteo\.com/);
  assert.match(urls[2], /brasilapi\.com\.br\/api\/cptec\/v1\/clima\/previsao\/3159\/6/);
  assert.match(urls[3], /ssd-api\.jpl\.nasa\.gov\/fireball\.api/);
  urls.forEach((url) => assert.doesNotMatch(url, /api_key|apikey|token|secret/i));
});

test("Open-Meteo forecast request keeps automatic timezone and explicit public units", () => {
  const url = new URL(
    buildOpenMeteoForecastUrl({ ...DEFAULT_LOCATION, timezone: "auto" }),
  );

  assert.equal(url.hostname, "api.open-meteo.com");
  assert.equal(url.searchParams.get("timezone"), "auto");
  assert.equal(url.searchParams.get("wind_speed_unit"), "kmh");
  assert.equal(url.searchParams.get("precipitation_unit"), "mm");
  assert.equal(url.searchParams.get("forecast_days"), "7");
  assert.match(url.searchParams.get("current"), /temperature_2m/);
  assert.match(url.searchParams.get("hourly"), /precipitation_probability/);
  for (const field of ["rain", "showers", "weather_code", "cape", "visibility", "wind_gusts_10m"]) {
    assert.match(url.searchParams.get("hourly"), new RegExp(`(^|,)${field}(,|$)`));
  }
  assert.match(url.searchParams.get("daily"), /temperature_2m_max/);
});

test("geocoding payload becomes selectable locations", () => {
  const [place] = normalizeGeocodingResults({
    results: [
      {
        id: 1,
        name: "Marilia",
        admin1: "Sao Paulo",
        country: "Brazil",
        country_code: "BR",
        latitude: -22.217,
        longitude: -49.95,
        timezone: "America/Sao_Paulo",
      },
    ],
  });

  assert.equal(place.id, "1");
  assert.equal(place.countryCode, "BR");
  assert.equal(place.timezone, "America/Sao_Paulo");
});

test("reverse geocoding never exposes coordinates in the location id", () => {
  const place = normalizeReverseGeocodingResult(
    { city: "Marília", principalSubdivision: "São Paulo", countryName: "Brasil", countryCode: "BR" },
    { latitude: -22.2171, longitude: -49.9501 },
  );

  assert.equal(place.id, "geo-current");
  assert.doesNotMatch(place.id, /-22|49\.95/);
});

test("weather payload is normalized for current, daily and hourly views", () => {
  const weather = normalizeWeatherPayload(
    {
      timezone: "America/Manaus",
      current: {
        time: "2026-07-09T12:00",
        temperature_2m: 27.5,
        apparent_temperature: 28.1,
        relative_humidity_2m: 62,
        weather_code: 95,
        precipitation: 4.2,
        wind_gusts_10m: 54,
      },
      daily: {
        time: ["2026-07-09"],
        weather_code: [95],
        temperature_2m_max: [29],
        temperature_2m_min: [18],
        precipitation_probability_max: [80],
        precipitation_sum: [11.2],
        uv_index_max: [6.4],
        wind_speed_10m_max: [34],
        sunrise: ["2026-07-09T06:50"],
        sunset: ["2026-07-09T17:42"],
      },
      hourly: {
        time: ["2026-07-09T10:00", "2026-07-09T11:00", "2026-07-09T12:00", "2026-07-09T13:00"],
        temperature_2m: [25, 26, 27.5, 28],
        precipitation_probability: [10, 20, 78, 82],
        precipitation: [0, 0, 2, 4],
        rain: [0, 0, 1, 2],
        showers: [0, 0, 1, 2],
        weather_code: [0, 1, 95, 96],
        cape: [200, 400, 1800, 2200],
        visibility: [30000, 25000, 4000, 1800],
        cloud_cover: [20, 40, 88, 95],
        wind_gusts_10m: [20, 30, 54, 76],
      },
    },
    { ...DEFAULT_LOCATION, timezone: "auto" },
  );

  assert.equal(weather.current.condition, "Tempestade");
  assert.equal(weather.location.timezone, "auto");
  assert.equal(weather.timezone, "America/Manaus");
  assert.equal(weather.current.temperature, 27.5);
  assert.equal(weather.daily[0].rainProbability, 80);
  assert.deepEqual(weather.hourly.map((item) => item.hour), ["12:00", "13:00"]);
  assert.equal(weather.hourly[0].cape, 1800);
  assert.equal(weather.hourly[1].visibility, 1800);
  assert.equal(weather.hourly[1].weatherCode, 96);
});

test("weather normalization keeps exactly the next 24 hourly entries", () => {
  const times = Array.from({ length: 26 }, (_, index) =>
    new Date(Date.UTC(2026, 7, 30, 12 + index)).toISOString().slice(0, 16),
  );
  const weather = normalizeWeatherPayload(
    {
      current: { time: "2026-08-30T12:15" },
      hourly: { time: times },
    },
    DEFAULT_LOCATION,
  );

  assert.equal(weather.hourly.length, 24);
  assert.equal(weather.hourly[0].time, "2026-08-30T13:00");
  assert.equal(weather.hourly.at(-1).time, "2026-08-31T12:00");
  assert.ok(!weather.hourly.some((hour) => hour.time === "2026-08-31T13:00"));
});

test("BrasilAPI CPTEC keeps Marilia city 3159 and normalizes its public forecast", () => {
  const cities = normalizeBrasilApiCptecCities([
    { nome: "Marília", estado: "SP", id: 3159, regiao: "Sudeste" },
  ]);
  const forecast = normalizeBrasilApiCptecForecast({
    cidade: "Marília",
    estado: "SP",
    atualizado_em: "2026-08-30",
    clima: [
      { data: "2026-08-31", condicao: "pn", condicao_desc: "Parcialmente Nublado", min: 20, max: 34, indice_uv: 0 },
      { data: "inválida", condicao: "", condicao_desc: "", min: null, max: null, indice_uv: null },
    ],
  });

  assert.equal(DEFAULT_LOCATION.cptecId, "3159");
  assert.equal(cities[0].id, "3159");
  assert.equal(forecast.city, "Marília");
  assert.equal(forecast.days.length, 1);
  assert.equal(forecast.days[0].condition, "Parcialmente Nublado");
  assert.equal(forecast.days[0].max, 34);
});

test("missing weather and CPTEC measurements stay null instead of becoming zero", () => {
  const weather = normalizeWeatherPayload(
    {
      current: { time: "2026-08-30T10:15" },
      daily: {},
      hourly: { time: ["2026-08-30T11:00"] },
    },
    DEFAULT_LOCATION,
  );
  const forecast = normalizeBrasilApiCptecForecast({
    cidade: "Marília",
    estado: "SP",
    clima: [
      {
        data: "2026-08-31",
        condicao: "",
        condicao_desc: "",
        min: "",
        max: null,
        indice_uv: undefined,
      },
    ],
  });

  assert.equal(weather.hourly[0].visibility, null);
  assert.equal(weather.hourly[0].precipitation, null);
  assert.equal(forecast.days[0].min, null);
  assert.equal(forecast.days[0].max, null);
  assert.equal(forecast.days[0].uv, null);
});

test("CPTEC city selection requires the requested Brazilian city and state", () => {
  const cities = normalizeBrasilApiCptecCities([
    { nome: "Bom Jesus", estado: "PI", id: 101 },
    { nome: "Bom Jesus", estado: "SP", id: 202 },
  ]);

  assert.equal(selectBrasilApiCptecCity(cities, { name: "Bom Jesus", admin1: "São Paulo" }).id, "202");
  assert.equal(selectBrasilApiCptecCity(cities, { name: "Bom Jesus", admin1: "Bahia" }), null);
  assert.equal(selectBrasilApiCptecCity(cities, { name: "Outra cidade", admin1: "São Paulo" }), null);
});

test("fireball payload maps NASA/JPL field arrays", () => {
  const [fireball] = normalizeFireballPayload({
    fields: ["date", "lat", "lat-dir", "lon", "lon-dir", "alt", "energy", "impact-e"],
    data: [["2026-07-01 01:02:03", "22.1", "S", "49.9", "W", "31.5", "2.5", "0.08"]],
  });

  assert.equal(fireball.latitude, -22.1);
  assert.equal(fireball.longitude, -49.9);
  assert.equal(fireball.altitudeKm, 31.5);
  assert.equal(fireball.impactEnergyKt, 0.08);
});

function createStorage() {
  const values = new Map();
  return {
    values,
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
    removeItem: (key) => values.delete(key),
    key: (index) => [...values.keys()][index] ?? null,
    get length() {
      return values.size;
    },
  };
}

function createDashboardFetch(requestedUrls = []) {
  return async (url) => {
    requestedUrls.push(url);
    const decodedUrl = decodeURIComponent(url);

    if (decodedUrl.includes("api.open-meteo.com")) {
      return {
        ok: true,
        json: async () => ({
          current: { temperature_2m: 24, weather_code: 1 },
          daily: { time: [] },
          hourly: { time: [] },
        }),
      };
    }

    if (decodedUrl.includes("brasilapi.com.br/api/cptec/v1/cidade/")) {
      return {
        ok: true,
        json: async () => [{ nome: "Marília", estado: "SP", id: 3159 }],
      };
    }

    if (decodedUrl.includes("brasilapi.com.br/api/cptec/v1/clima/previsao/")) {
      return {
        ok: true,
        json: async () => ({
          cidade: "Marília",
          estado: "SP",
          atualizado_em: "2026-08-22",
          clima: [
            {
              data: "2026-08-23",
              condicao: "pn",
              condicao_desc: "Parcialmente Nublado",
              max: 27,
              min: 16,
              indice_uv: 5,
            },
          ],
        }),
      };
    }

    if (decodedUrl.includes("fireball.api")) {
      return {
        ok: true,
        json: async () => ({ fields: ["date", "impact-e"], data: [["2026-08-20", "0.2"]] }),
      };
    }

    throw new Error(`Unexpected URL: ${url}`);
  };
}

const CACHE_TEST_NOW = Date.parse("2026-08-23T15:00:00.000Z");
const DEFAULT_LOCATION_SCOPE = `${DEFAULT_LOCATION.latitude},${DEFAULT_LOCATION.longitude}`;
const CACHE_KEYS = {
  weather: `togs-cache:v5:weather:${DEFAULT_LOCATION_SCOPE}`,
  cptec: `togs-cache:v5:cptec:${DEFAULT_LOCATION_SCOPE}`,
  fireballs: "togs-cache:v5:fireballs:global",
};
const CACHED_DASHBOARD_VALUES = {
  weather: { current: { temperature: 18 }, daily: [], hourly: [] },
  cptec: { city: "Cached CPTEC", days: [{ date: "2026-08-23" }] },
  fireballs: [{ id: "cached-fireball" }],
};

function seedDashboardCache(storage, storedAtBySource) {
  for (const [source, storedAt] of Object.entries(storedAtBySource)) {
    storage.values.set(CACHE_KEYS[source], JSON.stringify({ storedAt, value: CACHED_DASHBOARD_VALUES[source] }));
  }
}

async function withFrozenDateNow(callback) {
  const originalDateNow = Date.now;
  Date.now = () => CACHE_TEST_NOW;
  try {
    return await callback();
  } finally {
    Date.now = originalDateNow;
  }
}

function createNonRetriableFailure() {
  const error = new Error("upstream unavailable");
  error.status = 400;
  return error;
}

test("dashboard requests only the three working public sources", async () => {
  const requestedUrls = [];
  const result = await fetchEarthSpaceDashboard({
    fetchImpl: createDashboardFetch(requestedUrls),
    storage: createStorage(),
  });

  assert.equal(requestedUrls.length, 3);
  assert.deepEqual(result.sources.map((source) => source.id), ["weather", "cptec", "fireballs"]);
  assert.equal(result.weather.current.temperature, 24);
  assert.equal(result.cptec.days.length, 1);
  assert.equal(result.fireballs.length, 1);
  assert.ok(requestedUrls.every((url) => !/api_key|mymemory|mars-photos|planetary\/apod|cad\.api/.test(url)));
});

test("dashboard cache avoids duplicate requests for the default location", async () => {
  const requestedUrls = [];
  const storage = createStorage();
  const fetchImpl = createDashboardFetch(requestedUrls);

  await fetchEarthSpaceDashboard({ fetchImpl, storage });
  await fetchEarthSpaceDashboard({ fetchImpl, storage });

  assert.equal(requestedUrls.length, 3);
  assert.equal(storage.values.size, 3);
});

test("cache is fresh immediately before 15m/3h TTLs and refreshes at the exact limits", async () => {
  await withFrozenDateNow(async () => {
    const freshStorage = createStorage();
    seedDashboardCache(freshStorage, {
      weather: CACHE_TEST_NOW - 15 * 60 * 1000 + 1,
      cptec: CACHE_TEST_NOW - 3 * 60 * 60 * 1000 + 1,
      fireballs: CACHE_TEST_NOW - 3 * 60 * 60 * 1000 + 1,
    });
    const unexpectedRequests = [];

    const freshResult = await fetchEarthSpaceDashboard({
      storage: freshStorage,
      fetchImpl: async (url) => {
        unexpectedRequests.push(url);
        throw createNonRetriableFailure();
      },
    });

    assert.deepEqual(unexpectedRequests, []);
    assert.equal(freshResult.weather.current.temperature, 18);
    assert.ok(freshResult.sources.every((source) => source.detail === "Dados em cache (recentes)"));

    const boundaryStorage = createStorage();
    seedDashboardCache(boundaryStorage, {
      weather: CACHE_TEST_NOW - 15 * 60 * 1000,
      cptec: CACHE_TEST_NOW - 3 * 60 * 60 * 1000,
      fireballs: CACHE_TEST_NOW - 3 * 60 * 60 * 1000,
    });
    const boundaryRequests = [];

    const boundaryResult = await fetchEarthSpaceDashboard({
      storage: boundaryStorage,
      fetchImpl: createDashboardFetch(boundaryRequests),
    });

    assert.equal(boundaryRequests.length, 3);
    assert.equal(boundaryResult.weather.current.temperature, 24);
    assert.ok(boundaryResult.sources.every((source) => source.detail === "Dados recebidos"));
  });
});

test("failed refresh uses cache just below 24h but rejects it at exactly 24h", async () => {
  await withFrozenDateNow(async () => {
    const fallbackStorage = createStorage();
    seedDashboardCache(fallbackStorage, {
      weather: CACHE_TEST_NOW - 24 * 60 * 60 * 1000 + 1,
      cptec: CACHE_TEST_NOW - 24 * 60 * 60 * 1000 + 1,
      fireballs: CACHE_TEST_NOW - 24 * 60 * 60 * 1000 + 1,
    });

    const fallbackResult = await fetchEarthSpaceDashboard({
      storage: fallbackStorage,
      fetchImpl: async () => {
        throw createNonRetriableFailure();
      },
    });

    assert.deepEqual(fallbackResult.sources.map((source) => source.state), ["cache", "cache", "cache"]);
    assert.equal(fallbackResult.weather.current.temperature, 18);

    const expiredStorage = createStorage();
    seedDashboardCache(expiredStorage, {
      weather: CACHE_TEST_NOW - 24 * 60 * 60 * 1000,
      cptec: CACHE_TEST_NOW - 24 * 60 * 60 * 1000,
      fireballs: CACHE_TEST_NOW - 24 * 60 * 60 * 1000,
    });

    const expiredResult = await fetchEarthSpaceDashboard({
      storage: expiredStorage,
      fetchImpl: async () => {
        throw createNonRetriableFailure();
      },
    });

    assert.deepEqual(expiredResult.sources.map((source) => source.state), ["erro", "erro", "indisponivel"]);
    assert.equal(expiredStorage.values.size, 0);
  });
});

test("precise geolocation is never persisted in dashboard cache", async () => {
  const storage = createStorage();
  storage.values.set(
    "togs-cache:v3:weather:-22.21123,-49.95567",
    JSON.stringify({ storedAt: Date.now(), value: { location: { latitude: -22.21123, longitude: -49.95567 } } }),
  );
  await fetchEarthSpaceDashboard({
    location: { ...DEFAULT_LOCATION, id: "geo-current", latitude: -22.21123, longitude: -49.95567 },
    fetchImpl: createDashboardFetch(),
    storage,
  });

  const serializedCache = [...storage.values.entries()].flat().join(" ");
  assert.doesNotMatch(serializedCache, /-22\.21123|-49\.95567/);
  assert.ok([...storage.values.keys()].every((key) => !key.startsWith("togs-cache:v3:")));
  assert.equal(storage.values.size, 1, "only the global fireball response may be cached");
});

test("dashboard physically removes legacy, malformed, future and expired cache entries", async () => {
  const storage = createStorage();
  storage.values.set("togs-cache:v3:weather:legacy", JSON.stringify({ storedAt: Date.now(), value: {} }));
  storage.values.set("togs-cache:v4:weather:legacy", JSON.stringify({ storedAt: Date.now(), value: {} }));
  storage.values.set("togs-cache:v5:weather:malformed", "not-json");
  storage.values.set(
    "togs-cache:v5:weather:invalid-timestamp",
    JSON.stringify({ storedAt: "not-a-timestamp", value: {} }),
  );
  storage.values.set(
    "togs-cache:v5:weather:future",
    JSON.stringify({ storedAt: Date.now() + 25 * 60 * 60 * 1000, value: {} }),
  );
  storage.values.set(
    "togs-cache:v5:weather:expired",
    JSON.stringify({ storedAt: Date.now() - 25 * 60 * 60 * 1000, value: {} }),
  );
  storage.values.set("unrelated:key", "preserve");

  await fetchEarthSpaceDashboard({ fetchImpl: createDashboardFetch(), storage });

  assert.equal(storage.values.has("togs-cache:v3:weather:legacy"), false);
  assert.equal(storage.values.has("togs-cache:v4:weather:legacy"), false);
  assert.equal(storage.values.has("togs-cache:v5:weather:malformed"), false);
  assert.equal(storage.values.has("togs-cache:v5:weather:invalid-timestamp"), false);
  assert.equal(storage.values.has("togs-cache:v5:weather:future"), false);
  assert.equal(storage.values.has("togs-cache:v5:weather:expired"), false);
  assert.equal(storage.values.get("unrelated:key"), "preserve");
  assert.ok([...storage.values.keys()].filter((key) => key.startsWith("togs-cache:v5:")).length === 3);
});

test("dashboard still loads when any Storage API operation is blocked by the browser", async (t) => {
  for (const blockedOperation of ["getItem", "setItem", "removeItem", "key", "length"]) {
    await t.test(blockedOperation, async () => {
      const calls = { getItem: 0, setItem: 0, removeItem: 0, key: 0, length: 0 };
      const blockedStorage = {
        getItem() {
          calls.getItem += 1;
          if (blockedOperation === "getItem") throw new DOMException("Storage access denied", "SecurityError");
          return null;
        },
        setItem() {
          calls.setItem += 1;
          if (blockedOperation === "setItem") throw new DOMException("Storage access denied", "SecurityError");
        },
        removeItem() {
          calls.removeItem += 1;
          if (blockedOperation === "removeItem") throw new DOMException("Storage access denied", "SecurityError");
        },
        key() {
          calls.key += 1;
          if (blockedOperation === "key") throw new DOMException("Storage access denied", "SecurityError");
          return blockedOperation === "removeItem" ? "togs-cache:v4:legacy" : "togs-cache:v5:weather:probe";
        },
        get length() {
          calls.length += 1;
          if (blockedOperation === "length") throw new DOMException("Storage access denied", "SecurityError");
          return 1;
        },
      };

      const result = await fetchEarthSpaceDashboard({ fetchImpl: createDashboardFetch(), storage: blockedStorage });

      assert.equal(result.weather.current.temperature, 24);
      assert.ok(calls[blockedOperation] > 0, `${blockedOperation} must be exercised`);
    });
  }
});

test("independent source failures degrade without blocking weather", async () => {
  const result = await fetchEarthSpaceDashboard({
    storage: createStorage(),
    fetchImpl: async (url) => {
      if (url.includes("api.open-meteo.com")) {
        return { ok: true, json: async () => ({ current: { temperature_2m: 20 }, daily: {}, hourly: {} }) };
      }
      throw new TypeError("network unavailable");
    },
  });

  assert.equal(result.weather.current.temperature, 20);
  assert.equal(result.sources.find((source) => source.id === "cptec").state, "erro");
  assert.equal(result.sources.find((source) => source.id === "fireballs").state, "indisponivel");
});

test("CPTEC response without valid forecast days is exposed as empty without blocking weather", async () => {
  const result = await fetchEarthSpaceDashboard({
    storage: createStorage(),
    env: { VITE_CORS_PROXY: "" },
    fetchImpl: async (url) => ({
      ok: true,
      status: 200,
      json: async () => {
        if (url.includes("api.open-meteo.com")) {
          return {
            timezone: "America/Sao_Paulo",
            current: { time: "2026-08-30T12:00", temperature_2m: 20 },
            daily: { time: [] },
            hourly: { time: [] },
          };
        }
        if (url.includes("brasilapi.com.br")) {
          return { cidade: "Marília", estado: "SP", atualizado_em: "2026-08-30", clima: [] };
        }
        return { fields: [], data: [] };
      },
    }),
  });

  assert.equal(result.weather.current.temperature, 20);
  assert.equal(result.cptec, null);
  assert.equal(result.sources.find((source) => source.id === "cptec").state, "sem-dados");
});

test("reverse geocoding falls back to coordinates when naming fails", async () => {
  const location = await resolveLocationFromCoords(
    { latitude: -22.2, longitude: -49.9 },
    {
      fetchImpl: async () => {
        throw new TypeError("offline");
      },
    },
  );

  assert.equal(location.id, "geo-current");
  assert.equal(location.name, "Minha localização");
  assert.equal(location.latitude, -22.2);
});

test("reverse geocoding timeout falls back unless the caller cancelled", async () => {
  const timeoutError = new Error("request timed out");
  timeoutError.name = "AbortError";

  const location = await resolveLocationFromCoords(
    { latitude: -22.2, longitude: -49.9 },
    {
      fetchImpl: async () => {
        throw timeoutError;
      },
    },
  );

  assert.equal(location.name, "Minha localização");

  const controller = new AbortController();
  controller.abort();
  await assert.rejects(
    resolveLocationFromCoords(
      { latitude: -22.2, longitude: -49.9 },
      {
        signal: controller.signal,
        fetchImpl: async () => {
          throw timeoutError;
        },
      },
    ),
    { name: "AbortError" },
  );
});
