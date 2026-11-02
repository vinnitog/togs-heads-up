import test from "node:test";
import assert from "node:assert/strict";
import {
  BRASIL_NEWS_SINCE, BRASIL_NEWS_SOURCES, canonicalBrasilNewsUrl, classifyBrasilNews,
  normalizeBrasilNewsArticle, normalizeBrasilNewsFeed, mergeBrasilNewsArticles, filterBrasilNews, fetchBrasilNews,
} from "../src/services/brasilNews.js";

const NOW = Date.parse("2026-11-02T15:00:00Z");
const source = (id) => BRASIL_NEWS_SOURCES.find((entry) => entry.id === id);
const article = (overrides = {}) => ({ title: "Comissão aprova projeto de lei sobre inclusão", url: "https://www.camara.leg.br/noticias/123-projeto", publishedAt: "2026-10-29T15:00:00Z", sourceId: "camara", category: "proposta", branch: "legislativo", ...overrides });
const payload = (overrides = {}) => ({ schemaVersion: 1, since: BRASIL_NEWS_SINCE, generatedAt: new Date(NOW).toISOString(), articles: [article()], sources: BRASIL_NEWS_SOURCES.map(({ id }) => ({ id, state: "ok", lastSuccessAt: new Date(NOW).toISOString(), count: 0, detail: "Feed consultado" })), ...overrides });

test("News Brasil accepts exact publisher article hosts and removes only tracking parameters", () => {
  const url = "https://www.camara.leg.br/noticias/123-projeto?utm_source=x&fbclid=y&page=2#top";
  assert.equal(canonicalBrasilNewsUrl(url, source("camara")), "https://www.camara.leg.br/noticias/123-projeto?page=2");
  for (const invalid of [
    "http://www.camara.leg.br/noticias/123-projeto", "javascript:alert(1)",
    "https://www.camara.leg.br.evil.test/noticias/123-projeto", "https://fake.www.camara.leg.br/noticias/123-projeto",
    "https://user@www.camara.leg.br/noticias/123-projeto", "https://www.camara.leg.br:8443/noticias/123-projeto",
    "https://www.camara.leg.br/noticias/rss/ultimas-noticias", "https://www.camara.leg.br/", "not a url",
  ]) assert.equal(canonicalBrasilNewsUrl(invalid, source("camara")), null, invalid);
});

test("publisher-specific canonical URLs reject institutional STF pages, columns and fake-check stories", () => {
  assert.equal(canonicalBrasilNewsUrl("https://noticias.stf.jus.br/pagina-da-ouvidoria/", source("stf")), null);
  assert.ok(canonicalBrasilNewsUrl("https://noticias.stf.jus.br/postsnoticias/stf-decide/", source("stf")));
  assert.equal(source("stf").feedUrl, "https://noticias.stf.jus.br/feed/?post_type=postsnoticias");
  const folha = "https://www1.folha.uol.com.br/poder/2026/11/lei.shtml";
  assert.equal(canonicalBrasilNewsUrl(`https://redir.folha.com.br/redir/online/poder/rss091/*${folha}`, source("folha")), folha);
  assert.equal(canonicalBrasilNewsUrl("https://redir.folha.com.br/other/*https://evil.test/lei.shtml", source("folha")), null);
  assert.equal(canonicalBrasilNewsUrl("https://www1.folha.uol.com.br/colunas/pessoa/2026/11/lei.shtml", source("folha")), null);
  assert.equal(canonicalBrasilNewsUrl("https://g1.globo.com/fato-ou-fake/noticia/2026/11/01/lei.ghtml", source("g1")), null);
});

test("election day uses Brasília midnight and rejects missing, old or excessive future dates", () => {
  assert.equal(normalizeBrasilNewsArticle(article({ publishedAt: BRASIL_NEWS_SINCE }), { now: NOW }).publishedAt, "2026-10-25T03:00:00.000Z");
  for (const publishedAt of [undefined, "invalid", "2026-10-25T02:59:59Z", new Date(NOW + 300001).toISOString()]) {
    assert.equal(normalizeBrasilNewsArticle(article({ publishedAt }), { now: NOW }), null);
  }
  assert.ok(normalizeBrasilNewsArticle(article({ publishedAt: new Date(NOW + 300000).toISOString() }), { now: NOW }));
});

test("JSON article validation rejects unknown sources and inherited category or branch names", () => {
  for (const override of [{ sourceId: "unknown" }, { category: "constructor" }, { category: "__proto__" }, { branch: "constructor" }, { branch: "__proto__" }]) {
    assert.equal(normalizeBrasilNewsArticle(article(override), { now: NOW }), null);
  }
  assert.equal(normalizeBrasilNewsArticle(article({ title: "<b>Lei</b>   sancionada" }), { now: NOW }).title, "Lei sancionada");
});

test("sanctions remain executive acts even when the headline mentions a project and Congress", () => {
  for (const title of ["Lula sanciona projeto aprovado pelo Congresso", "Lula sanciona lei aprovada pelo Senado", "Governo federal veta projeto do Congresso"]) {
    assert.deepEqual(classifyBrasilNews(title, "", source("g1")), { branch: "executivo", category: "ato" }, title);
  }
  assert.deepEqual(classifyBrasilNews("Comissão aprova projeto de lei sobre acesso à saúde", "", source("camara")), { branch: "legislativo", category: "proposta" });
  assert.deepEqual(classifyBrasilNews("STF decide suspender norma federal", "", source("g1")), { branch: "judiciario", category: "decisao" });
});

