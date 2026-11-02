import { readFile, writeFile, mkdir, rename } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { XMLParser, XMLValidator } from "fast-xml-parser";
import {
  BRASIL_NEWS_SINCE, BRASIL_NEWS_SOURCES, BRASIL_NEWS_COVERAGE,
  normalizeBrasilNewsArticle, normalizeBrasilNewsFeed, mergeBrasilNewsArticles, plainNewsText,
} from "../src/services/brasilNews.js";

const MAX_FEED_BYTES = 5 * 1024 * 1024;
const TIMEOUT_MS = 20000;
const parser = new XMLParser({ ignoreAttributes: false, parseTagValue: false, trimValues: true });
const asArray = (value) => value == null ? [] : Array.isArray(value) ? value : [value];
const textValue = (value) => typeof value === "object" ? value?.["#text"] ?? "" : value ?? "";

export function normalizeBrasilNewsDate(value, source) {
  const text = String(value ?? "").trim();
  if (source.id !== "stj") return text;
  // O RSS do STJ publica datas locais com abreviações em português, sem fuso.
  const match = text.match(/^\w+,\s+(jan|fev|mar|abr|mai|jun|jul|ago|set|out|nov|dez)\s+(\d{1,2})\s+(\d{4})\s+(\d{2}:\d{2}:\d{2})$/i);
  if (!match) return text;
  const month = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"].indexOf(match[1].toLowerCase()) + 1;
  return `${match[3]}-${String(month).padStart(2, "0")}-${match[2].padStart(2, "0")}T${match[4]}-03:00`;
}

export function parseBrasilNewsXml(xml, source, { now = Date.now() } = {}) {
  if (typeof xml !== "string" || /<!DOCTYPE|<!ENTITY/i.test(xml.replace(/<!\[CDATA\[[\s\S]*?\]\]>/g, "")) || XMLValidator.validate(xml) !== true) throw new Error("Feed XML inválido.");
  const doc = parser.parse(xml);
  const root = doc.rss?.channel ?? doc["rdf:RDF"] ?? doc.feed;
  if (!root) throw new Error("Resposta não é um feed RSS/Atom.");
  return asArray(root.item ?? root.entry).map((item) => {
    if (/folder|banner/i.test(textValue(item["dc:type"])) || asArray(item.category).some((entry) => /banners/i.test(textValue(entry)))) return null;
    const links = asArray(item.link);
    const link = links.find((entry) => typeof entry === "string")
      ?? links.find((entry) => !entry["@_rel"] || entry["@_rel"] === "alternate");
    return normalizeBrasilNewsArticle({
      title: textValue(item.title),
      url: typeof link === "object" ? link["@_href"] : link || textValue(item.guid),
      publishedAt: normalizeBrasilNewsDate(textValue(item.pubDate || item.published || item["dc:date"] || item.updated), source),
      context: plainNewsText(textValue(item.description || item.summary || item["content:encoded"])).slice(0, 2400),
    }, { source, now, classify: true });
  }).filter(Boolean);
}

async function readLimitedBody(response) {
  if (Number(response.headers.get("content-length")) > MAX_FEED_BYTES) throw new Error("Feed excede o limite de tamanho.");
  const chunks = [];
  let length = 0;
  const reader = response.body.getReader();
  try {
    for (;;) {
      const { value, done } = await reader.read();
      if (done) break;
      length += value.byteLength;
      if (length > MAX_FEED_BYTES) throw new Error("Feed excede o limite de tamanho.");
      chunks.push(value);
    }
  } finally {
    await reader.cancel();
  }
  const bytes = new Uint8Array(length);
  let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length; }
  const declaration = new TextDecoder().decode(bytes.subarray(0, 200));
  const charset = declaration.match(/encoding=["']([^"']+)/i)?.[1] ?? "utf-8";
  return new TextDecoder(charset).decode(bytes);
}

export async function fetchBrasilNewsSource(source, { fetchImpl = globalThis.fetch, now = Date.now(), timeoutMs = TIMEOUT_MS } = {}) {
  const signal = AbortSignal.timeout(timeoutMs);
  let url = source.feedUrl;
  // Redirects são conferidos antes de cada conexão, sem seguir hosts desconhecidos.
  for (let redirects = 0; redirects <= 3; redirects += 1) {
    const target = new URL(url);
    if (target.protocol !== "https:" || target.username || target.password || target.port || !(source.feedHosts ?? source.hosts).includes(target.hostname)) throw new Error("Destino do feed não autorizado.");
    const response = await fetchImpl(target.href, { redirect: "manual", signal, headers: { Accept: "application/rss+xml, application/atom+xml, application/xml, text/xml", "User-Agent": "Togs-heads-up-News-Brasil/1.0" } });
    if ([301, 302, 303, 307, 308].includes(response.status)) {
      await response.body?.cancel();
      const location = response.headers.get("location");
      if (!location) throw new Error("Redirecionamento sem destino.");
      url = new URL(location, target).href;
      continue;
    }
    if (!response.ok) { await response.body?.cancel(); throw new Error(`HTTP ${response.status}`); }
    return parseBrasilNewsXml(await readLimitedBody(response), source, { now });
  }
  throw new Error("Limite de redirecionamentos excedido.");
}

export async function collectBrasilNews({ previous = null, fetchImpl = globalThis.fetch, now = Date.now() } = {}) {
  let history = null;
  if (previous) history = normalizeBrasilNewsFeed(previous, { now });
  const results = await Promise.allSettled(BRASIL_NEWS_SOURCES.map((source) => fetchBrasilNewsSource(source, { fetchImpl, now })));
  const incoming = [];
  const generatedAt = new Date(now).toISOString();
  const sources = BRASIL_NEWS_SOURCES.map((source, index) => {
    const result = results[index];
    if (result.status === "fulfilled") {
      incoming.push(...result.value);
      return { id: source.id, state: "ok", lastSuccessAt: generatedAt, detail: "Feed consultado; origem dos links conferida pelo domínio.", count: result.value.length };
    }
    return { id: source.id, state: "erro", lastSuccessAt: history?.sources.find((entry) => entry.id === source.id)?.lastSuccessAt ?? null,
      detail: `Falha na consulta: ${plainNewsText(result.reason?.message ?? "erro de rede").slice(0, 180)}`, count: 0 };
  });
  return { schemaVersion: 1, since: BRASIL_NEWS_SINCE, generatedAt, coverage: BRASIL_NEWS_COVERAGE,
    articles: mergeBrasilNewsArticles(history?.articles ?? [], incoming, { now }), sources };
}

export async function runBrasilNewsCollection(output = "public/data/news-brasil.json") {
  const destination = resolve(output);
  let previous = null;
  try { previous = JSON.parse(await readFile(destination, "utf8")); }
  catch (error) { if (error.code !== "ENOENT") throw error; }
  const feed = await collectBrasilNews({ previous });
  await mkdir(dirname(destination), { recursive: true });
  await writeFile(`${destination}.tmp`, `${JSON.stringify(feed, null, 2)}\n`, "utf8");
  await rename(`${destination}.tmp`, destination);
  console.log(`News Brasil: ${feed.articles.length} notícias no histórico; ${feed.sources.filter((source) => source.state === "ok").length}/${feed.sources.length} feeds consultados.`);
  return feed;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  runBrasilNewsCollection(process.argv[2]).catch((error) => { console.error(error.message); process.exitCode = 1; });
}
