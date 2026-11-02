import test from "node:test";
import assert from "node:assert/strict";
import { BRASIL_NEWS_SOURCES, BRASIL_NEWS_SINCE } from "../src/services/brasilNews.js";
import { parseBrasilNewsXml, normalizeBrasilNewsDate, fetchBrasilNewsSource, collectBrasilNews } from "../scripts/collect-brasil-news.mjs";

const NOW = Date.parse("2026-11-02T15:00:00Z");
const camara = BRASIL_NEWS_SOURCES.find((source) => source.id === "camara");
const gov = BRASIL_NEWS_SOURCES.find((source) => source.id === "agenciagov");
const stj = BRASIL_NEWS_SOURCES.find((source) => source.id === "stj");
const rss = (items = "") => `<?xml version="1.0" encoding="UTF-8"?><rss version="2.0"><channel><title>Notícias</title>${items}</channel></rss>`;
const item = (title = "Comissão aprova projeto de lei", link = "https://www.camara.leg.br/noticias/123-projeto", date = "Thu, 29 Oct 2026 12:00:00 -0300") => `<item><title>${title}</title><link>${link}</link><pubDate>${date}</pubDate></item>`;
const history = () => ({ schemaVersion: 1, since: BRASIL_NEWS_SINCE, generatedAt: "2026-11-01T15:00:00Z", sources: BRASIL_NEWS_SOURCES.map(({ id }) => ({ id, state: "ok", lastSuccessAt: "2026-11-01T15:00:00Z", count: 1 })), articles: [{ title: "Projeto de lei anterior", url: "https://www.camara.leg.br/noticias/122-anterior", publishedAt: "2026-10-28T12:00:00Z", sourceId: "camara", category: "proposta", branch: "legislativo" }] });

test("collector parses RSS 2 with HTML title cleanup and real publication time", () => {
  const articles = parseBrasilNewsXml(rss(item("<![CDATA[<b>Comissão</b> aprova projeto de lei]]>")), camara, { now: NOW });
  assert.equal(articles.length, 1);
  assert.equal(articles[0].title, "Comissão aprova projeto de lei");
  assert.equal(articles[0].publishedAt, "2026-10-29T15:00:00.000Z");
  assert.equal(articles[0].category, "proposta");
});

test("collector parses RDF and removes folder and banner entries", () => {
  const xml = `<rdf:RDF xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#" xmlns:dc="http://purl.org/dc/elements/1.1/"><item><title>Ministério publica portaria federal</title><link>https://agenciagov.ebc.com.br/noticias/202610/norma</link><dc:date>2026-10-29T12:00:00Z</dc:date><dc:type>noticia</dc:type></item><item><title>Lei</title><dc:type>Folder</dc:type></item><item><title>Lei</title><category>Banners</category></item></rdf:RDF>`;
  const articles = parseBrasilNewsXml(xml, gov, { now: NOW });
  assert.equal(articles.length, 1);
  assert.equal(articles[0].sourceId, "agenciagov");
});

test("collector parses Atom alternate links and dates", () => {
  const xml = `<feed xmlns="http://www.w3.org/2005/Atom"><entry><title>Comissão aprova projeto de lei</title><link rel="self" href="https://evil.test/item"/><link rel="alternate" href="https://www.camara.leg.br/noticias/123-projeto"/><published>2026-10-29T15:00:00Z</published></entry></feed>`;
  assert.equal(parseBrasilNewsXml(xml, camara, { now: NOW })[0].url, "https://www.camara.leg.br/noticias/123-projeto");
});

test("STJ Portuguese dates are interpreted in Brasília rather than host timezone", () => {
  const raw = "qui, out 29 2026 12:00:00";
  assert.equal(normalizeBrasilNewsDate(raw, stj), "2026-10-29T12:00:00-03:00");
  const articles = parseBrasilNewsXml(rss(item("STJ decide suspender norma", "https://www.stj.jus.br/sites/portalp/Paginas/Comunicacao/Noticias/2026/29102026-regra.aspx", raw)), stj, { now: NOW });
  assert.equal(articles[0].publishedAt, "2026-10-29T15:00:00.000Z");
});

