import test, { beforeEach } from "node:test";
import assert from "node:assert/strict";
import {
  buildOpenWeatherTileUrl, clearOpenWeatherCache, fetchOpenWeatherDashboard,
  OPEN_WEATHER_MAP_LAYERS, reverseOpenWeatherLocation, searchOpenWeatherLocations,
} from "../src/services/openWeatherApi.js";

const location = { latitude: -22.2171, longitude: -49.9501 };
const apiKey = "openweather-test-only";
const weather = { dt: 1800000000, main: { temp: 0, feels_like: -1, temp_min: -2, temp_max: 4, humidity: 0, pressure: 1010, sea_level: 1012, grnd_level: 990 }, wind: { speed: 5, gust: 10, deg: 0 }, visibility: 0, clouds: { all: 0 }, weather: [{ id: 800, description: "ceu limpo", icon: "01d" }], sys: { sunrise: 1800000000, sunset: 1800040000 }, timezone: -10800 };
const air = { list: [{ dt: 1800000000, main: { aqi: 1 }, components: { co: 0, no: 1, no2: 2, o3: 3, so2: 4, pm2_5: 5, pm10: 6, nh3: 7 } }] };
function response(value, status = 200) { return { ok: status === 200, status, json: async () => structuredClone(value) }; }
function fixture(url) {
  const pathname = new URL(url).pathname;
  if (pathname === "/data/2.5/weather") return response(weather);
  if (pathname === "/data/2.5/forecast") return response({ cod: "200", city: { timezone: -10800 }, list: [{ ...weather, dt: weather.dt + 10800, pop: 0.35, rain: { "3h": 2 }, snow: { "3h": 1 } }, { ...weather, pop: 0 }] });
  return response(air);
}
beforeEach(clearOpenWeatherCache);

test("dashboard requests the five free endpoints and normalizes metric weather and eight pollutants", async () => {
  const calls = [];
  const data = await fetchOpenWeatherDashboard({ location, apiKey, fetchImpl: async (url, options) => { calls.push({ url: new URL(url), options }); return fixture(url); } });
  assert.deepEqual(calls.map(({ url }) => url.pathname), ["/data/2.5/weather", "/data/2.5/forecast", "/data/2.5/air_pollution", "/data/2.5/air_pollution/forecast", "/data/2.5/air_pollution/history"]);
  for (const { url, options } of calls) {
    assert.equal(url.origin, "https://api.openweathermap.org");
    assert.equal(url.searchParams.get("appid"), apiKey);
    assert.equal(url.searchParams.get("lat"), String(location.latitude));
    assert.equal(url.searchParams.get("lon"), String(location.longitude));
    assert.equal(options.cache, "no-store");
    assert.equal(options.credentials, "omit");
    assert.equal(options.referrerPolicy, "no-referrer");
  }
  for (const { url } of calls.slice(0, 2)) {
    assert.equal(url.searchParams.get("units"), "metric");
    assert.equal(url.searchParams.get("lang"), "pt_br");
  }
  const history = calls.at(-1).url.searchParams;
  assert.equal(Number(history.get("end")) - Number(history.get("start")), 86400);
  assert.ok(Math.abs(Date.now() / 1000 - Number(history.get("end"))) < 600);
  assert.equal(data.current.temp, 0);
  assert.equal(data.current.windSpeed, 18);
  assert.equal(data.current.windGust, 36);
  assert.equal(data.current.windDirection, 0);
  assert.equal(data.current.visibility, 0);
  assert.equal(data.current.humidity, 0);
  assert.equal(data.current.rain1h, 0);
  assert.deepEqual(data.forecast.map(({ probability }) => probability), [0, 35]);
  assert.equal(data.forecast[1].rain3h, 2);
  assert.equal(data.forecast[1].snow3h, 1);
  assert.equal(data.timezoneOffset, -10800);
  assert.deepEqual(data.airCurrent[0].components, air.list[0].components);
  assert.equal(data.airCurrent[0].aqi, 1);
  assert.ok(data.sources.every(({ state }) => state === "online"));
});

