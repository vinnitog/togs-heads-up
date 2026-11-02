import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import React from "react";
import { create, act } from "react-test-renderer";
import { transformWithOxc } from "vite";
import { BRASIL_NEWS_SINCE, BRASIL_NEWS_SOURCES, filterBrasilNews, normalizeBrasilNewsFeed } from "../src/services/brasilNews.js";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const NOW = Date.parse("2026-11-02T15:00:00Z");
const componentPath = path.join(ROOT, "src/components/BrasilNewsScreen.jsx");
const temporaryFile = path.join(ROOT, ".tmp", `brasil-news-screen-${process.pid}.mjs`);
fs.mkdirSync(path.dirname(temporaryFile), { recursive: true });
const source = fs.readFileSync(componentPath, "utf8")
  .replace('import "./brasilNews.css";', "")
  .replace('"../services/brasilNews.js"', JSON.stringify(pathToFileURL(path.join(ROOT, "src/services/brasilNews.js")).href));
const transformed = await transformWithOxc(source, componentPath, { sourceType: "module" });
fs.writeFileSync(temporaryFile, transformed.code);
const { default: BrasilNewsScreen } = await import(pathToFileURL(temporaryFile).href);
fs.unlinkSync(temporaryFile);

function feed({ count = 65, generatedAt = new Date(NOW).toISOString(), failed = false } = {}) {
  return {
    schemaVersion: 1, since: BRASIL_NEWS_SINCE, generatedAt,
    sources: BRASIL_NEWS_SOURCES.map(({ id }) => ({ id, state: failed ? "erro" : "ok", lastSuccessAt: generatedAt, count: 0, detail: failed ? "offline" : "OK" })),
    articles: Array.from({ length: count }, (_, index) => ({
      id: String(index), title: index < 30 ? `Inclusão digital ${index}` : `Governo publica decreto ${index}`,
      url: index < 30 ? `https://www.camara.leg.br/noticias/${200 + index}-projeto` : `https://g1.globo.com/politica/noticia/2026/10/29/decreto-${index}.ghtml`,
      sourceId: index < 30 ? "camara" : "g1", category: index < 30 ? "proposta" : "ato", branch: index < 30 ? "legislativo" : "executivo",
      publishedAt: new Date(Date.parse("2026-10-29T15:00:00Z") - index * 60000).toISOString(),
    })),
  };
}

const textOf = (node) => typeof node === "string" ? node : node?.children?.map(textOf).join("") ?? "";
const articles = (renderer) => renderer.root.findAllByType("article");
const button = (renderer, label) => renderer.root.findAllByType("button").find((node) => textOf(node).includes(label));
const count = (renderer) => textOf(renderer.root.findByProps({ className: "brasil-news-count" }));
const select = (renderer, name) => renderer.root.findAllByType("label").find((node) => textOf(node).startsWith(name)).findByType("select");
const pageText = (renderer) => textOf(renderer.root.findByProps({ "aria-label": "Paginação News Brasil" }).findByType("p"));
const urls = (renderer) => articles(renderer).map((article) => article.findByType("a").props.href);
const expectedArticles = (data, filters) => filterBrasilNews(normalizeBrasilNewsFeed(data, { now: NOW }).articles, filters);
const change = async (node, value) => { await act(async () => node.props.onChange({ target: { value } })); };
const click = async (renderer, label) => {
  const control = button(renderer, label);
  assert.equal(control.props.disabled, false, `${label} must be enabled`);
  await act(async () => control.props.onClick());
};
const settle = () => new Promise(setImmediate);
const response = (data) => new Response(JSON.stringify(data));
const deferred = () => {
  let resolve;
  let reject;
  const promise = new Promise((resolvePromise, rejectPromise) => { resolve = resolvePromise; reject = rejectPromise; });
  return { promise, resolve, reject };
};

