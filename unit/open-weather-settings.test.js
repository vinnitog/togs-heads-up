import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { readOpenWeatherKey, saveOpenWeatherKey } from "../src/services/openWeatherSettings.js";
import { AIR_QUALITY_LABELS, POLLUTANTS, formatOpenWeatherTime, formatOpenWeatherValue } from "../src/utils/openWeatherDisplay.js";

function sessionStorage() {
  const entries = new Map();
  return { getItem: (key) => entries.get(key) ?? null, setItem: (key, value) => entries.set(key, value) };
}

test("session keys override development configuration and disconnect stays disconnected", () => {
  const storage = sessionStorage();
  const env = { DEV: true, VITE_OPENWEATHER_API_KEY: " development-test-key " };
  assert.equal(readOpenWeatherKey(env, storage), "development-test-key");
  assert.equal(saveOpenWeatherKey(" session-test-key ", storage), "session-test-key");
  assert.equal(readOpenWeatherKey(env, storage), "session-test-key");
  saveOpenWeatherKey("", storage);
  assert.equal(readOpenWeatherKey(env, storage), "");
});

test("production never reads a development key and blocked storage keeps connection usable", () => {
  const env = { DEV: false, VITE_OPENWEATHER_API_KEY: "development-test-key" };
  const blocked = { getItem() { throw new Error("blocked"); }, setItem() { throw new Error("blocked"); } };
  assert.equal(readOpenWeatherKey(env, sessionStorage()), "");
  assert.equal(readOpenWeatherKey(env, blocked), "");
  assert.equal(saveOpenWeatherKey(" session-test-key ", blocked), "session-test-key");
  assert.equal(saveOpenWeatherKey(undefined, blocked), "");
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
