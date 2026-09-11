const API_ORIGIN = "https://api.openweathermap.org";
const CACHE_TTL_MS = 10 * 60 * 1000;
const REQUEST_TIMEOUT_MS = 12000;
const MAX_CACHE_ENTRIES = 80;
const responseCache = new Map();
const AIR_COMPONENTS = ["co", "no", "no2", "o3", "so2", "pm2_5", "pm10", "nh3"];

export const OPEN_WEATHER_MAP_LAYERS = [
  { id: "clouds_new", label: "Nuvens", unit: "%" },
  { id: "precipitation_new", label: "Precipitacao", unit: "mm" },
  { id: "pressure_new", label: "Pressao", unit: "hPa" },
  { id: "wind_new", label: "Vento", unit: "m/s" },
  { id: "temp_new", label: "Temperatura", unit: "C" },
];

function apiError(code, message) {
  const error = new Error(message);
  error.code = code;
  return error;
}

function abortError() {
  return new DOMException("Consulta cancelada.", "AbortError");
}

function checkAborted(signal) {
  if (signal?.aborted) throw abortError();
}

function requireApiKey(value) {
  const key = typeof value === "string" ? value.trim() : "";
  if (!key) throw apiError("missing-key", "Configure sua chave OpenWeather para consultar esta fonte.");
  return key;
}

