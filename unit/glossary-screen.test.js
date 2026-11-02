import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import React from "react";
import { create, act } from "react-test-renderer";
import { transformWithOxc } from "vite";
import { GLOSSARY_CATEGORIES, GLOSSARY_ENTRIES } from "../src/data/glossary.js";

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

async function mount(t) {
  const requests = [];
  t.mock.method(globalThis, "fetch", async (...args) => { requests.push(args); throw new TypeError("offline"); });
  let renderer;
  await act(async () => { renderer = create(React.createElement(GlossaryScreen)); });
  t.after(async () => { await act(async () => renderer.unmount()); });
  return { renderer, requests };
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
  assert.equal(renderer.root.findAllByType("dt").length, GLOSSARY_ENTRIES.length);
  assert.equal(renderer.root.findAllByType("dd").length, GLOSSARY_ENTRIES.length);
  assert.equal(renderer.root.findByProps({ role: "status" }).props["aria-live"], "polite");
  assert.match(count(renderer), new RegExp(`${GLOSSARY_ENTRIES.length} de ${GLOSSARY_ENTRIES.length} termos`));
  assert.equal(requests.length, 0);
});

test("real React search and category filters update counts, expose empty state and clear both controls offline", async (t) => {
  const { renderer, requests } = await mount(t);
  const input = () => renderer.root.findByType("input");
  const select = () => renderer.root.findByType("select");
  await act(async () => input().props.onChange({ target: { value: "NO₂" } }));
  assert.equal(renderer.root.findAllByType("dt").length, 1);
  assert.match(textOf(renderer.root.findByType("dt")), /^NO2/);
  assert.match(count(renderer), /1 de \d+ termos/);
  await act(async () => select().props.onChange({ target: { value: "governo" } }));
  assert.equal(renderer.root.findAllByType("dl").length, 0);
  assert.match(count(renderer), /0 de \d+ termos/);
  assert.match(textOf(renderer.root), /Nenhum termo corresponde aos filtros/);
  await act(async () => renderer.root.findByType("button").props.onClick());
  assert.equal(input().props.value, "");
  assert.equal(select().props.value, "todas");
  assert.equal(renderer.root.findAllByType("dt").length, GLOSSARY_ENTRIES.length);
  assert.equal(requests.length, 0);
});

test("every reference has an HTTPS destination and announces its safe new tab", async (t) => {
  const { renderer } = await mount(t);
  for (const link of renderer.root.findAllByType("a")) {
    assert.equal(new URL(link.props.href).protocol, "https:");
    assert.equal(link.props.target, "_blank");
    assert.deepEqual(link.props.rel.split(/\s+/).sort(), ["noopener", "noreferrer"]);
    assert.match(link.props["aria-label"], /Conferir: .+ \(abre em nova aba\)/);
    assert.ok(link.props["aria-label"].includes(textOf(link).trim()));
  }
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
  assert.match(css, /\.glossary-screen :is\(a, button, input, select\):focus-visible\s*\{[^}]*outline:\s*3px/s);
  assert.match(css, /\.glossary-filters input,\s*\.glossary-filters select,\s*\.glossary-clear\s*\{[^}]*min-height:\s*44px;[^}]*color:\s*var\(--ink\);[^}]*background:\s*var\(--surface\)/s);
  assert.match(css, /\.glossary-entry a\s*\{[^}]*min-height:\s*44px/s);
  assert.match(css, /@media \(max-width: 760px\)\s*\{\s*\.glossary-filters,\s*\.glossary-entry\s*\{\s*grid-template-columns:\s*minmax\(0, 1fr\)/s);
  assert.match(css, /\.glossary-filters input,\s*\.glossary-filters select\s*\{[^}]*font-size:\s*1rem/s);
});
