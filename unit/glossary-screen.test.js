import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import React from "react";
import { create, act } from "react-test-renderer";
import { transformWithOxc } from "vite";
import { GLOSSARY_CATEGORIES, GLOSSARY_ENTRIES, filterGlossaryEntries } from "../src/data/glossary.js";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const componentPath = path.join(ROOT, "src/components/GlossaryScreen.jsx");
const temporaryFile = path.join(ROOT, ".tmp", `glossary-screen-${process.pid}.mjs`);
fs.mkdirSync(path.dirname(temporaryFile), { recursive: true });
const source = fs.readFileSync(componentPath, "utf8")
  .replace('import "./glossary.css";', "")
  .replace('"../data/glossary.js"', JSON.stringify(pathToFileURL(path.join(ROOT, "src/data/glossary.js")).href));
const transformed = await transformWithOxc(source, componentPath, { sourceType: "module" });
fs.writeFileSync(temporaryFile, transformed.code);
const { default: GlossaryScreen } = await import(pathToFileURL(temporaryFile).href);
fs.unlinkSync(temporaryFile);

const textOf = (node) => typeof node === "string" ? node : node?.children?.map(textOf).join("") ?? "";
const count = (renderer) => textOf(renderer.root.findByProps({ role: "status" }));
const label = (renderer, name) => renderer.root.findAllByType("label").find((node) => textOf(node).startsWith(name));
const categorySelect = (renderer) => label(renderer, "Categoria").findByType("select");
const pageSizeSelect = (renderer) => label(renderer, "Itens por página").findByType("select");
const button = (renderer, name) => renderer.root.findAllByType("button").find((node) => textOf(node) === name);
const terms = (renderer) => renderer.root.findAllByType("dt").map((node) => node.children[0]);
const pageText = (renderer) => textOf(renderer.root.findByProps({ "aria-label": "Paginação do glossário" }).findByType("p"));
const change = async (node, value) => { await act(async () => node.props.onChange({ target: { value } })); };
const click = async (renderer, name) => {
  const control = button(renderer, name);
  assert.equal(control.props.disabled, false, `${name} must be enabled`);
  await act(async () => control.props.onClick());
};

async function mount(t) {
  const requests = [];
  const focusCalls = [];
  const scrollCalls = [];
  t.mock.method(globalThis, "fetch", async (...args) => { requests.push(args); throw new TypeError("offline"); });
  let renderer;
  await act(async () => {
    renderer = create(React.createElement(GlossaryScreen), {
      createNodeMock: (element) => element.props.className === "glossary-count" ? {
        focus: () => focusCalls.push(count(renderer)),
        scrollIntoView: (options) => scrollCalls.push({ count: count(renderer), options }),
      } : null,
    });
  });
  t.after(async () => { await act(async () => renderer.unmount()); });
  return { renderer, requests, focusCalls, scrollCalls };
}

test("local glossary remains usable offline with labeled controls, semantic definitions and live counts", async (t) => {
  const { renderer, requests } = await mount(t);
  assert.equal(textOf(renderer.root.findByType("h2")), "Glossário");
  assert.equal(renderer.root.findByType("input").props.type, "search");
  const labels = renderer.root.findAllByType("label");
  assert.match(textOf(labels[0]), /Buscar sigla ou significado/);
  assert.equal(labels[0].findByType("input").props.maxLength, 200);
  assert.match(textOf(labels[1]), /Categoria/);
  assert.equal(labels[1].findAllByType("option").length, Object.keys(GLOSSARY_CATEGORIES).length + 1);
  assert.equal(renderer.root.findAllByType("dl").length, 1);
  assert.equal(renderer.root.findAllByType("dt").length, 10);
  assert.equal(renderer.root.findAllByType("dd").length, 10);
  assert.deepEqual(terms(renderer), filterGlossaryEntries().slice(0, 10).map(({ term }) => term));
  assert.equal(pageSizeSelect(renderer).props.value, 10);
  assert.deepEqual(pageSizeSelect(renderer).findAllByType("option").map((option) => option.props.value), [10, 20, 50]);
  assert.equal(renderer.root.findByProps({ role: "status" }).props["aria-live"], "polite");
  assert.match(count(renderer), /^Mostrando 1–10 de 65 termos · 65 no catálogo · ordem alfabética$/);
  assert.equal(pageText(renderer), "Página 1 de 7");
  assert.equal(button(renderer, "Anterior").props.disabled, true);
  assert.equal(button(renderer, "Próxima").props.disabled, false);
  assert.equal(requests.length, 0);
});