function finite(value) {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function coordinates(location) {
  const lat = finite(location?.latitude);
  const lon = finite(location?.longitude);
  if (lat === null || lon === null || Math.abs(lat) > 90 || Math.abs(lon) > 180) {
    throw apiError("location", "Localizacao invalida para consulta OpenWeather.");
  }
  return { lat, lon };
}

function responseError(status) {
  if (status === 401) return apiError("unauthorized", "Chave OpenWeather invalida ou ainda nao ativada.");
  if (status === 403) return apiError("forbidden", "Este recurso nao esta liberado para sua chave OpenWeather.");
  if (status === 429) return apiError("rate-limit", "Limite de consultas OpenWeather atingido. Tente novamente mais tarde.");
  return apiError("response", "A OpenWeather nao conseguiu atender esta consulta.");
}

async function request(path, parameters, options = {}) {
  const { signal, fetchImpl = globalThis.fetch, forceRefresh = false, timeoutMs = REQUEST_TIMEOUT_MS } = options;
  checkAborted(signal);
  const apiKey = requireApiKey(options.apiKey);
  const url = new URL(path, API_ORIGIN);
  for (const [key, value] of Object.entries({ ...parameters, appid: apiKey })) {
    url.searchParams.set(key, String(value));
  }
  const cacheKey = url.toString();
  const cached = responseCache.get(cacheKey);
  if (!forceRefresh && cached?.fetchImpl === fetchImpl && cached.expiresAt > Date.now()) return cached.value;

  const controller = new AbortController();
  const cancel = () => controller.abort();
  signal?.addEventListener("abort", cancel, { once: true });
  const timeoutId = setTimeout(cancel, timeoutMs);
  try {
    // Never send authenticated URLs through a public CORS proxy or persistent cache.
    const response = await fetchImpl(url.toString(), { signal: controller.signal, cache: "no-store", credentials: "omit", referrerPolicy: "no-referrer" });
    checkAborted(signal);
    if (!response.ok) throw responseError(response.status);
    const value = await response.json();
    checkAborted(signal);
    if (value?.cod && Number(value.cod) !== 200) throw responseError(Number(value.cod));
    if (responseCache.size >= MAX_CACHE_ENTRIES) responseCache.delete(responseCache.keys().next().value);
    responseCache.set(cacheKey, { value, fetchImpl, expiresAt: Date.now() + CACHE_TTL_MS });
    return value;
  } catch (error) {
    checkAborted(signal);
    if (controller.signal.aborted) throw apiError("timeout", "A OpenWeather demorou para responder. Tente novamente.");
    if (["unauthorized", "forbidden", "rate-limit", "response"].includes(error?.code)) throw error;
    throw apiError("network", "Nao foi possivel conectar a OpenWeather.");
  } finally {
    clearTimeout(timeoutId);
    signal?.removeEventListener("abort", cancel);
  }
}

function windKmh(value) {
  return finite(value) === null ? null : Math.round(value * 3.6 * 10) / 10;
}

function normalizeWeather(value) {
  const condition = Array.isArray(value?.weather) ? value.weather[0] : null;
  const probability = finite(value?.pop);
  return {
    time: finite(value?.dt),
    temp: finite(value?.main?.temp),
    feelsLike: finite(value?.main?.feels_like),
    tempMin: finite(value?.main?.temp_min),
    tempMax: finite(value?.main?.temp_max),
    humidity: finite(value?.main?.humidity),
    pressure: finite(value?.main?.pressure),
    seaLevel: finite(value?.main?.sea_level),
    groundLevel: finite(value?.main?.grnd_level),
    visibility: finite(value?.visibility),
    clouds: finite(value?.clouds?.all),
    windSpeed: windKmh(value?.wind?.speed),
    windGust: windKmh(value?.wind?.gust),
    windDirection: finite(value?.wind?.deg),
    rain1h: finite(value?.rain?.["1h"]) ?? 0,
    snow1h: finite(value?.snow?.["1h"]) ?? 0,
    rain3h: finite(value?.rain?.["3h"]) ?? 0,
    snow3h: finite(value?.snow?.["3h"]) ?? 0,
    probability: probability === null ? null : Math.round(probability * 100),
    sunrise: finite(value?.sys?.sunrise),
    sunset: finite(value?.sys?.sunset),
    description: typeof condition?.description === "string" ? condition.description : "",
    icon: typeof condition?.icon === "string" && /^\d{2}[dn]$/.test(condition.icon) ? condition.icon : null,
    conditionCode: finite(condition?.id),
    partOfDay: value?.sys?.pod === "n" ? "n" : value?.sys?.pod === "d" ? "d" : null,
  };
}

function normalizeAir(value) {
  return (Array.isArray(value?.list) ? value.list : [])
    .filter((item) => finite(item?.dt) !== null)
    .map((item) => ({
      time: item.dt,
      aqi: Number.isInteger(item.main?.aqi) && item.main.aqi >= 1 && item.main.aqi <= 5 ? item.main.aqi : null,
      components: Object.fromEntries(AIR_COMPONENTS.map((name) => [name, finite(item.components?.[name])])),
    }))
    .sort((a, b) => a.time - b.time);
}

export async function fetchOpenWeatherDashboard({ location, apiKey, fetchImpl, signal, forceRefresh = false, timeoutMs } = {}) {
  checkAborted(signal);
  requireApiKey(apiKey);
  const coords = coordinates(location);
  // A ten-minute boundary keeps the history URL stable for the in-memory cache.
  const end = Math.floor(Date.now() / CACHE_TTL_MS) * (CACHE_TTL_MS / 1000);
  const definitions = [
    { id: "current", label: "Clima atual", path: "/data/2.5/weather", params: { units: "metric", lang: "pt_br" } },
    { id: "forecast", label: "Previsao de 5 dias / 3 horas", path: "/data/2.5/forecast", params: { units: "metric", lang: "pt_br" } },
    { id: "airCurrent", label: "Qualidade do ar atual", path: "/data/2.5/air_pollution" },
    { id: "airForecast", label: "Previsao da qualidade do ar", path: "/data/2.5/air_pollution/forecast" },
    { id: "airHistory", label: "Historico do ar: ultimas 24 horas", path: "/data/2.5/air_pollution/history", params: { start: end - 86400, end } },
  ];
  const results = await Promise.allSettled(definitions.map(({ path, params }) => request(path, { ...coords, ...params }, { apiKey, fetchImpl, signal, forceRefresh, timeoutMs })));
  checkAborted(signal);
  const payloads = Object.fromEntries(definitions.map(({ id }, index) => [id, results[index].status === "fulfilled" ? results[index].value : null]));
  const current = finite(payloads.current?.dt) !== null && payloads.current?.main ? normalizeWeather(payloads.current) : null;
  const forecast = (Array.isArray(payloads.forecast?.list) ? payloads.forecast.list : [])
    .filter((item) => finite(item?.dt) !== null && item.main)
    .map(normalizeWeather)
    .sort((a, b) => a.time - b.time);
  const data = {
    current,
    forecast,
    airCurrent: normalizeAir(payloads.airCurrent),
    airForecast: normalizeAir(payloads.airForecast),
    airHistory: normalizeAir(payloads.airHistory),
    timezoneOffset: finite(payloads.current?.timezone) ?? finite(payloads.forecast?.city?.timezone),
    sunrise: finite(payloads.current?.sys?.sunrise) ?? finite(payloads.forecast?.city?.sunrise),
    sunset: finite(payloads.current?.sys?.sunset) ?? finite(payloads.forecast?.city?.sunset),
    fetchedAt: new Date().toISOString(),
  };
  data.sources = definitions.map(({ id, label }, index) => {
    const result = results[index];
    const populated = id === "current" ? Boolean(data.current) : data[id].length > 0;
    return {
      id,
      label,
      state: result.status === "rejected" ? "erro" : populated ? "online" : "sem-dados",
      detail: result.status === "rejected" ? result.reason.message : populated ? "Dados OpenWeather disponiveis." : "Sem dados para este local neste periodo.",
      errorCode: result.status === "rejected" ? result.reason.code : null,
    };
  });
  return data;
}

function normalizeLocation(value) {
  return {
    id: `openweather:${value.lat}:${value.lon}`,
    name: value.local_names?.pt || value.name || "Local selecionado",
    admin1: value.state || "",
    country: value.country || "",
    countryCode: value.country || "",
    latitude: value.lat,
    longitude: value.lon,
    timezone: "auto",
  };
}

export async function searchOpenWeatherLocations(query, options = {}) {
  checkAborted(options.signal);
  const text = typeof query === "string" ? query.trim() : "";
  if (text.length < 2) return [];
  const postal = /^(\d[\d -]*),\s*([a-z]{2})$/i.exec(text);
  if (postal) {
    const countryCode = postal[2].toUpperCase();
    const zip = countryCode === "BR" ? postal[1].replace(/\D/g, "") : postal[1].trim();
    const result = await request("/geo/1.0/zip", { zip: `${zip},${countryCode}` }, options);
    return finite(result?.lat) !== null && finite(result?.lon) !== null ? [normalizeLocation(result)] : [];
  }
  const results = await request("/geo/1.0/direct", { q: text, limit: 5 }, options);
  return (Array.isArray(results) ? results : [])
    .filter((value) => finite(value?.lat) !== null && finite(value?.lon) !== null)
    .map(normalizeLocation);
}

export async function reverseOpenWeatherLocation(location, options = {}) {
  const coords = coordinates(location);
  let result = null;
  try {
    const results = await request("/geo/1.0/reverse", { ...coords, limit: 1 }, options);
    result = Array.isArray(results) ? results[0] : null;
  } catch {
    checkAborted(options.signal);
    // Naming the location is optional; the browser coordinates still support weather queries.
  }
  return {
    ...normalizeLocation(result ?? {}),
    id: "geo-current",
    name: result?.local_names?.pt || result?.name || "Minha localizacao",
    latitude: coords.lat,
    longitude: coords.lon,
  };
}

export function clearOpenWeatherCache() {
  responseCache.clear();
}

export function buildOpenWeatherTileUrl(layer, apiKey) {
  if (!OPEN_WEATHER_MAP_LAYERS.some(({ id }) => id === layer)) throw apiError("layer", "Camada OpenWeather invalida.");
  return `https://tile.openweathermap.org/map/${layer}/{z}/{x}/{y}.png?appid=${encodeURIComponent(requireApiKey(apiKey))}`;
}
