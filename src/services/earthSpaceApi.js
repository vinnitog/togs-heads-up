export const DEFAULT_LOCATION = {
  id: "marilia-sp",
  name: "Marília",
  admin1: "São Paulo",
  country: "Brasil",
  countryCode: "BR",
  latitude: -22.2171,
  longitude: -49.9501,
  timezone: "America/Sao_Paulo",
  cptecId: "244",
};

const DEFAULT_TIMEOUT_MS = 12000;
// Requisicoes via proxy de CORS falham mais rapido: um proxy publico lento
// nao deve segurar o painel inteiro por 12s antes de cair para erro/cache.
const PROXY_TIMEOUT_MS = 8000;
const CPTEC_BASE_URL = "https://servicos.cptec.inpe.br/XML";
const JPL_SSD_BASE_URL = "https://ssd-api.jpl.nasa.gov";

// Cache local (localStorage) para evitar rate limit e falhas transitorias.
// Cada fonte so vai a rede quando o cache "fresco" expira (TTL). Se a rede
// falhar, exibimos o ultimo valor bom enquanto ele nao estiver muito velho.
// A versao do prefixo invalida caches antigos quando o formato ou o parsing
// muda (ex.: XML do CPTEC salvo com acentos quebrados na v1).
const CACHE_NAMESPACE = "togs-cache:";
const CACHE_PREFIX = `${CACHE_NAMESPACE}v4:`;
const MINUTE = 60 * 1000;
const HOUR = 60 * MINUTE;

const CACHE_TTL_MS = {
  weather: 15 * MINUTE,
  cptec: 3 * HOUR,
  fireballs: 3 * HOUR,
};

// Ate quando um valor expirado ainda serve como fallback em caso de falha.
const CACHE_STALE_MAX_MS = 24 * HOUR;

// Proxy de CORS para fontes que nao enviam Access-Control-Allow-Origin
// (CPTEC/INPE e JPL SSD). Configuravel via VITE_CORS_PROXY; use {url} como
// marcador do endpoint alvo. Padrao: allorigins (GET publico, sem chave).
const DEFAULT_CORS_PROXY = "https://api.allorigins.win/raw?url={url}";

function getCorsProxy(env = readViteEnv()) {
  // String vazia desativa o proxy explicitamente.
  const configured = env.VITE_CORS_PROXY;
  if (configured === "" ) return "";
  return normalizeText(configured, DEFAULT_CORS_PROXY);
}

function buildProxiedUrl(targetUrl, proxyTemplate) {
  const template = normalizeText(proxyTemplate);
  if (!template) return null;
  const encoded = encodeURIComponent(targetUrl);
  return template.includes("{url}") ? template.replace("{url}", encoded) : `${template}${encoded}`;
}

function delay(ms, signal) {
  return new Promise((resolve, reject) => {
    const timeoutId = setTimeout(resolve, ms);
    if (signal) {
      if (signal.aborted) {
        clearTimeout(timeoutId);
        reject(signal.reason ?? new DOMException("Aborted", "AbortError"));
        return;
      }
      signal.addEventListener(
        "abort",
        () => {
          clearTimeout(timeoutId);
          reject(signal.reason ?? new DOMException("Aborted", "AbortError"));
        },
        { once: true },
      );
    }
  });
}

function getDefaultStorage() {
  try {
    if (typeof globalThis !== "undefined" && globalThis.localStorage) {
      return globalThis.localStorage;
    }
  } catch {
    // Acesso a localStorage pode lancar (modo privativo/SSR). Segue sem cache.
  }
  return null;
}

function readCacheEntry(storage, key) {
  if (!storage) return null;
  try {
    const raw = storage.getItem(CACHE_PREFIX + key);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed.storedAt !== "number") return null;
    return parsed;
  } catch {
    return null;
  }
}

