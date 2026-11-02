import test from "node:test";
import assert from "node:assert/strict";
import { GLOSSARY_CATEGORIES, GLOSSARY_ENTRIES, GLOSSARY_SOURCES, filterGlossaryEntries, normalizeGlossarySearch } from "../src/data/glossary.js";
import { POLLUTANTS } from "../src/utils/openWeatherDisplay.js";
import { OPEN_WEATHER_MAP_LAYERS } from "../src/services/openWeatherApi.js";

test("glossary entries have unique IDs, complete explanations and registered categories and sources", () => {
  assert.equal(new Set(GLOSSARY_ENTRIES.map(({ id }) => id)).size, GLOSSARY_ENTRIES.length);
  assert.deepEqual([...new Set(GLOSSARY_ENTRIES.map(({ category }) => category))].sort(), Object.keys(GLOSSARY_CATEGORIES).sort());
  for (const entry of GLOSSARY_ENTRIES) {
    for (const field of ["id", "term", "name", "description"]) assert.ok(entry[field]?.trim(), `${entry.id}: ${field}`);
    assert.ok(GLOSSARY_CATEGORIES[entry.category]);
    assert.ok(GLOSSARY_SOURCES[entry.sourceId], `${entry.id} must cite a registered source`);
    if (entry.aliases) assert.ok(entry.aliases.every((alias) => typeof alias === "string" && alias.trim()));
  }
  for (const { label, url } of Object.values(GLOSSARY_SOURCES)) {
    assert.ok(label.trim());
    const parsed = new URL(url);
    assert.equal(parsed.protocol, "https:");
    assert.ok(parsed.hostname);
    assert.equal(parsed.username + parsed.password, "");
  }
});

test("glossary covers all displayed pollutant labels, map units and known federal-news acronyms", () => {
  const publicTerms = [...POLLUTANTS.map(([, label]) => label), ...OPEN_WEATHER_MAP_LAYERS.map(({ unit }) => unit), "STF", "PEC", "PGR", "INSS", "TSE", "PSOL"];
  for (const term of publicTerms) {
    const normalized = normalizeGlossarySearch(term);
    assert.ok(GLOSSARY_ENTRIES.some((entry) => [entry.term, ...(entry.aliases ?? [])].some((value) => normalizeGlossarySearch(value) === normalized)), `${term} needs an exact glossary term or alias`);
  }
});

test("glossary search normalizes case, accents, subscripts, decimal marks and microgram variants", () => {
  assert.equal(normalizeGlossarySearch(null), "");
  assert.equal(normalizeGlossarySearch("  NITROGÊNIO  "), "nitrogenio");
  assert.equal(normalizeGlossarySearch("NO₂"), "no2");
  assert.equal(normalizeGlossarySearch("μg/m³"), normalizeGlossarySearch("ug/m3"));
  for (const [query, id] of [["cape", "cape"], ["energia potencial convectiva", "cape"], ["nitrogenio", "no2"], ["NO₂", "no2"], ["μg/m³", "ugm3"], ["ug/m3", "ugm3"], ["PM2.5", "pm25"], ["AQI", "iqa"], ["C", "celsius"], ["°C", "celsius"], ["m/s", "ms"], ["CORS", "cors"], ["%", "porcentagem"]]) {
    assert.ok(filterGlossaryEntries(undefined, { query }).some((entry) => entry.id === id), `${query} must find ${id}`);
  }
});

test("exact acronyms rank before incidental matches and remaining results are alphabetical without mutation", () => {
  const original = structuredClone(GLOSSARY_ENTRIES);
  const results = filterGlossaryEntries(undefined, { query: "NO" });
  assert.equal(results[0].id, "no");
  assert.ok(results.length > 1);
  const rest = results.slice(1).map(({ term }) => term);
  assert.deepEqual(rest, [...rest].sort((left, right) => left.localeCompare(right, "pt-BR", { numeric: true, sensitivity: "base" })));
  assert.deepEqual(GLOSSARY_ENTRIES, original);
  assert.notEqual(filterGlossaryEntries(), GLOSSARY_ENTRIES);
});

test("category and search compose, whitespace resets search and unknown filters return no terms", () => {
  const all = filterGlossaryEntries(undefined, { query: "  " });
  assert.equal(all.length, GLOSSARY_ENTRIES.length);
  const climate = filterGlossaryEntries(undefined, { category: "clima" });
  assert.ok(climate.length > 0 && climate.every(({ category }) => category === "clima"));
  assert.deepEqual(filterGlossaryEntries(undefined, { query: "nitrogenio", category: "clima" }).map(({ id }) => id).sort(), ["no", "no2"]);
  assert.deepEqual(filterGlossaryEntries(undefined, { query: "NASA", category: "governo" }), []);
  assert.deepEqual(filterGlossaryEntries(undefined, { category: "inexistente" }), []);
  assert.deepEqual(filterGlossaryEntries(undefined, { query: "termo-inexistente-9876" }), []);
});
