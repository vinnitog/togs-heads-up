import test from "node:test";
import assert from "node:assert/strict";
import {
  DEFAULT_LOCATION,
  buildCptecForecastUrl,
  buildFireballUrl,
  buildGeocodingUrl,
  buildOpenMeteoForecastUrl,
  fetchEarthSpaceDashboard,
  normalizeCptecCitySearchXml,
  normalizeCptecForecastXml,
  normalizeFireballPayload,
  normalizeGeocodingResults,
  normalizeReverseGeocodingResult,
  normalizeWeatherPayload,
  resolveLocationFromCoords,
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
  assert.match(urls[2], /servicos\.cptec\.inpe\.br/);
  assert.match(urls[3], /ssd-api\.jpl\.nasa\.gov\/fireball\.api/);
  urls.forEach((url) => assert.doesNotMatch(url, /api_key|apikey|token|secret/i));
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
        time: ["2026-07-09T12:00"],
        temperature_2m: [27.5],
        precipitation_probability: [78],
        precipitation: [2],
        cloud_cover: [88],
        wind_gusts_10m: [54],
      },
    },
    DEFAULT_LOCATION,
  );

  assert.equal(weather.current.condition, "Tempestade");
  assert.equal(weather.current.temperature, 27.5);
  assert.equal(weather.daily[0].rainProbability, 80);
  assert.equal(weather.hourly[0].hour, "12:00");
});

test("CPTEC XML search and forecast are normalized without placeholder days", () => {
  const cities = normalizeCptecCitySearchXml(
    "<cidades><cidade><nome>Marilia</nome><uf>SP</uf><id>244</id></cidade></cidades>",
  );
  const forecast = normalizeCptecForecastXml(`
    <cidade>
      <nome>Marilia</nome><uf>SP</uf><atualizacao>2026-07-09</atualizacao>
      <previsao><dia>2026-07-09</dia><tempo>pn</tempo><maxima>28</maxima><minima>16</minima><iuv>5.0</iuv></previsao>
      <previsao><dia>null</dia><tempo></tempo><maxima></maxima><minima></minima><iuv></iuv></previsao>
    </cidade>
  `);

  assert.equal(cities[0].id, "244");
  assert.equal(forecast.city, "Marilia");
  assert.equal(forecast.days.length, 1);
  assert.equal(forecast.days[0].condition, "Parcialmente nublado");
  assert.equal(forecast.days[0].uv, 5);
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

    if (decodedUrl.includes("servicos.cptec.inpe.br")) {
      const xml = "<cidade><nome>Marilia</nome><uf>SP</uf><atualizacao>2026-08-22</atualizacao><previsao><dia>2026-08-23</dia><tempo>pn</tempo><maxima>27</maxima><minima>16</minima><iuv>5</iuv></previsao></cidade>";
      return {
        ok: true,
        arrayBuffer: async () => new TextEncoder().encode(xml).buffer,
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

test("precise geolocation is never persisted in dashboard cache", async () => {
  const storage = createStorage();
  await fetchEarthSpaceDashboard({
    location: { ...DEFAULT_LOCATION, id: "geo-current", latitude: -22.21123, longitude: -49.95567 },
    fetchImpl: createDashboardFetch(),
    storage,
  });

  const serializedCache = [...storage.values.entries()].flat().join(" ");
  assert.doesNotMatch(serializedCache, /-22\.21123|-49\.95567/);
  assert.equal(storage.values.size, 1, "only the global fireball response may be cached");
});

test("proxy-dependent sources degrade without blocking weather", async () => {
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
  assert.equal(result.sources.find((source) => source.id === "cptec").state, "indisponivel");
  assert.equal(result.sources.find((source) => source.id === "fireballs").state, "indisponivel");
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
