import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import React from "react";
import { create, act } from "react-test-renderer";
import { transformWithOxc } from "vite";
import { BRASIL_NEWS_SINCE, BRASIL_NEWS_SOURCES } from "../src/services/brasilNews.js";

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

function feed({ count = 60, generatedAt = new Date(NOW).toISOString(), failed = false } = {}) {
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
const settle = () => new Promise(setImmediate);

async function mount(t, data = feed(), fetchImpl) {
  t.mock.timers.enable({ apis: ["Date", "setInterval"], now: NOW });
  const requests = [];
  t.mock.method(globalThis, "fetch", async (url, options) => {
    requests.push({ url, options });
    return fetchImpl ? fetchImpl(url, options, requests.length) : new Response(JSON.stringify(data));
  });
  let renderer;
  await act(async () => { renderer = create(React.createElement(BrasilNewsScreen)); await settle(); });
  t.after(async () => { await act(async () => renderer.unmount()); });
  return { renderer, requests };
}

test("News Brasil paginates real React state, announces counts and resets filters to 25", async (t) => {
  const { renderer } = await mount(t);
  assert.equal(articles(renderer).length, 25);
  assert.match(textOf(renderer.root.findByProps({ "aria-live": "polite" })), /Mostrando 25 de 60/);
  await act(async () => button(renderer, "Mostrar mais").props.onClick());
  assert.equal(articles(renderer).length, 50);
  assert.match(textOf(renderer.root.findByProps({ "aria-live": "polite" })), /Mostrando 50 de 60/);
  await act(async () => renderer.root.findByType("input").props.onChange({ target: { value: "INCLUSAO" } }));
  assert.equal(articles(renderer).length, 25);
  assert.match(textOf(renderer.root.findByProps({ "aria-live": "polite" })), /25 de 30/);
  await act(async () => renderer.root.findAllByType("select")[0].props.onChange({ target: { value: "imprensa" } }));
  assert.equal(articles(renderer).length, 0);
  assert.match(textOf(renderer.root), /Nenhuma notícia corresponde aos filtros/);
  await act(async () => button(renderer, "Limpar filtros").props.onClick());
  assert.equal(articles(renderer).length, 25);
  assert.equal(renderer.root.findByType("input").props.value, "");
});

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
  await act(async () => renderer.unmount());
  assert.equal(requests[0].options.signal.aborted, true);
});

test("scoped CSS prevents the dark topbar button style from making news controls illegible", () => {
  const css = fs.readFileSync(path.join(ROOT, "src/components/brasilNews.css"), "utf8");
  assert.match(css, /\.brasil-news \.ghost-button\s*\{[^}]*color:\s*var\(--ink\)/s);
  assert.match(css, /@media\s*\(max-width:\s*760px\)/);
  assert.match(css, /grid-template-columns:\s*minmax\(0,\s*1fr\)/);
  assert.match(css, /:focus-visible/);
});