test("collector rejects malformed XML, nonfeeds, DTDs and entity declarations", () => {
  for (const xml of ["<rss>", "<html><body>blocked</body></html>", `<!DOCTYPE rss [<!ENTITY x SYSTEM "file:///etc/passwd">]>${rss()}`, `<!ENTITY x "x">${rss()}`]) {
    assert.throws(() => parseBrasilNewsXml(xml, camara, { now: NOW }), /inválido|não é um feed/);
  }
});

test("collector drops unknown links and dates outside the election recorte", () => {
  const xml = rss(item("Comissão aprova projeto de lei", "https://evil.test/news") + item("Comissão aprova projeto de lei", "https://www.camara.leg.br/noticias/124-antigo", "Thu, 01 Oct 2026 12:00:00 -0300") + item("Comissão aprova projeto de lei", "https://www.camara.leg.br/noticias/125-futuro", "Thu, 05 Nov 2026 12:00:00 -0300"));
  assert.deepEqual(parseBrasilNewsXml(xml, camara, { now: NOW }), []);
});

test("feed redirects stay on the exact authorized feed host before making a connection", async () => {
  const calls = [];
  await assert.rejects(fetchBrasilNewsSource(camara, { now: NOW, fetchImpl: async (url) => { calls.push(url); return new Response(null, { status: 302, headers: { location: "https://evil.test/feed" } }); } }), /não autorizado/);
  assert.deepEqual(calls, [camara.feedUrl]);
  let attempts = 0;
  await assert.rejects(fetchBrasilNewsSource(camara, { fetchImpl: async () => { attempts += 1; return new Response(null, { status: 302, headers: { location: camara.feedUrl } }); } }), /Limite de redirecionamentos/);
  assert.equal(attempts, 4);
});

test("collector follows a same-host redirect and rejects HTTP errors", async () => {
  let calls = 0;
  const articles = await fetchBrasilNewsSource(camara, { now: NOW, fetchImpl: async () => ++calls === 1 ? new Response(null, { status: 301, headers: { location: "/noticias/rss/nova" } }) : new Response(rss(item())) });
  assert.equal(articles.length, 1);
  await assert.rejects(fetchBrasilNewsSource(camara, { fetchImpl: async () => new Response("offline", { status: 503 }) }), /HTTP 503/);
});

test("feed size is bounded both by content-length and while streaming", async () => {
  await assert.rejects(fetchBrasilNewsSource(camara, { fetchImpl: async () => new Response("", { headers: { "content-length": String(5 * 1024 * 1024 + 1) } }) }), /limite de tamanho/);
  await assert.rejects(fetchBrasilNewsSource(camara, { fetchImpl: async () => new Response(new Uint8Array(5 * 1024 * 1024 + 1)) }), /limite de tamanho/);
});

test("XML encoding declaration preserves Latin-1 accents", async () => {
  const xml = rss(item()).replace('encoding="UTF-8"', 'encoding="ISO-8859-1"');
  const result = await fetchBrasilNewsSource(camara, { now: NOW, fetchImpl: async () => new Response(Buffer.from(xml, "latin1")) });
  assert.equal(result[0].title, "Comissão aprova projeto de lei");
});

test("empty feeds are successful while a failed source preserves prior history and success time", async () => {
  const previous = history();
  const result = await collectBrasilNews({ now: NOW, previous, fetchImpl: async (url) => url === camara.feedUrl ? new Response("offline", { status: 503 }) : new Response(rss()) });
  assert.equal(result.articles.length, 1);
  assert.equal(result.generatedAt, new Date(NOW).toISOString());
  assert.equal(result.sources.find(({ id }) => id === "camara").state, "erro");
  assert.equal(result.sources.find(({ id }) => id === "camara").lastSuccessAt, "2026-11-01T15:00:00.000Z");
  assert.equal(result.sources.filter(({ state, count }) => state === "ok" && count === 0).length, BRASIL_NEWS_SOURCES.length - 1);
});

test("total collection failure preserves historical articles without marking old successes fresh", async () => {
  const result = await collectBrasilNews({ now: NOW, previous: history(), fetchImpl: async () => { throw new Error("offline"); } });
  assert.equal(result.articles.length, 1);
  assert.ok(result.sources.every(({ state, lastSuccessAt }) => state === "erro" && lastSuccessAt === "2026-11-01T15:00:00.000Z"));
});