test("missing measurements remain null, invalid observations are excluded and zero observations survive", async () => {
  const data = await fetchOpenWeatherDashboard({ location, apiKey, fetchImpl: async (url) => {
    if (url.includes("air_pollution")) return response({ list: [{ dt: null }, { dt: 0, main: { aqi: 6 }, components: { co: 0, no: "1" } }] });
    if (new URL(url).pathname.endsWith("/forecast")) return response({ city: { timezone: 0, sunrise: 0, sunset: 1 }, list: [{ dt: 0, main: {} }, { dt: null, main: {} }] });
    return response({ dt: 0, main: {}, weather: [{ icon: "malicious-url" }] });
  } });
  assert.equal(data.current.temp, null);
  assert.equal(data.current.windSpeed, null);
  assert.equal(data.current.probability, null);
  assert.equal(data.current.icon, null);
  assert.equal(data.current.time, 0);
  assert.equal(data.forecast.length, 1);
  assert.equal(data.airCurrent.length, 1);
  assert.equal(data.airCurrent[0].aqi, null);
  assert.equal(data.airCurrent[0].components.co, 0);
  assert.equal(data.airCurrent[0].components.no, null);
  assert.equal(data.airCurrent[0].components.pm10, null);
  assert.equal(data.timezoneOffset, 0);
  assert.equal(data.sunrise, 0);
});

for (const [status, code] of [[401, "unauthorized"], [403, "forbidden"], [429, "rate-limit"], [500, "response"]]) {
  test(`HTTP ${status} reports a safe source error without disclosing the request or key`, async () => {
    const data = await fetchOpenWeatherDashboard({ location, apiKey, fetchImpl: async () => response({ message: apiKey }, status) });
    assert.equal(data.current, null);
    assert.ok(data.sources.every((source) => source.state === "erro" && source.errorCode === code && !source.detail.includes(apiKey)));
  });
}

test("HTTP 200 API errors, network failures and empty successes have distinct source states", async () => {
  const data = await fetchOpenWeatherDashboard({ location, apiKey, fetchImpl: async (url) => {
    const pathname = new URL(url).pathname;
    if (pathname.endsWith("/weather")) return response({ cod: "401" });
    if (pathname.endsWith("/forecast") && !pathname.includes("air_pollution")) throw new TypeError("offline");
    return response({ list: [] });
  } });
  assert.deepEqual(data.sources.map(({ errorCode }) => errorCode), ["unauthorized", "network", null, null, null]);
  assert.ok(data.sources.slice(2).every(({ state }) => state === "sem-dados"));
});

test("a failing product preserves successful products", async () => {
  const data = await fetchOpenWeatherDashboard({ location, apiKey, fetchImpl: async (url) => url.includes("air_pollution/history") ? response({}, 403) : fixture(url) });
  assert.equal(data.current.temp, 0);
  assert.equal(data.forecast.length, 2);
  assert.equal(data.airForecast.length, 1);
  assert.deepEqual(data.sources.map(({ state }) => state), ["online", "online", "online", "online", "erro"]);
});

function pendingFetch(_url, { signal }) {
  return new Promise((_resolve, reject) => signal.addEventListener("abort", () => reject(new DOMException("aborted", "AbortError")), { once: true }));
}
test("request timeouts are recoverable source errors", async () => {
  const data = await fetchOpenWeatherDashboard({ location, apiKey, timeoutMs: 5, fetchImpl: pendingFetch });
  assert.ok(data.sources.every(({ errorCode }) => errorCode === "timeout"));
});

test("abort before and during requests rejects the whole stale dashboard", async () => {
  const stopped = new AbortController();
  stopped.abort();
  let count = 0;
  await assert.rejects(fetchOpenWeatherDashboard({ location, apiKey, signal: stopped.signal, fetchImpl: async () => { count++; } }), { name: "AbortError" });
  assert.equal(count, 0);
  const controller = new AbortController();
  const pending = fetchOpenWeatherDashboard({ location, apiKey, signal: controller.signal, fetchImpl: pendingFetch });
  controller.abort();
  await assert.rejects(pending, { name: "AbortError" });
});

test("keys and coordinates are validated before making requests", async () => {
  let count = 0;
  const fetchImpl = async () => { count++; return response({}); };
  await assert.rejects(fetchOpenWeatherDashboard({ location, apiKey: " ", fetchImpl }), { code: "missing-key" });
  for (const invalid of [{ latitude: 91, longitude: 0 }, { latitude: 0, longitude: -181 }, { latitude: "0", longitude: 0 }]) {
    await assert.rejects(fetchOpenWeatherDashboard({ location: invalid, apiKey, fetchImpl }), { code: "location" });
  }
  assert.equal(count, 0);
});