test("a hearing or future promise does not become an enacted prohibition", () => {
  assert.equal(classifyBrasilNews("STF realiza nesta terça audiência pública sobre proibição das bets", "", source("stf")).category, "acompanhamento");
  assert.equal(classifyBrasilNews("STF discute proibição de apostas", "", source("stf")).category, "acompanhamento");
  assert.equal(classifyBrasilNews("Lula promete proibir apostas", "", source("g1")).category, "proposta");
  assert.equal(classifyBrasilNews("Lula pretende regulamentar redes sociais", "", source("g1")).category, "proposta");
  assert.equal(classifyBrasilNews("Lula vetará projeto de lei aprovado no Congresso", "", source("g1")).category, "proposta");
});

test("topic filter excludes municipal acts and unrelated political events", () => {
  assert.equal(classifyBrasilNews("Prefeitura publica decreto sobre transporte", "", source("g1")), null);
  assert.equal(classifyBrasilNews("Lula recebe autoridades em Brasília", "Encontro do presidente", source("g1")), null);
  assert.ok(classifyBrasilNews("Ministério publica portaria sobre regras federais", "", source("agenciagov")));
});

test("history deduplicates canonical URLs, updates metadata, and sorts newest first", () => {
  const merged = mergeBrasilNewsArticles([article(), article({ url: "https://www.camara.leg.br/noticias/124-antiga", publishedAt: "2026-10-26T10:00:00Z" })], [article({ url: `${article().url}?utm_source=rss#content`, title: "Título corrigido" }), article({ sourceId: "unknown" })], { now: NOW });
  assert.equal(merged.length, 2);
  assert.equal(merged[0].title, "Título corrigido");
  assert.equal(merged[1].url, "https://www.camara.leg.br/noticias/124-antiga");
});

test("search ignores case and accents while origin, branch and category combine", () => {
  const articles = [article(), article({ title: "STF decide norma", sourceId: "g1", branch: "judiciario", category: "decisao" })];
  assert.equal(filterBrasilNews(articles, { query: "INCLUSAO", origin: "oficial", branch: "legislativo", category: "proposta" }).length, 1);
  assert.equal(filterBrasilNews(articles, { query: "agencia camara" }).length, 1);
  assert.equal(filterBrasilNews(articles, { origin: "imprensa", branch: "judiciario", category: "decisao" }).length, 1);
  assert.equal(filterBrasilNews(articles, { query: "inclusao", origin: "imprensa" }).length, 0);
});

test("feed validation rejects bad schema or timestamps and reconstructs trusted source metadata", () => {
  for (const override of [{ schemaVersion: 2 }, { since: "2022-10-30" }, { articles: null }, { sources: null }, { generatedAt: "invalid" }, { generatedAt: "2020-01-01T00:00:00Z" }, { generatedAt: new Date(NOW + 300001).toISOString() }]) {
    assert.throws(() => normalizeBrasilNewsFeed(payload(override), { now: NOW }), /inválido/);
  }
  const feed = normalizeBrasilNewsFeed(payload({ sources: [{ id: "camara", state: "ok", lastSuccessAt: "2026-11-03T00:00:00Z" }, { id: "fake", state: "ok" }], coverage: "Tudo garantido" }), { now: NOW });
  assert.equal(feed.sources.length, BRASIL_NEWS_SOURCES.length);
  assert.ok(feed.sources.every((entry) => entry.state === "erro"));
  assert.doesNotMatch(feed.coverage, /Tudo garantido/);
});

test("JSON client uses the production base path and bypasses HTTP cache", async () => {
  let request;
  const result = await fetchBrasilNews({ baseUrl: "/togs-heads-up/", fetchImpl: async (url, options) => { request = { url, options }; return new Response(JSON.stringify(payload({ generatedAt: new Date().toISOString() }))); } });
  assert.equal(request.url, "/togs-heads-up/data/news-brasil.json");
  assert.equal(request.options.cache, "no-store");
  assert.equal(request.options.headers.Accept, "application/json");
  assert.equal(result.schemaVersion, 1);
});

test("JSON client propagates HTTP, malformed JSON and invalid schema errors", async () => {
  await assert.rejects(fetchBrasilNews({ fetchImpl: async () => new Response("offline", { status: 503 }) }), /HTTP 503/);
  await assert.rejects(fetchBrasilNews({ fetchImpl: async () => new Response("not json") }), SyntaxError);
  await assert.rejects(fetchBrasilNews({ fetchImpl: async () => new Response("{}") }), /inválido/);
});

function abortingFetch(_url, { signal }) {
  return new Promise((_resolve, reject) => {
    const abort = () => reject(new DOMException("Aborted", "AbortError"));
    if (signal.aborted) abort();
    else signal.addEventListener("abort", abort, { once: true });
  });
}

test("JSON client aborts on timeout and respects a pre-aborted parent signal", async () => {
  await assert.rejects(fetchBrasilNews({ fetchImpl: abortingFetch, timeoutMs: 5 }), { name: "AbortError" });
  const controller = new AbortController();
  controller.abort();
  await assert.rejects(fetchBrasilNews({ fetchImpl: abortingFetch, signal: controller.signal }), { name: "AbortError" });
});

test("JSON client aborts an in-flight request when its owner unmounts", async () => {
  const controller = new AbortController();
  const pending = fetchBrasilNews({ fetchImpl: abortingFetch, signal: controller.signal });
  controller.abort();
  await assert.rejects(pending, { name: "AbortError" });
});