async function mount(t, data = feed(), fetchImpl) {
  t.mock.timers.enable({ apis: ["Date", "setInterval"], now: NOW });
  const requests = [];
  const focusCalls = [];
  const scrollCalls = [];
  t.mock.method(globalThis, "fetch", async (url, options) => {
    requests.push({ url, options });
    return fetchImpl ? fetchImpl(url, options, requests.length) : new Response(JSON.stringify(data));
  });
  let renderer;
  await act(async () => {
    renderer = create(React.createElement(BrasilNewsScreen), {
      createNodeMock: (element) => element.props.className === "brasil-news-count" ? {
        focus: () => focusCalls.push(count(renderer)),
        scrollIntoView: (options) => scrollCalls.push({ count: count(renderer), options }),
      } : null,
    });
    await settle();
  });
  t.after(async () => { await act(async () => renderer.unmount()); });
  return { renderer, requests, focusCalls, scrollCalls };
}

test("News Brasil defaults to ten recent articles and exposes labeled pagination with live counts", async (t) => {
  const { renderer, requests } = await mount(t);
  assert.equal(articles(renderer).length, 10);
  assert.equal(select(renderer, "Itens por página").props.value, 10);
  assert.deepEqual(select(renderer, "Itens por página").findAllByType("option").map((option) => option.props.value), [10, 20, 50]);
  const status = renderer.root.findByProps({ className: "brasil-news-count" });
  assert.equal(status.props.role, "status");
  assert.equal(status.props["aria-live"], "polite");
  assert.equal(status.props.tabIndex, -1);
  assert.match(count(renderer), /^Mostrando 1–10 de 65 notícia\(s\) no filtro · mais recentes primeiro$/);
  assert.equal(pageText(renderer), "Página 1 de 7");
  assert.equal(button(renderer, "Anterior").props.disabled, true);
  assert.equal(button(renderer, "Próxima").props.disabled, false);
  assert.equal(requests.length, 1);
});

for (const [pageSize, lastSize] of [[10, 5], [20, 5], [50, 15]]) {
  test(`pagination visits every ordered article once with ${pageSize} items per page`, async (t) => {
    const data = feed();
    data.articles.reverse();
    const expected = expectedArticles(data).map(({ url }) => url);
    const { renderer, requests } = await mount(t, data);
    await change(select(renderer, "Itens por página"), String(pageSize));
    const visited = [];
    const totalPages = Math.ceil(expected.length / pageSize);
    for (let page = 1; page <= totalPages; page += 1) {
      const start = (page - 1) * pageSize;
      const visible = urls(renderer);
      assert.deepEqual(visible, expected.slice(start, start + pageSize));
      assert.equal(pageText(renderer), `Página ${page} de ${totalPages}`);
      assert.equal(button(renderer, "Anterior").props.disabled, page === 1);
      assert.equal(button(renderer, "Próxima").props.disabled, page === totalPages);
      assert.match(count(renderer), new RegExp(`^Mostrando ${start + 1}–${start + visible.length} de 65 notícia`));
      visited.push(...visible);
      if (page < totalPages) await click(renderer, "Próxima");
    }
    assert.equal(articles(renderer).length, lastSize);
    assert.deepEqual(visited, expected);
    assert.equal(new Set(visited).size, 65);
    await click(renderer, "Anterior");
    assert.deepEqual(urls(renderer), expected.slice((totalPages - 2) * pageSize, (totalPages - 1) * pageSize));
    assert.equal(requests.length, 1, "pagination must reuse the loaded feed");
  });
}

for (const [name, value, filter] of [
  ["query", "INCLUSAO", { query: "INCLUSAO" }],
  ["Origem", "imprensa", { origin: "imprensa" }],
  ["Poder", "legislativo", { branch: "legislativo" }],
  ["Tipo de notícia", "ato", { category: "ato" }],
]) {
  test(`${name} change resets a later page and counts only matching articles`, async (t) => {
    const data = feed();
    const { renderer, requests, focusCalls, scrollCalls } = await mount(t, data);
    await click(renderer, "Próxima");
    await click(renderer, "Próxima");
    const navigations = focusCalls.length;
    await change(name === "query" ? renderer.root.findByType("input") : select(renderer, name), value);
    const matches = expectedArticles(data, filter);
    assert.deepEqual(urls(renderer), matches.slice(0, 10).map(({ url }) => url));
    assert.equal(pageText(renderer), `Página 1 de ${Math.ceil(matches.length / 10)}`);
    assert.match(count(renderer), new RegExp(`^Mostrando 1–10 de ${matches.length} notícia`));
    assert.equal(focusCalls.length, navigations);
    assert.equal(scrollCalls.length, navigations);
    assert.equal(requests.length, 1);
  });
}