test("real React search and category filters update counts, expose empty state and clear both controls offline", async (t) => {
  const { renderer, requests } = await mount(t);
  const input = () => renderer.root.findByType("input");
  const select = () => categorySelect(renderer);
  await act(async () => input().props.onChange({ target: { value: "NO₂" } }));
  assert.equal(renderer.root.findAllByType("dt").length, 1);
  assert.match(textOf(renderer.root.findByType("dt")), /^NO2/);
  assert.match(count(renderer), /Mostrando 1–1 de 1 termos · 65 no catálogo/);
  await act(async () => select().props.onChange({ target: { value: "governo" } }));
  assert.equal(renderer.root.findAllByType("dl").length, 0);
  assert.match(count(renderer), /Mostrando 0 de 0 termos · 65 no catálogo/);
  assert.equal(renderer.root.findAllByType("nav").length, 0);
  assert.match(textOf(renderer.root), /Nenhum termo corresponde aos filtros/);
  await act(async () => button(renderer, "Limpar filtros").props.onClick());
  assert.equal(input().props.value, "");
  assert.equal(select().props.value, "todas");
  assert.equal(renderer.root.findAllByType("dt").length, 10);
  assert.equal(requests.length, 0);
});

test("every reference has an HTTPS destination and announces its safe new tab", async (t) => {
  const { renderer } = await mount(t);
  let checkedLinks = 0;
  while (true) {
    for (const link of renderer.root.findAllByType("a")) {
      assert.equal(new URL(link.props.href).protocol, "https:");
      assert.equal(link.props.target, "_blank");
      assert.deepEqual(link.props.rel.split(/\s+/).sort(), ["noopener", "noreferrer"]);
      assert.match(link.props["aria-label"], /Conferir: .+ \(abre em nova aba\)/);
      assert.ok(link.props["aria-label"].includes(textOf(link).trim()));
      checkedLinks += 1;
    }
    if (button(renderer, "Próxima").props.disabled) break;
    await click(renderer, "Próxima");
  }
  assert.equal(checkedLinks, GLOSSARY_ENTRIES.length);
});

for (const [pageSize, finalSize] of [[10, 5], [20, 5], [50, 15]]) {
  test(`pagination visits every ordered term once with ${pageSize} items per page offline`, async (t) => {
    const { renderer, requests } = await mount(t);
    await change(pageSizeSelect(renderer), String(pageSize));
    const expected = filterGlossaryEntries().map(({ term }) => term);
    const visited = [];
    const totalPages = Math.ceil(expected.length / pageSize);
    for (let page = 1; page <= totalPages; page += 1) {
      const start = (page - 1) * pageSize;
      const visible = terms(renderer);
      assert.deepEqual(visible, expected.slice(start, start + pageSize));
      assert.equal(pageText(renderer), `Página ${page} de ${totalPages}`);
      assert.equal(button(renderer, "Anterior").props.disabled, page === 1);
      assert.equal(button(renderer, "Próxima").props.disabled, page === totalPages);
      assert.match(count(renderer), new RegExp(`^Mostrando ${start + 1}–${start + visible.length} de 65 termos · 65 no catálogo`));
      visited.push(...visible);
      if (page < totalPages) await click(renderer, "Próxima");
    }
    assert.equal(terms(renderer).length, finalSize);
    assert.deepEqual(visited, expected);
    assert.equal(new Set(visited).size, expected.length);
    await click(renderer, "Anterior");
    assert.deepEqual(terms(renderer), expected.slice((totalPages - 2) * pageSize, (totalPages - 1) * pageSize));
    assert.equal(requests.length, 0);
  });
}

test("query, category and page-size changes reset a later page and count the filtered results", async (t) => {
  const { renderer, requests } = await mount(t);
  await click(renderer, "Próxima");
  await click(renderer, "Próxima");
  await change(renderer.root.findByType("input"), "NO");
  const matches = filterGlossaryEntries(undefined, { query: "NO" });
  assert.deepEqual(terms(renderer), matches.slice(0, 10).map(({ term }) => term));
  assert.equal(terms(renderer)[0], "NO");
  assert.match(pageText(renderer), /^Página 1 de /);
  assert.match(count(renderer), new RegExp(`^Mostrando 1–${Math.min(10, matches.length)} de ${matches.length} termos · 65 no catálogo · sigla exata primeiro`));

  await change(renderer.root.findByType("input"), "");
  await click(renderer, "Próxima");
  await change(categorySelect(renderer), "clima");
  const climate = filterGlossaryEntries(undefined, { category: "clima" });
  assert.deepEqual(terms(renderer), climate.slice(0, 10).map(({ term }) => term));
  assert.equal(pageText(renderer), `Página 1 de ${Math.ceil(climate.length / 10)}`);
  assert.match(count(renderer), new RegExp(`^Mostrando 1–10 de ${climate.length} termos · 65 no catálogo`));
  await click(renderer, "Próxima");
  await change(pageSizeSelect(renderer), "20");
  assert.equal(pageText(renderer), `Página 1 de ${Math.ceil(climate.length / 20)}`);
  assert.deepEqual(terms(renderer), climate.slice(0, 20).map(({ term }) => term));
  assert.equal(requests.length, 0);
});