function pruneDashboardCache(storage) {
  if (!storage || typeof storage.key !== "function" || typeof storage.removeItem !== "function") return;

  try {
    const storageLength = storage.length;
    if (typeof storageLength !== "number") return;

    for (let index = storageLength - 1; index >= 0; index -= 1) {
      const key = storage.key(index);
      if (!key?.startsWith(CACHE_NAMESPACE)) continue;

      if (!key.startsWith(CACHE_PREFIX)) {
        storage.removeItem(key);
        continue;
      }

      try {
        const entry = JSON.parse(storage.getItem(key));
        const ageMs = Date.now() - Number(entry?.storedAt);
        if (!Number.isFinite(ageMs) || ageMs < 0 || ageMs >= CACHE_STALE_MAX_MS) storage.removeItem(key);
      } catch {
        // Uma entrada corrompida nao deve interromper a limpeza das demais.
        storage.removeItem(key);
      }
    }
  } catch {
    // localStorage pode ficar indisponivel por politica do navegador. Limpeza
    // de cache e best-effort e nunca deve impedir as consultas do dashboard.
  }
}

function writeCacheEntry(storage, key, value) {
  if (!storage) return;
  try {
    storage.setItem(CACHE_PREFIX + key, JSON.stringify({ storedAt: Date.now(), value }));
  } catch {
    // Cota cheia ou storage indisponivel: ignora, cache e best-effort.
  }
}

function isRetriableError(error) {
  if (!error || error.name === "AbortError") return false;
  const status = error.status;
  // Sem status = falha de rede/CORS. 5xx transitorio. Nunca 429 (rate limit).
  return status === undefined || status === 502 || status === 503 || status === 504;
}

async function withRetry(fn, { retries = 1, baseDelayMs = 500, signal } = {}) {
  let attempt = 0;
  for (;;) {
    try {
      return await fn();
    } catch (error) {
      if (attempt >= retries || !isRetriableError(error)) throw error;
      attempt += 1;
      await delay(baseDelayMs * attempt, signal);
    }
  }
}

const WMO_DESCRIPTIONS = {
  0: "Céu limpo",
  1: "Poucas nuvens",
  2: "Parcialmente nublado",
  3: "Nublado",
  45: "Nevoeiro",
  48: "Nevoeiro intenso",
  51: "Garoa fraca",
  53: "Garoa moderada",
  55: "Garoa forte",
  61: "Chuva fraca",
  63: "Chuva moderada",
  65: "Chuva forte",
  80: "Pancadas fracas",
  81: "Pancadas moderadas",
  82: "Pancadas fortes",
  95: "Tempestade",
  96: "Tempestade com granizo",
  99: "Tempestade severa",
};

const CPTEC_DESCRIPTIONS = {
  ec: "Encoberto com chuva isolada",
  ci: "Chuvas isoladas",
  c: "Chuva",
  in: "Instável",
  pp: "Possibilidade de pancadas",
  cm: "Chuva pela manhã",
  cn: "Chuva à noite",
  pt: "Pancadas à tarde",
  pm: "Pancadas pela manhã",
  np: "Nublado com pancadas",
  pc: "Pancadas de chuva",
  pn: "Parcialmente nublado",
  cv: "Chuvisco",
  ch: "Chuvoso",
  t: "Tempestade",
  ps: "Predomínio de sol",
  e: "Encoberto",
  n: "Nublado",
  cl: "Céu claro",
  nv: "Nevoeiro",
  g: "Geada",
  ne: "Neve",
  nd: "Não definido",
  pnt: "Pancadas à noite",
  psc: "Possibilidade de chuva",
  pcm: "Possibilidade de chuva pela manhã",
  pct: "Possibilidade de chuva à tarde",
  pcn: "Possibilidade de chuva à noite",
  npt: "Nublado com pancadas à tarde",
  npn: "Nublado com pancadas à noite",
  ncn: "Nublado com chuva à noite",
  nct: "Nublado com chuva à tarde",
  ncm: "Nublado com chuva pela manhã",
  npm: "Nublado com pancadas pela manhã",
  npp: "Nublado com possibilidade de chuva",
  vn: "Variação de nebulosidade",
  ct: "Chuva à tarde",
  ppn: "Possibilidade de pancadas à noite",
  ppt: "Possibilidade de pancadas à tarde",
  ppm: "Possibilidade de pancadas pela manhã",
};