test("page size and clear reset the page while clear preserves the selected size and resets all filters", async (t) => {
  const { renderer, requests, focusCalls, scrollCalls } = await mount(t);
  await click(renderer, "Próxima");
  await change(select(renderer, "Itens por página"), "20");
  assert.equal(pageText(renderer), "Página 1 de 4");
  assert.equal(articles(renderer).length, 20);
  assert.equal(focusCalls.length, 1);
  await change(renderer.root.findByType("input"), "INCLUSAO");
  await change(select(renderer, "Origem"), "oficial");
  await change(select(renderer, "Poder"), "legislativo");
  await change(select(renderer, "Tipo de notícia"), "proposta");
  await click(renderer, "Próxima");
  const navigations = focusCalls.length;
  await act(async () => button(renderer, "Limpar filtros").props.onClick());
  assert.equal(renderer.root.findByType("input").props.value, "");
  assert.equal(select(renderer, "Origem").props.value, "todas");
  assert.equal(select(renderer, "Poder").props.value, "todos");
  assert.equal(select(renderer, "Tipo de notícia").props.value, "todas");
  assert.equal(select(renderer, "Itens por página").props.value, 20);
  assert.equal(pageText(renderer), "Página 1 de 4");
  assert.match(count(renderer), /^Mostrando 1–20 de 65 notícia/);
  assert.deepEqual(urls(renderer), expectedArticles(feed()).slice(0, 20).map(({ url }) => url));
  assert.equal(focusCalls.length, navigations);
  assert.equal(scrollCalls.length, navigations);
  assert.equal(requests.length, 1);
});

test("combined query and category show an empty filtered count without pagination", async (t) => {
  const { renderer, requests } = await mount(t);
  await click(renderer, "Próxima");
  await change(renderer.root.findByType("input"), "INCLUSAO");
  await change(select(renderer, "Tipo de notícia"), "ato");
  assert.equal(articles(renderer).length, 0);
  assert.match(count(renderer), /^Mostrando 0 de 0 notícia/);
  assert.equal(renderer.root.findAllByType("nav").length, 0);
  assert.match(textOf(renderer.root), /Nenhuma notícia corresponde aos filtros/);
  await act(async () => button(renderer, "Limpar filtros").props.onClick());
  assert.equal(pageText(renderer), "Página 1 de 7");
  assert.equal(articles(renderer).length, 10);
  assert.equal(requests.length, 1);
});

test("only page navigation focuses and scrolls once to the updated result count", async (t) => {
  const { renderer, focusCalls, scrollCalls } = await mount(t);
  assert.deepEqual(focusCalls, []);
  assert.deepEqual(scrollCalls, []);
  await click(renderer, "Próxima");
  assert.deepEqual(focusCalls, [count(renderer)]);
  assert.match(focusCalls[0], /^Mostrando 11–20/);
  assert.deepEqual(scrollCalls, [{ count: count(renderer), options: { block: "start" } }]);
  await click(renderer, "Anterior");
  assert.deepEqual(focusCalls, [focusCalls[0], count(renderer)]);
  assert.equal(scrollCalls.length, 2);
  assert.equal(scrollCalls[1].count, count(renderer));
});

