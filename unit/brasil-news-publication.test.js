import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { BRASIL_NEWS_SOURCES, normalizeBrasilNewsFeed } from "../src/services/brasilNews.js";

test("published news seed validates against the actual source registry without fixed article counts", () => {
  const payload = JSON.parse(fs.readFileSync(new URL("../public/data/news-brasil.json", import.meta.url), "utf8"));
  const normalized = normalizeBrasilNewsFeed(payload, { now: Math.max(Date.now(), Date.parse(payload.generatedAt)) });
  assert.equal(normalized.articles.length, payload.articles.length, "every published article must pass provenance validation");
  assert.equal(normalized.sources.length, BRASIL_NEWS_SOURCES.length);
  assert.equal(new Set(normalized.articles.map(({ url }) => url)).size, normalized.articles.length);
});

test("scheduled publication restores history, collects and saves it before building, then only deploys main", () => {
  const workflow = fs.readFileSync(new URL("../.github/workflows/deploy-pages.yml", import.meta.url), "utf8");
  assert.match(workflow, /schedule:\s*\r?\n\s+- cron: '17,47 \* \* \* \*'/);
  const steps = ["Restore News Brasil history", "Collect News Brasil", "Preserve News Brasil history", "Run tests", "name: Build", "Upload Pages artifact"];
  let previous = -1;
  for (const step of steps) {
    const index = workflow.indexOf(step);
    assert.ok(index > previous, `${step} must execute after the preceding step`);
    previous = index;
  }
  assert.match(workflow, /node scripts\/collect-brasil-news\.mjs/);
  assert.match(workflow, /news-brasil-v1-\$\{\{ github\.ref_name \}\}/);
  assert.match(workflow, /if: github\.ref == 'refs\/heads\/main'/);
  assert.doesNotMatch(workflow, /git (?:commit|push)/);
});

test("main menu exposes News Brasil and only mounts its independent screen when selected", () => {
  const app = fs.readFileSync(new URL("../src/App.jsx", import.meta.url), "utf8");
  assert.match(app, /id: "news-brasil", label: "News Brasil"/);
  assert.match(app, /activeView === "news-brasil" && <BrasilNewsScreen\s*\/>/);
  assert.match(app, /activeView === "news-brasil" \? null : activeView === "openweather"/);
});