const BRAZIL_STATE_CODES = {
  acre: "AC",
  alagoas: "AL",
  amapa: "AP",
  amazonas: "AM",
  bahia: "BA",
  ceara: "CE",
  "distrito federal": "DF",
  "espirito santo": "ES",
  goias: "GO",
  maranhao: "MA",
  "mato grosso": "MT",
  "mato grosso do sul": "MS",
  "minas gerais": "MG",
  para: "PA",
  paraiba: "PB",
  parana: "PR",
  pernambuco: "PE",
  piaui: "PI",
  "rio de janeiro": "RJ",
  "rio grande do norte": "RN",
  "rio grande do sul": "RS",
  rondonia: "RO",
  roraima: "RR",
  "santa catarina": "SC",
  "sao paulo": "SP",
  sergipe: "SE",
  tocantins: "TO",
};

function readViteEnv() {
  return typeof import.meta !== "undefined" && import.meta.env ? import.meta.env : {};
}

function toFiniteNumber(value, fallback = null) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function normalizeText(value, fallback = "") {
  if (value === null || value === undefined) return fallback;
  return String(value).trim() || fallback;
}

function normalizeSearchText(value) {
  return normalizeText(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("pt-BR");
}

function compactNumber(value, digits = 0) {
  const number = toFiniteNumber(value);
  if (number === null) return null;
  return Number(number.toFixed(digits));
}

function mergeSignals(parentSignal, timeoutMs) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  function abort() {
    controller.abort();
  }

  if (parentSignal) {
    if (parentSignal.aborted) controller.abort();
    else parentSignal.addEventListener("abort", abort, { once: true });
  }

  return {
    signal: controller.signal,
    cleanup() {
      clearTimeout(timeoutId);
      parentSignal?.removeEventListener?.("abort", abort);
    },
  };
}

async function rawRequest(url, { fetchImpl, signal, timeoutMs, accept }) {
  const requestSignal = mergeSignals(signal, timeoutMs);

  try {
    const response = await fetchImpl(url, {
      headers: { Accept: accept },
      signal: requestSignal.signal,
    });

    if (!response.ok) {
      const error = new Error(`HTTP ${response.status}`);
      error.status = response.status;
      throw error;
    }

    return response;
  } finally {
    requestSignal.cleanup();
  }
}

// Hosts conhecidos por nao enviarem cabecalhos CORS: vao direto pelo proxy,
// evitando o erro de CORS ruidoso no console antes de um fallback.
const NO_CORS_HOSTS = ["servicos.cptec.inpe.br", "ssd-api.jpl.nasa.gov"];

function needsProxy(url) {
  return NO_CORS_HOSTS.some((host) => url.includes(host));
}

// Erro de rede/CORS chega como TypeError sem status HTTP.
function isNetworkError(error) {
  return Boolean(error) && error.name !== "AbortError" && error.status === undefined;
}

async function request(url, options) {
  const proxied = options.viaProxy ? null : buildProxiedUrl(url, options.corsProxy);
  const proxyOptions = {
    ...options,
    viaProxy: true,
    timeoutMs: Math.min(options.timeoutMs ?? DEFAULT_TIMEOUT_MS, PROXY_TIMEOUT_MS),
  };

  // Fontes sem CORS (CPTEC/JPL): so pelo proxy. Tentar direto sempre falha por
  // CORS, poluindo o console e disparando retry a toa, entao nem tentamos.
  if (needsProxy(url) && proxied && proxied !== url) {
    return rawRequest(proxied, proxyOptions);
  }

  // Demais fontes: direto, com fallback para o proxy so em erro de rede/CORS.
  try {
    return await rawRequest(url, options);
  } catch (error) {
    if (isNetworkError(error) && proxied && proxied !== url) {
      return rawRequest(proxied, proxyOptions);
    }
    throw error;
  }
}