test("memory cache expires at ten minutes and isolates key, location and forced refresh", async (t) => {
  const originalNow = Date.now;
  let now = 1800000000000;
  Date.now = () => now;
  t.after(() => { Date.now = originalNow; });
  let count = 0;
  const fetchImpl = async (url) => { count++; return fixture(url); };
  const options = { location, apiKey, fetchImpl };
  await fetchOpenWeatherDashboard(options);
  await fetchOpenWeatherDashboard(options);
  assert.equal(count, 5);
  now += 599999;
  await fetchOpenWeatherDashboard(options);
  assert.equal(count, 5);
  now += 1;
  await fetchOpenWeatherDashboard(options);
  assert.equal(count, 10);
  await fetchOpenWeatherDashboard({ ...options, apiKey: "another-test-key" });
  assert.equal(count, 15);
  await fetchOpenWeatherDashboard({ ...options, location: { ...location, latitude: 0 } });
  assert.equal(count, 20);
  await fetchOpenWeatherDashboard({ ...options, forceRefresh: true });
  assert.equal(count, 25);
  clearOpenWeatherCache();
  await fetchOpenWeatherDashboard(options);
  assert.equal(count, 30);
});

test("city geocoding skips short queries and asks for at most five named matches", async () => {
  let request;
  const options = { apiKey, fetchImpl: async (url) => { request = new URL(url); return response([{ lat: 0, lon: 0, name: "City", local_names: { pt: "Cidade" }, state: "SP", country: "BR" }, { lat: "bad", lon: 0 }]); } };
  assert.deepEqual(await searchOpenWeatherLocations(" a ", options), []);
  assert.equal(request, undefined);
  const result = await searchOpenWeatherLocations(" Cidade,BR ", options);
  assert.equal(request.pathname, "/geo/1.0/direct");
  assert.equal(request.searchParams.get("q"), "Cidade,BR");
  assert.equal(request.searchParams.get("limit"), "5");
  assert.equal(result.length, 1);
  assert.equal(result[0].name, "Cidade");
  assert.equal(result[0].latitude, 0);
  assert.equal(result[0].countryCode, "BR");
});

for (const [query, expected] of [["17500-000,br", "17500000,BR"], ["10001,US", "10001,US"]]) {
  test(`postal geocoding normalizes ${query}`, async () => {
    const result = await searchOpenWeatherLocations(query, { apiKey, fetchImpl: async (url) => {
      const request = new URL(url);
      assert.equal(request.pathname, "/geo/1.0/zip");
      assert.equal(request.searchParams.get("zip"), expected);
      return response({ lat: 0, lon: 0, name: "Postal city" });
    } });
    assert.equal(result[0].name, "Postal city");
  });
}

test("reverse geocoding uses names but always preserves the exact browser coordinates", async () => {
  const result = await reverseOpenWeatherLocation(location, { apiKey, fetchImpl: async (url) => {
    assert.equal(new URL(url).pathname, "/geo/1.0/reverse");
    assert.equal(new URL(url).searchParams.get("limit"), "1");
    return response([{ lat: 1, lon: 2, name: "Nearest city" }]);
  } });
  assert.equal(result.name, "Nearest city");
  assert.equal(result.id, "geo-current");
  assert.equal(result.latitude, location.latitude);
  assert.equal(result.longitude, location.longitude);
});

test("reverse geocoding empty and unauthorized results fall back, while abort propagates", async () => {
  for (const fetchImpl of [async () => response([]), async () => response({}, 401)]) {
    const result = await reverseOpenWeatherLocation(location, { apiKey, fetchImpl });
    assert.equal(result.name, "Minha localizacao");
    assert.equal(result.latitude, location.latitude);
    assert.equal(result.id, "geo-current");
  }
  const controller = new AbortController();
  controller.abort();
  await assert.rejects(reverseOpenWeatherLocation(location, { apiKey, signal: controller.signal }), { name: "AbortError" });
  await assert.rejects(searchOpenWeatherLocations("City", { apiKey, signal: controller.signal }), { name: "AbortError" });
});

test("only the five free map layers can generate tile URLs", () => {
  assert.deepEqual(OPEN_WEATHER_MAP_LAYERS.map(({ id }) => id), ["clouds_new", "precipitation_new", "pressure_new", "wind_new", "temp_new"]);
  for (const { id } of OPEN_WEATHER_MAP_LAYERS) {
    assert.equal(buildOpenWeatherTileUrl(id, "test + & key"), `https://tile.openweathermap.org/map/${id}/{z}/{x}/{y}.png?appid=test%20%2B%20%26%20key`);
  }
  assert.throws(() => buildOpenWeatherTileUrl("paid-layer", apiKey), { code: "layer" });
  assert.throws(() => buildOpenWeatherTileUrl("temp_new", ""), { code: "missing-key" });
});