for (const trigger of ["manual refresh", "five-minute poll"]) {
  test(`${trigger} preserves the current page, clamps shrinkage and retains the feed on failure without moving focus`, async (t) => {
    let pending;
    const { renderer, requests, focusCalls, scrollCalls } = await mount(t, feed(), (_url, _options, attempt) => {
      if (attempt === 1) return response(feed());
      pending = deferred();
      return pending.promise;
    });
    for (let page = 1; page < 7; page += 1) await click(renderer, "Próxima");
    const navigations = focusCalls.length;
    const startRefresh = async () => {
      const previousUrls = urls(renderer);
      await act(async () => {
        if (trigger === "manual refresh") button(renderer, "Atualizar painel").props.onClick();
        else t.mock.timers.tick(5 * 60 * 1000);
        await settle();
      });
      assert.equal(button(renderer, "Carregando").props.disabled, true);
      assert.equal(renderer.root.findByProps({ "aria-label": "Notícias sobre atos federais" }).props["aria-busy"], true);
      assert.match(count(renderer), / · atualizando coleta…$/);
      assert.doesNotMatch(count(renderer), /^Carregando/);
      assert.deepEqual(urls(renderer), previousUrls, "pending updates must keep the visible articles");
    };
    await startRefresh();
    assert.equal(articles(renderer).length, 5);
    assert.match(count(renderer), /^Mostrando 61–65 de 65 notícia/);
    await act(async () => { pending.resolve(response(feed({ count: 75 }))); await settle(); });
    assert.equal(pageText(renderer), "Página 7 de 8");
    assert.match(count(renderer), /^Mostrando 61–70 de 75 notícia/);
    await startRefresh();
    await act(async () => { pending.resolve(response(feed({ count: 25 }))); await settle(); });
    assert.equal(pageText(renderer), "Página 3 de 3");
    assert.match(count(renderer), /^Mostrando 21–25 de 25 notícia/);
    await startRefresh();
    await act(async () => { pending.resolve(response(feed())); await settle(); });
    assert.equal(pageText(renderer), "Página 3 de 7", "growth must not restore the pre-clamp page");
    const retained = urls(renderer);
    await startRefresh();
    await act(async () => { pending.reject(new Error("offline")); await settle(); });
    assert.equal(pageText(renderer), "Página 3 de 7");
    assert.deepEqual(urls(renderer), retained);
    assert.match(textOf(renderer.root.findByProps({ role: "alert" })), /última coleta carregada nesta sessão/);
    assert.equal(focusCalls.length, navigations);
    assert.equal(scrollCalls.length, navigations);
    await change(renderer.root.findByType("input"), "INCLUSAO");
    assert.equal(pageText(renderer), "Página 1 de 3");
    assert.equal(focusCalls.length, navigations, "a later filter must not consume a stale navigation focus request");
    assert.equal(scrollCalls.length, navigations);
    assert.equal(requests.length, 5);
  });
}

test("article links keep attribution, exact domain, Brasília date and safe new-tab attributes", async (t) => {
  const { renderer } = await mount(t, feed({ count: 1 }));
  const article = articles(renderer)[0];
  assert.match(textOf(article), /Portal oficial/);
  assert.match(textOf(article), /Agência Câmara.*www\.camara\.leg\.br/);
  assert.match(textOf(article), /29\/10\/2026,? 12:00/);
  assert.equal(article.findByType("a").props.target, "_blank");
  assert.equal(article.findByType("a").props.rel, "noopener noreferrer");
  assert.equal(renderer.root.findByType("h2").children.join(""), "News Brasil");
});

test("failed refresh retains loaded articles and exposes an actionable error", async (t) => {
  const { renderer } = await mount(t, feed({ count: 2 }), (_url, _options, attempt) => {
    if (attempt > 1) throw new Error("offline");
    return new Response(JSON.stringify(feed({ count: 2 })));
  });
  await act(async () => { button(renderer, "Atualizar painel").props.onClick(); await settle(); });
  assert.equal(articles(renderer).length, 2);
  assert.match(textOf(renderer.root.findByProps({ role: "alert" })), /última coleta carregada nesta sessão/);
});

test("empty collection and initial loading failure are distinct from an empty filter", async (t) => {
  const { renderer } = await mount(t, feed({ count: 0 }));
  assert.match(textOf(renderer.root), /Nenhuma notícia disponível no recorte/);
  assert.doesNotMatch(textOf(renderer.root), /Nenhuma notícia corresponde aos filtros/);
  assert.match(count(renderer), /^Mostrando 0 de 0 notícia/);
  assert.equal(renderer.root.findAllByType("nav").length, 0);
});