async function fetchJson(url, options) {
  const response = await request(url, { ...options, accept: "application/json" });
  if (typeof response.json === "function") return response.json();
  return JSON.parse(await response.text());
}

function decodeWith(label, buffer) {
  try {
    return new TextDecoder(label).decode(buffer);
  } catch {
    return new TextDecoder("utf-8").decode(buffer);
  }
}

// A declaracao do XML (<?xml ... encoding="ISO-8859-1"?>) e ASCII puro, entao
// pode ser lida com qualquer decoder de byte unico antes de escolher o correto.
function readDeclaredEncoding(buffer) {
  const head = decodeWith("iso-8859-1", buffer.slice(0, 200));
  const match = head.match(/<\?xml[^>]*encoding=["']([^"']+)["']/i);
  return match ? match[1].toLocaleLowerCase("en-US") : "";
}

// O CPTEC serve XML em ISO-8859-1, mas o proxy de CORS nao repassa o charset
// original. Sem isso, response.text() decodifica como UTF-8 e os acentos viram
// U+FFFD ("Sao Paulo" -> "S?o Paulo").
function decodeXmlBytes(buffer) {
  const declared = readDeclaredEncoding(buffer);
  if (declared && !declared.startsWith("utf")) return decodeWith(declared, buffer);

  const utf8 = decodeWith("utf-8", buffer);
  if (!utf8.includes("�")) return utf8;

  return decodeWith("iso-8859-1", buffer);
}

async function fetchText(url, options) {
  const response = await request(url, { ...options, accept: "application/xml,text/xml,text/plain" });

  if (typeof response.arrayBuffer === "function" && typeof TextDecoder === "function") {
    return decodeXmlBytes(await response.arrayBuffer());
  }

  if (typeof response.text === "function") return response.text();
  return "";
}

function getWeatherDescription(code) {
  return WMO_DESCRIPTIONS[Math.round(Number(code))] ?? "Condição variável";
}

function getCptecDescription(code) {
  return CPTEC_DESCRIPTIONS[normalizeText(code).toLocaleLowerCase("pt-BR")] ?? "Condição não informada";
}

function readIndexed(source, index, fallback = null) {
  return Array.isArray(source) && index >= 0 ? source[index] ?? fallback : fallback;
}

function indexOfField(fields, name) {
  return Array.isArray(fields) ? fields.indexOf(name) : -1;
}