test("clearing filters resets query, category and page while preserving the chosen page size", async (t) => {
  const { renderer } = await mount(t);
  await change(pageSizeSelect(renderer), "20");
  await change(renderer.root.findByType("input"), "NO");
  await change(categorySelect(renderer), "clima");
  await act(async () => button(renderer, "Limpar filtros").props.onClick());
  assert.equal(renderer.root.findByType("input").props.value, "");
  assert.equal(categorySelect(renderer).props.value, "todas");
  assert.equal(pageSizeSelect(renderer).props.value, 20);
  assert.equal(pageText(renderer), "Página 1 de 4");
  assert.deepEqual(terms(renderer), filterGlossaryEntries().slice(0, 20).map(({ term }) => term));
  assert.match(count(renderer), /^Mostrando 1–20 de 65 termos · 65 no catálogo/);
  await click(renderer, "Próxima");
  await act(async () => button(renderer, "Limpar filtros").props.onClick());
  assert.equal(pageSizeSelect(renderer).props.value, 20);
  assert.equal(pageText(renderer), "Página 1 de 4");
  assert.deepEqual(terms(renderer), filterGlossaryEntries().slice(0, 20).map(({ term }) => term));
});

test("only page navigation focuses and scrolls to the updated live result count", async (t) => {
  const { renderer, focusCalls, scrollCalls } = await mount(t);
  assert.equal(renderer.root.findByProps({ role: "status" }).props.tabIndex, -1);
  assert.deepEqual(focusCalls, []);
  assert.deepEqual(scrollCalls, []);
  await click(renderer, "Próxima");
  assert.deepEqual(focusCalls, [count(renderer)]);
  assert.match(focusCalls[0], /^Mostrando 11–20/);
  assert.deepEqual(scrollCalls, [{ count: count(renderer), options: { block: "start" } }]);
  await click(renderer, "Anterior");
  assert.equal(focusCalls.length, 2);
  assert.equal(scrollCalls.length, 2);
  assert.equal(focusCalls[1], count(renderer));
  assert.equal(scrollCalls[1].count, count(renderer));

  await click(renderer, "Próxima");
  let navigations = focusCalls.length;
  await change(renderer.root.findByType("input"), "NO₂");
  assert.equal(focusCalls.length, navigations);
  assert.equal(scrollCalls.length, navigations);
  await change(renderer.root.findByType("input"), "");
  await click(renderer, "Próxima");
  navigations = focusCalls.length;
  await change(categorySelect(renderer), "clima");
  assert.equal(focusCalls.length, navigations);
  assert.equal(scrollCalls.length, navigations);
  await click(renderer, "Próxima");
  navigations = focusCalls.length;
  await change(pageSizeSelect(renderer), "20");
  assert.equal(focusCalls.length, navigations);
  assert.equal(scrollCalls.length, navigations);
  await change(categorySelect(renderer), "todas");
  await click(renderer, "Próxima");
  navigations = focusCalls.length;
  await act(async () => button(renderer, "Limpar filtros").props.onClick());
  assert.equal(focusCalls.length, navigations);
  assert.equal(scrollCalls.length, navigations);
});

test("glossary menu mounts its own heading independently from the weather heading", () => {
  const app = fs.readFileSync(path.join(ROOT, "src/App.jsx"), "utf8");
  assert.match(app, /import GlossaryScreen from "\.\/components\/GlossaryScreen\.jsx"/);
  assert.match(app, /id: "glossary", label: "Glossário"/);
  assert.match(app, /activeView === "glossary" && <GlossaryScreen\s*\/>/);
  assert.match(app, /activeView === "news-brasil" \? null : activeView === "glossary" \? null : activeView === "openweather"/);
});

test("glossary CSS scopes keyboard focus, readable controls, 44px targets and a one-column mobile layout", () => {
  const css = fs.readFileSync(path.join(ROOT, "src/components/glossary.css"), "utf8");
  assert.match(css, /\.glossary-screen :is\(a, button, input, select\):focus-visible,\s*\.glossary-count:focus\s*\{[^}]*outline:\s*3px/s);
  assert.match(css, /\.glossary-filters input,\s*\.glossary-filters select,\s*\.glossary-clear,\s*\.glossary-pagination select,\s*\.glossary-pagination button\s*\{[^}]*min-height:\s*44px;[^}]*color:\s*var\(--ink\);[^}]*background:\s*var\(--surface\)/s);
  assert.match(css, /\.glossary-entry a\s*\{[^}]*min-height:\s*44px/s);
  assert.match(css, /@media \(max-width: 760px\)\s*\{\s*\.glossary-filters,\s*\.glossary-entry\s*\{\s*grid-template-columns:\s*minmax\(0, 1fr\)/s);
  assert.match(css, /\.glossary-filters input,\s*\.glossary-filters select\s*\{[^}]*font-size:\s*1rem/s);
  assert.match(css, /\.glossary-pagination select\s*\{[^}]*font-size:\s*1rem/s);
  const narrowMobile = css.slice(css.indexOf("@media (max-width: 480px)"), css.indexOf("@media (max-width: 760px)"));
  assert.match(narrowMobile, /\.glossary-pagination nav\s*\{[^}]*display:\s*grid;[^}]*width:\s*100%;[^}]*grid-template-columns:\s*repeat\(2, minmax\(0, 1fr\)\)/s);
  assert.match(narrowMobile, /\.glossary-pagination nav p\s*\{[^}]*grid-column:\s*1 \/ -1;[^}]*grid-row:\s*1;/s);
});