test("initial collection failure displays error instead of saying there are no acts", async (t) => {
  const { renderer } = await mount(t, null, () => { throw new Error("offline"); });
  assert.match(textOf(renderer.root.findByProps({ role: "alert" })), /Não foi possível carregar/);
  assert.doesNotMatch(textOf(renderer.root), /Nenhuma notícia disponível no recorte/);
});

test("stale collection and complete source outage are visible with historical content", async (t) => {
  const { renderer } = await mount(t, feed({ count: 1, generatedAt: new Date(NOW - 91 * 60000).toISOString() }));
  assert.match(textOf(renderer.root), /mais de 90 minutos/);
  assert.equal(articles(renderer).length, 1);
});

test("all sources failing is reported independently of historical article availability", async (t) => {
  const { renderer } = await mount(t, feed({ count: 1, failed: true }));
  assert.match(textOf(renderer.root), /Nenhuma fonte respondeu na última tentativa/);
  assert.equal(articles(renderer).length, 1);
});

test("polling runs every five minutes and unmount stops further polls", async (t) => {
  const { renderer, requests } = await mount(t, feed({ count: 1 }));
  assert.equal(requests.length, 1);
  await act(async () => { t.mock.timers.tick(5 * 60 * 1000); await settle(); });
  assert.equal(requests.length, 2);
  await act(async () => renderer.unmount());
  t.mock.timers.tick(5 * 60 * 1000);
  assert.equal(requests.length, 2);
});

test("pending load disables refresh and is aborted when the screen closes", async (t) => {
  const { renderer, requests } = await mount(t, null, (_url, { signal }) => new Promise((_resolve, reject) => signal.addEventListener("abort", () => reject(new DOMException("Aborted", "AbortError")), { once: true })));
  assert.equal(button(renderer, "Carregando").props.disabled, true);
  assert.equal(renderer.root.findByProps({ "aria-label": "Notícias sobre atos federais" }).props["aria-busy"], true);
  assert.equal(count(renderer), "Carregando a última coleta publicada…");
  await act(async () => renderer.unmount());
  assert.equal(requests[0].options.signal.aborted, true);
});

test("scoped CSS keeps news controls readable, keyboard focus visible and pagination usable on mobile", () => {
  const css = fs.readFileSync(path.join(ROOT, "src/components/brasilNews.css"), "utf8");
  assert.match(css, /\.brasil-news \.ghost-button\s*\{[^}]*color:\s*var\(--ink\)/s);
  assert.match(css, /@media\s*\(max-width:\s*760px\)/);
  assert.match(css, /grid-template-columns:\s*minmax\(0,\s*1fr\)/);
  assert.match(css, /\.brasil-news :is\(a, button, input, select, summary\):focus-visible,\s*\.brasil-news-count:focus\s*\{[^}]*outline:\s*3px/s);
  assert.match(css, /\.brasil-news button\s*\{[^}]*min-height:\s*44px/s);
  assert.match(css, /\.brasil-news-filters input,\s*\.brasil-news-filters select\s*\{[^}]*min-height:\s*44px;[^}]*background:\s*var\(--surface\);[^}]*color:\s*var\(--ink\);[^}]*font-size:\s*1rem/s);
  assert.match(css, /\.brasil-news-pagination select\s*\{[^}]*min-height:\s*44px;[^}]*color:\s*var\(--ink\);[^}]*background:\s*var\(--surface\);[^}]*font-size:\s*1rem/s);
  const narrowMobile = css.slice(css.indexOf("@media (max-width: 480px)"), css.indexOf("@media (max-width: 760px)"));
  assert.match(narrowMobile, /\.brasil-news-pagination nav\s*\{[^}]*display:\s*grid;[^}]*width:\s*100%;[^}]*grid-template-columns:\s*repeat\(2, minmax\(0, 1fr\)\)/s);
  assert.match(narrowMobile, /\.brasil-news-pagination nav p\s*\{[^}]*grid-column:\s*1 \/ -1;[^}]*grid-row:\s*1;/s);
});
