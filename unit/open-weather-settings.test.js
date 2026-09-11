import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { readOpenWeatherKey } from "../src/services/openWeatherSettings.js";
import { AIR_QUALITY_LABELS, POLLUTANTS, formatOpenWeatherTime, formatOpenWeatherValue } from "../src/utils/openWeatherDisplay.js";

test("automatic configuration uses a trimmed environment key in development and production", () => {
  for (const DEV of [true, false]) {
    assert.equal(readOpenWeatherKey({ DEV, VITE_OPENWEATHER_API_KEY: " automatic-test-key " }), "automatic-test-key");
    for (const key of [undefined, null, "", " \t\n "]) {
      assert.equal(readOpenWeatherKey({ DEV, VITE_OPENWEATHER_API_KEY: key }), "");
    }
  }
});

test("legacy session values and blocked storage never interfere with automatic configuration", (t) => {
  const original = Object.getOwnPropertyDescriptor(globalThis, "sessionStorage");
  t.after(() => {
    if (original) Object.defineProperty(globalThis, "sessionStorage", original);
    else delete globalThis.sessionStorage;
  });
  for (const saved of ["", "malformed-old-key", null]) {
    let reads = 0;
    Object.defineProperty(globalThis, "sessionStorage", { configurable: true, value: { getItem() { reads++; return saved; } } });
    assert.equal(readOpenWeatherKey({ VITE_OPENWEATHER_API_KEY: "automatic-test-key" }), "automatic-test-key");
    assert.equal(reads, 0);
  }
  Object.defineProperty(globalThis, "sessionStorage", { configurable: true, get() { throw new Error("storage disabled"); } });
  assert.equal(readOpenWeatherKey({ VITE_OPENWEATHER_API_KEY: "automatic-test-key" }), "automatic-test-key");
  assert.equal(readOpenWeatherKey({}), "");
});

test("automatic weather loading needs no visitor key form and reports missing configuration", () => {
  const screen = fs.readFileSync(new URL("../src/components/OpenWeatherScreen.jsx", import.meta.url), "utf8");
  const app = fs.readFileSync(new URL("../src/App.jsx", import.meta.url), "utf8");
  const settings = fs.readFileSync(new URL("../src/services/openWeatherSettings.js", import.meta.url), "utf8");
  assert.doesNotMatch(`${screen}\n${app}\n${settings}`, /type="password"|onKeyChange|saveOpenWeatherKey|changeOpenWeatherKey|Conectar OpenWeather|Desconectar|Conecte sua chave/);
  assert.match(app, /const openWeatherKey = readOpenWeatherKey\(\)/);
  assert.match(app, /fetchOpenWeatherDashboard\(\{ location, apiKey: openWeatherKey, signal: controller.signal \}\)/);
  assert.match(app, /\[openWeatherKey, location, openWeatherRefresh\]/);
  assert.match(screen, /!apiKey \? "OpenWeather temporariamente indisponível nesta versão\."/);
});

test("weather displays distinguish absent values from zero", () => {
  for (const value of [null, undefined, NaN, Infinity]) assert.equal(formatOpenWeatherValue(value, " C"), "--");
  assert.equal(formatOpenWeatherValue(0, "%"), "0%");
  assert.equal(formatOpenWeatherValue(1.25, " mm"), "1,3 mm");
  assert.equal(formatOpenWeatherValue(-2, " C"), "-2 C");
  assert.equal(POLLUTANTS.length, 8);
  assert.equal(AIR_QUALITY_LABELS[1], "Boa");
  assert.equal(AIR_QUALITY_LABELS[5], "Muito ruim");
});

test("timestamps use the selected location UTC offset independently of the computer timezone", () => {
  const noon = Date.UTC(2026, 8, 11, 12, 30) / 1000;
  assert.equal(formatOpenWeatherTime(noon, -10800), "09:30");
  assert.equal(formatOpenWeatherTime(noon, 19800), "18:00");
  assert.equal(formatOpenWeatherTime(noon, null), "12:30");
  assert.match(formatOpenWeatherTime(noon, -10800, true), /11\/09.*09:30/);
  assert.equal(formatOpenWeatherTime(null), "--");
  assert.equal(formatOpenWeatherTime(undefined), "--");
  assert.equal(formatOpenWeatherTime(0), "00:00");
});

test("map and search lifecycle guards avoid background tiles and stale authenticated views", () => {
  const screen = fs.readFileSync(new URL("../src/components/OpenWeatherScreen.jsx", import.meta.url), "utf8");
  const app = fs.readFileSync(new URL("../src/App.jsx", import.meta.url), "utf8");
  assert.match(screen, /tab === "maps" && <WeatherMap/);
  assert.match(screen, /<LocationSearch key=\{apiKey\}/);
  assert.match(screen, /<WeatherMap key=\{`\$\{location.latitude\}:\$\{location.longitude\}:\$\{apiKey\}`\}/);
  assert.match(screen, /useEffect\(\(\) => \(\) => request.current\?\.abort\(\), \[apiKey\]\)/);
  assert.match(screen, /if \(controller.signal.aborted\) return;\s*setResults\(matches\)/);
  assert.match(screen, /observer.disconnect\(\); map.remove\(\)/);
  assert.match(screen, /overlay.off\(\); overlay.remove\(\)/);
  assert.match(app, /if \(controller.signal.aborted\) return;\s*setOpenWeather\(result\)/);
  assert.match(screen, /<caption>\{Number.isFinite\(offset\) \? "Horário local" : "UTC"\}/);
});
