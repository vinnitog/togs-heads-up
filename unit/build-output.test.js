import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { build } from "vite";
import viteConfig from "../vite.config.js";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const CONFIG_FILE = path.join(ROOT, "vite.config.js");
const PRODUCTION_BASE = "/togs-heads-up/";
const LEGACY_BASE = "/Togs-heads-up/";

function listFiles(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const filePath = path.join(directory, entry.name);
    return entry.isDirectory() ? listFiles(filePath) : [filePath];
  });
}

test("Vite resolves root base in dev and lowercase repository base in builds", () => {
  const devConfig = viteConfig({ command: "serve" });
  const buildConfig = viteConfig({ command: "build" });

  assert.equal(devConfig.base, "/");
  assert.equal(buildConfig.base, PRODUCTION_BASE);
});

test("real production build emits only resolvable lowercase app paths", async (t) => {
  const outputDirectory = fs.mkdtempSync(path.join(os.tmpdir(), "togs-heads-up-build-"));
  t.after(() => fs.rmSync(outputDirectory, { recursive: true, force: true }));
  const previousKey = process.env.VITE_OPENWEATHER_API_KEY;
  process.env.VITE_OPENWEATHER_API_KEY = "OPENWEATHER_TEST_ONLY_SENTINEL_9137";
  t.after(() => {
    if (previousKey === undefined) delete process.env.VITE_OPENWEATHER_API_KEY;
    else process.env.VITE_OPENWEATHER_API_KEY = previousKey;
  });

  await build({
    configFile: CONFIG_FILE,
    logLevel: "silent",
    build: { outDir: outputDirectory, emptyOutDir: true },
  });

  const indexHtml = fs.readFileSync(path.join(outputDirectory, "index.html"), "utf8");
  const references = [...indexHtml.matchAll(/\b(?:src|href)="([^"]+)"/g)].map((match) => match[1]);

  assert.ok(references.length >= 4, "index must reference manifest, icon, JS and CSS");
  assert.ok(references.every((reference) => reference.startsWith(PRODUCTION_BASE)));
  assert.ok(references.some((reference) => reference === `${PRODUCTION_BASE}manifest.webmanifest`));
  assert.ok(references.some((reference) => reference === `${PRODUCTION_BASE}icon.svg`));
  assert.ok(references.some((reference) => reference.startsWith(`${PRODUCTION_BASE}assets/`) && reference.endsWith(".js")));
  assert.ok(references.some((reference) => reference.startsWith(`${PRODUCTION_BASE}assets/`) && reference.endsWith(".css")));

  for (const reference of references) {
    const relativePath = decodeURIComponent(reference.slice(PRODUCTION_BASE.length)).replaceAll("/", path.sep);
    assert.ok(fs.existsSync(path.join(outputDirectory, relativePath)), `${reference} must exist in build output`);
  }

  const scriptFiles = references
    .filter((reference) => reference.endsWith(".js"))
    .map((reference) => path.join(outputDirectory, reference.slice(PRODUCTION_BASE.length)));
  const bundleSource = scriptFiles.map((file) => fs.readFileSync(file, "utf8")).join("\n");
  assert.match(bundleSource, /serviceWorker\.register\([`'"]\/togs-heads-up\/sw\.js[`'"]/);
  assert.match(bundleSource, /scope\s*:\s*[`'"]\/togs-heads-up\/[`'"]/);
  assert.doesNotMatch(bundleSource, /\/Togs-heads-up\//);

  const serviceWorkerPath = path.join(outputDirectory, "sw.js");
  assert.ok(fs.existsSync(serviceWorkerPath));

  const functionalOutput = listFiles(outputDirectory)
    .filter((file) => /\.(?:html|js|css|webmanifest|svg)$/i.test(file))
    .map((file) => {
      const content = fs.readFileSync(file, "utf8");
      return path.basename(file) === "sw.js" ? content.replace(/^\s*\/\/.*$/gm, "") : content;
    })
    .join("\n");
  assert.doesNotMatch(functionalOutput, new RegExp(LEGACY_BASE.replaceAll("/", "\\/")));
  assert.ok(!functionalOutput.includes("OPENWEATHER_TEST_ONLY_SENTINEL_9137"), "development API key must not be emitted in any public asset");
});