function decodeXml(value) {
  return normalizeText(value)
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

function getXmlTag(block, tag) {
  const match = String(block).match(new RegExp(`<${tag}>([\\s\\S]*?)<\\/${tag}>`, "i"));
  return decodeXml(match?.[1] ?? "");
}

function getXmlBlocks(xml, tag) {
  return [...String(xml).matchAll(new RegExp(`<${tag}>([\\s\\S]*?)<\\/${tag}>`, "gi"))].map((match) => match[1]);
}

function createSourceStatus(id, label, state, detail) {
  return { id, label, state, detail };
}

function hasUsefulData(value) {
  if (!value) return false;
  if (Array.isArray(value)) return value.length > 0;
  if (typeof value !== "object") return true;

  return Object.values(value).some((entry) => {
    if (Array.isArray(entry)) return entry.length > 0;
    return entry !== null && entry !== undefined && entry !== "";
  });
}

function locationMatchesMarilia(location) {
  return (
    normalizeSearchText(location?.name).includes("marilia") &&
    normalizeSearchText(location?.admin1).includes("sao paulo")
  );
}

export function buildLocationLabel(location = DEFAULT_LOCATION) {
  return [location.name, location.admin1, location.country].filter(Boolean).join(", ");
}

export function buildOpenMeteoForecastUrl(location = DEFAULT_LOCATION) {
  const params = new URLSearchParams({
    latitude: String(location.latitude),
    longitude: String(location.longitude),
    current:
      "temperature_2m,relative_humidity_2m,apparent_temperature,is_day,precipitation,rain,weather_code,cloud_cover,pressure_msl,wind_speed_10m,wind_direction_10m,wind_gusts_10m",
    hourly: "temperature_2m,precipitation_probability,precipitation,cloud_cover,wind_gusts_10m",
    daily:
      "weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,precipitation_sum,uv_index_max,wind_speed_10m_max,sunrise,sunset",
    wind_speed_unit: "kmh",
    precipitation_unit: "mm",
    timezone: location.timezone || "auto",
    forecast_days: "7",
  });

  return `https://api.open-meteo.com/v1/forecast?${params.toString()}`;
}

export function buildGeocodingUrl(query) {
  const params = new URLSearchParams({
    name: normalizeText(query),
    count: "6",
    language: "pt",
    format: "json",
  });

  return `https://geocoding-api.open-meteo.com/v1/search?${params.toString()}`;
}

// Reverse geocoding publico, sem chave e com CORS liberado. Usado apenas para
// dar nome as coordenadas devolvidas pelo navegador.
export function buildReverseGeocodingUrl({ latitude, longitude }) {
  const params = new URLSearchParams({
    latitude: String(latitude),
    longitude: String(longitude),
    localityLanguage: "pt",
  });

  return `https://api.bigdatacloud.net/data/reverse-geocode-client?${params.toString()}`;
}

export function normalizeReverseGeocodingResult(payload, { latitude, longitude }) {
  return {
    id: "geo-current",
    name: normalizeText(payload?.city || payload?.locality, "Minha localização"),
    admin1: normalizeText(payload?.principalSubdivision),
    country: normalizeText(payload?.countryName),
    countryCode: normalizeText(payload?.countryCode),
    latitude: toFiniteNumber(latitude, DEFAULT_LOCATION.latitude),
    longitude: toFiniteNumber(longitude, DEFAULT_LOCATION.longitude),
    timezone: "auto",
  };
}

export function buildCptecCitySearchUrl(query) {
  return `${CPTEC_BASE_URL}/listaCidades?city=${encodeURIComponent(normalizeText(query))}`;
}

export function buildCptecForecastUrl(cityId = DEFAULT_LOCATION.cptecId) {
  return `${CPTEC_BASE_URL}/cidade/${encodeURIComponent(cityId)}/previsao.xml`;
}

export function buildFireballUrl(limit = 8) {
  const params = new URLSearchParams({ limit: String(limit), "req-loc": "true" });
  return `${JPL_SSD_BASE_URL}/fireball.api?${params.toString()}`;
}

export function normalizeGeocodingResults(payload) {
  return (Array.isArray(payload?.results) ? payload.results : []).map((place) => ({
    id: String(place.id ?? `${place.latitude}-${place.longitude}`),
    name: normalizeText(place.name),
    admin1: normalizeText(place.admin1),
    country: normalizeText(place.country),
    countryCode: normalizeText(place.country_code),
    latitude: toFiniteNumber(place.latitude, DEFAULT_LOCATION.latitude),
    longitude: toFiniteNumber(place.longitude, DEFAULT_LOCATION.longitude),
    timezone: normalizeText(place.timezone, "auto"),
  }));
}

export function normalizeWeatherPayload(payload, location = DEFAULT_LOCATION) {
  const current = payload?.current ?? {};
  const daily = payload?.daily ?? {};
  const hourly = payload?.hourly ?? {};

  return {
    location,
    timezone: normalizeText(payload?.timezone, location.timezone),
    current: {
      time: normalizeText(current.time),
      temperature: compactNumber(current.temperature_2m, 1),
      apparentTemperature: compactNumber(current.apparent_temperature, 1),
      humidity: compactNumber(current.relative_humidity_2m),
      precipitation: compactNumber(current.precipitation, 1),
      rain: compactNumber(current.rain, 1),
      weatherCode: compactNumber(current.weather_code),
      condition: getWeatherDescription(current.weather_code),
      cloudCover: compactNumber(current.cloud_cover),
      pressure: compactNumber(current.pressure_msl),
      windSpeed: compactNumber(current.wind_speed_10m),
      windDirection: compactNumber(current.wind_direction_10m),
      windGusts: compactNumber(current.wind_gusts_10m),
      isDay: current.is_day === 1,
    },
    daily: (daily.time ?? []).map((date, index) => ({
      date,
      condition: getWeatherDescription(readIndexed(daily.weather_code, index)),
      max: compactNumber(readIndexed(daily.temperature_2m_max, index), 1),
      min: compactNumber(readIndexed(daily.temperature_2m_min, index), 1),
      rainProbability: compactNumber(readIndexed(daily.precipitation_probability_max, index)),
      precipitation: compactNumber(readIndexed(daily.precipitation_sum, index), 1),
      uv: compactNumber(readIndexed(daily.uv_index_max, index), 1),
      wind: compactNumber(readIndexed(daily.wind_speed_10m_max, index)),
      sunrise: normalizeText(readIndexed(daily.sunrise, index)),
      sunset: normalizeText(readIndexed(daily.sunset, index)),
    })),
    hourly: (hourly.time ?? []).slice(0, 24).map((time, index) => ({
      time,
      hour: normalizeText(time).slice(11, 16),
      temperature: compactNumber(readIndexed(hourly.temperature_2m, index), 1),
      rainProbability: compactNumber(readIndexed(hourly.precipitation_probability, index)),
      precipitation: compactNumber(readIndexed(hourly.precipitation, index), 1),
      cloudCover: compactNumber(readIndexed(hourly.cloud_cover, index)),
      gusts: compactNumber(readIndexed(hourly.wind_gusts_10m, index)),
    })),
  };
}

export function normalizeCptecCitySearchXml(xml) {
  return getXmlBlocks(xml, "cidade").map((block) => ({
    id: getXmlTag(block, "id"),
    name: getXmlTag(block, "nome"),
    uf: getXmlTag(block, "uf"),
  }));
}

// Number("") e Number("null") nao servem aqui: o primeiro vira 0 (temperatura
// falsa) e o segundo NaN. Campos vazios do CPTEC devem virar null.
function readXmlNumber(block, tag) {
  const raw = getXmlTag(block, tag);
  return raw === "" || raw === "null" ? null : toFiniteNumber(raw);
}

const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export function normalizeCptecForecastXml(xml) {
  const cityBlock = String(xml);
  const days = getXmlBlocks(xml, "previsao")
    .map((block) => {
      const code = getXmlTag(block, "tempo");
      return {
        date: getXmlTag(block, "dia"),
        code,
        condition: getCptecDescription(code),
        max: readXmlNumber(block, "maxima"),
        min: readXmlNumber(block, "minima"),
        uv: readXmlNumber(block, "iuv"),
      };
    })
    // O CPTEC as vezes devolve um bloco final sem dia/tempo ("<dia>null</dia>").
    .filter((day) => ISO_DATE_PATTERN.test(day.date));

  return {
    city: getXmlTag(cityBlock, "nome"),
    uf: getXmlTag(cityBlock, "uf"),
    updatedAt: getXmlTag(cityBlock, "atualizacao"),
    days,
  };
}

export function normalizeFireballPayload(payload) {
  const fields = payload?.fields ?? [];
  const data = Array.isArray(payload?.data) ? payload.data : [];

  return data.map((row) => {
    const lat = toFiniteNumber(readIndexed(row, indexOfField(fields, "lat")));
    const lon = toFiniteNumber(readIndexed(row, indexOfField(fields, "lon")));
    const latDir = normalizeText(readIndexed(row, indexOfField(fields, "lat-dir")));
    const lonDir = normalizeText(readIndexed(row, indexOfField(fields, "lon-dir")));

    return {
      date: normalizeText(readIndexed(row, indexOfField(fields, "date"))),
      latitude: lat === null ? null : lat * (latDir === "S" ? -1 : 1),
      longitude: lon === null ? null : lon * (lonDir === "W" ? -1 : 1),
      altitudeKm: compactNumber(readIndexed(row, indexOfField(fields, "alt")), 1),
      energy: compactNumber(readIndexed(row, indexOfField(fields, "energy")), 1),
      impactEnergyKt: compactNumber(readIndexed(row, indexOfField(fields, "impact-e")), 3),
    };
  });
}

async function fetchCptecForecastForLocation(location, options) {
  if (location.countryCode && location.countryCode !== "BR") {
    return null;
  }

  let cityId = location.cptecId;

  if (!cityId && locationMatchesMarilia(location)) {
    cityId = DEFAULT_LOCATION.cptecId;
  }

  if (!cityId) {
    const cityXml = await fetchText(buildCptecCitySearchUrl(location.name), options);
    const cities = normalizeCptecCitySearchXml(cityXml);
    const state = BRAZIL_STATE_CODES[normalizeSearchText(location.admin1)] ?? normalizeText(location.admin1).toUpperCase();
    const city = cities.find((item) => normalizeText(item.uf).toUpperCase() === state) ?? cities[0];
    cityId = city?.id;
  }

  if (!cityId) return null;

  const forecastXml = await fetchText(buildCptecForecastUrl(cityId), options);
  return normalizeCptecForecastXml(forecastXml);
}

export async function searchLocations(query, { fetchImpl = globalThis.fetch, signal, timeoutMs = DEFAULT_TIMEOUT_MS } = {}) {
  if (!normalizeText(query)) return [];
  if (typeof fetchImpl !== "function") throw new Error("Fetch API indisponível neste ambiente.");

  const payload = await fetchJson(buildGeocodingUrl(query), { fetchImpl, signal, timeoutMs });
  return normalizeGeocodingResults(payload);
}

export async function resolveLocationFromCoords(
  coords,
  { fetchImpl = globalThis.fetch, signal, timeoutMs = DEFAULT_TIMEOUT_MS } = {},
) {
  if (typeof fetchImpl !== "function") throw new Error("Fetch API indisponível neste ambiente.");

  try {
    const payload = await fetchJson(buildReverseGeocodingUrl(coords), { fetchImpl, signal, timeoutMs });
    return normalizeReverseGeocodingResult(payload, coords);
  } catch (error) {
    // Um AbortError sem cancelamento do chamador e apenas o timeout interno da
    // consulta de nome. As coordenadas ainda sao suficientes para o clima.
    if (signal?.aborted) throw error;
    // Sem o nome do lugar o painel ainda funciona: as coordenadas bastam para o
    // Open-Meteo. Só o CPTEC/INPE fica sem cidade para consultar.
    return normalizeReverseGeocodingResult(null, coords);
  }
}

export async function fetchEarthSpaceDashboard({
  location = DEFAULT_LOCATION,
  env = readViteEnv(),
  fetchImpl = globalThis.fetch,
  signal,
  timeoutMs = DEFAULT_TIMEOUT_MS,
  storage = getDefaultStorage(),
  forceRefresh = false,
} = {}) {
  if (typeof fetchImpl !== "function") throw new Error("Fetch API indisponível neste ambiente.");

  pruneDashboardCache(storage);
  const options = { fetchImpl, signal, timeoutMs, corsProxy: getCorsProxy(env) };
  const locationScope = `${location.latitude},${location.longitude}`;
  const storesPreciseLocation = String(location.id).startsWith("geo-");
  const tasks = [
    {
      key: "weather",
      label: "Open-Meteo",
      scope: locationScope,
      cacheable: !storesPreciseLocation,
      run: async () => normalizeWeatherPayload(await fetchJson(buildOpenMeteoForecastUrl(location), options), location),
    },
    {
      key: "cptec",
      label: "CPTEC/INPE",
      scope: locationScope,
      cacheable: !storesPreciseLocation,
      proxyDependent: true,
      run: async () => fetchCptecForecastForLocation(location, options),
    },
    {
      key: "fireballs",
      label: "Bolas de fogo — NASA/JPL",
      proxyDependent: true,
      run: async () => normalizeFireballPayload(await fetchJson(buildFireballUrl(), options)),
    },
  ];

  const outcomes = await Promise.all(
    tasks.map((task) => runDashboardTask(task, { storage, forceRefresh, signal })),
  );

  const data = {};
  const sources = [];
  const warnings = [];

  outcomes.forEach((outcome) => {
    data[outcome.key] = outcome.value;
    sources.push(createSourceStatus(outcome.key, outcome.label, outcome.state, outcome.detail));
    if (outcome.warning) warnings.push(outcome.warning);
  });

  return {
    location,
    ...data,
    sources,
    warnings,
    fetchedAt: new Date().toISOString(),
  };
}

const EMPTY_TASK_VALUE = { weather: null, cptec: null };

function emptyValueForTask(key) {
  return key in EMPTY_TASK_VALUE ? EMPTY_TASK_VALUE[key] : [];
}

async function runDashboardTask(task, { storage, forceRefresh, signal }) {
  const cacheKey = `${task.key}:${task.scope ?? "global"}`;
  const cached = task.cacheable === false ? null : readCacheEntry(storage, cacheKey);
  const ttl = CACHE_TTL_MS[task.key] ?? 0;
  const ageMs = cached ? Date.now() - cached.storedAt : Infinity;

  // Cache fresco: nao vai a rede (principal defesa contra rate limit).
  if (!forceRefresh && cached && ttl > 0 && ageMs < ttl) {
    return buildOutcome(task, cached.value, { fromCache: true });
  }

  try {
    const value = await withRetry(() => task.run(), { retries: 1, baseDelayMs: 500, signal });
    if (task.cacheable !== false) writeCacheEntry(storage, cacheKey, value);
    return buildOutcome(task, value, { fromCache: false });
  } catch (error) {
    // Aborto real (usuario/efeito trocou de local): descarta o painel inteiro.
    if (signal?.aborted) throw error;

    // AbortError aqui sem signal abortado = timeout DA PROPRIA requisicao.
    // Trata como falha isolada: as demais fontes continuam aparecendo.
    const message = error?.name === "AbortError" ? "tempo limite excedido" : error?.message ?? "falha ao consultar";

    // Falhou, mas temos cache ainda utilizavel: mostra o ultimo valor bom.
    if (cached && ageMs < CACHE_STALE_MAX_MS) {
      return {
        key: task.key,
        label: task.label,
        value: cached.value,
        state: "cache",
        detail: `Sem atualizar (${message}); exibindo último dado salvo`,
        warning: `${task.label}: ${message} (usando cache)`,
      };
    }

    // Fontes que dependem de proxy (CPTEC/JPL) degradam de forma suave: nao sao
    // um erro do app, e sim uma limitacao do navegador (sem CORS) ou do proxy.
    if (task.proxyDependent) {
      return {
        key: task.key,
        label: task.label,
        value: emptyValueForTask(task.key),
        state: "indisponivel",
        detail: "Indisponível no navegador (fonte sem CORS); requer proxy ativo",
        warning: null,
      };
    }

    return {
      key: task.key,
      label: task.label,
      value: emptyValueForTask(task.key),
      state: "erro",
      detail: message,
      warning: `${task.label}: ${message}`,
    };
  }
}

function buildOutcome(task, value, { fromCache }) {
  const useful = hasUsefulData(value);
  return {
    key: task.key,
    label: task.label,
    value,
    state: useful ? "online" : "sem-dados",
    detail: useful
      ? fromCache
        ? "Dados em cache (recentes)"
        : "Dados recebidos"
      : "Fonte respondeu sem dados para o recorte atual",
    warning: null,
  };
}
