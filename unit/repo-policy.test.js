import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");

function read(file) {
  return fs.readFileSync(path.join(root, file), "utf8");
}

function listFiles(directory) {
  return fs.readdirSync(path.join(root, directory), { withFileTypes: true }).flatMap((entry) => {
    const relativePath = path.join(directory, entry.name);
    return entry.isDirectory() ? listFiles(relativePath) : [relativePath];
  });
}

function removeExplicitRenameMigrationNotes(content) {
  return content
    .split(/\r?\n/)
    .filter(
      (line) =>
        !(
          line.includes("/Togs-heads-up/") &&
          /\bv12\b|legad|escopo antigo|migra/i.test(line)
        ),
    )
    .join("\n");
}

test("workflow kit files exist", () => {
  for (const file of ["AGENTS.md", "CLAUDE.md", "PROJECT_CONTEXT.md", "test.cmd", "package.json", ".gitignore"]) {
    assert.ok(fs.existsSync(path.join(root, file)), `${file} should exist`);
  }
});

test("vendored skills preserve upstream licenses and notices", () => {
  const licenses = read("THIRD_PARTY_LICENSES.md");
  const skills = read("docs/SKILLS.md");

  assert.match(licenses, /Copyright \(c\) 2026 goul4rt/);
  assert.match(licenses, /Copyright \(c\) 2026 Pawel Huryn/);
  assert.match(licenses, /Apache License[\s\S]*Copyright 2025 Paul Bakaus/);
  assert.match(licenses, /platform-design-skills/);
  assert.match(skills, /d85d79abeeb37cb99fc0785e735a9ca790698a77/);
  assert.match(skills, /56f44523f76efdcec813e67b38ee550e49b16f48/);
  assert.match(skills, /18468a95b427e70e258b51389796367c6f684e7d/);
});

test("codex and claude share the mandatory workflow", () => {
  const agents = read("AGENTS.md");
  const claude = read("CLAUDE.md");
  for (const content of [agents, claude]) {
    const order = ["senior-dev", "ui-ux-expert", "code-reviewer", "qa-senior", "qa-automate"];
    let lastIndex = -1;
    for (const step of order) {
      const index = content.indexOf(step);
      assert.ok(index > lastIndex, `${step} should appear after the previous workflow step`);
      lastIndex = index;
    }
    assert.match(content, /develop/);
    assert.match(content, /Nunca.*push direto.*main|Nunca faca push direto para `main`/s);
  }
});

test("frontend work requires ui ux review", () => {
  const agents = read("AGENTS.md");
  const claude = read("CLAUDE.md");
  assert.match(agents, /qualquer ajuste de front-end deve acionar `ui-ux-expert`/);
  assert.match(claude, /qualquer mudanca de front-end deve passar por avaliacao UI\/UX/);
});

test("browser blocked by client policy is documented", () => {
  const agents = read("AGENTS.md");
  const claude = read("CLAUDE.md");
  for (const content of [agents, claude]) {
    assert.match(content, /ERR_BLOCKED_BY_CLIENT/);
    assert.match(content, /file:\/\//);
    assert.match(content, /localhost/);
    assert.match(content, /127\.0\.0\.1/);
  }
});

test("project context records stack decision", () => {
  const context = read("PROJECT_CONTEXT.md");
  assert.match(context, /## Stack Escolhida/);
  assert.match(context, /## Motivo Da Stack/);
  assert.match(context, /## Alternativas Rejeitadas/);
  assert.match(context, /Revisao Obrigatoria De Stack/);
});

test("LGPD checkpoint keeps L9 as an unpublished draft and L10 not started", () => {
  const status = read(".lgpd/STATUS.md");
  const policy = read(".lgpd/policies/privacy-policy-v1.0-draft.md");
  const lgpdFiles = listFiles(".lgpd");
  const publicFiles = listFiles("public");

  assert.match(status, /- \[x\] L9 — Política de privacidade \(draft; não publicada\)/);
  assert.match(status, /- \[ \] L10 — ECA Digital/);
  assert.match(status, /Não publicar nem iniciar L10 sem aprovação explícita/);
  assert.match(policy, /não vigente/i);
  assert.ok(!lgpdFiles.some((file) => /eca-digital|minor/i.test(file)), "L10 must not have generated artifacts");
  assert.ok(!publicFiles.some((file) => /draft|privacy-policy|politica.*privacidade/i.test(file)));
  for (const file of publicFiles) {
    assert.doesNotMatch(read(file), /v1\.0-draft|não vigente/i, `${file} must not publish draft content`);
  }
});

test("cache versions v4 and v13 stay coherent between code and LGPD drafts", () => {
  const api = read("src/services/earthSpaceApi.js");
  const serviceWorker = read("public/sw.js");
  const versionedDrafts = [
    ".lgpd/data-map.md",
    ".lgpd/retention.md",
    ".lgpd/policies/privacy-policy-v1.0-draft.md",
  ];

  assert.match(api, /CACHE_PREFIX = `\$\{CACHE_NAMESPACE\}v4:`/);
  assert.match(serviceWorker, /CACHE_NAME = `\$\{CACHE_PREFIX\}v13`/);
  assert.match(serviceWorker, /LEGACY_SCOPE_CACHE_NAME = `\$\{CACHE_PREFIX\}v12`/);
  for (const file of versionedDrafts) {
    const content = read(file);
    assert.match(content, /togs-cache:v4:/, `${file} must document localStorage v4`);
    assert.match(content, /togs-heads-up-v13/, `${file} must document Cache Storage v13`);
    assert.match(content, /togs-heads-up-v12/, `${file} must document the preserved legacy-scope v12 cache`);
    assert.doesNotMatch(content, /togs-cache:v3:/, `${file} must not document stale localStorage versions`);
  }
});

test("functional files contain no uppercase legacy deployment path", () => {
  const checkedFiles = [
    ...listFiles("src"),
    ...listFiles("public"),
    ...listFiles("docs"),
    "vite.config.js",
    "index.html",
    ".github/workflows/deploy-pages.yml",
    "README.md",
    ".lgpd/data-map.md",
    ".lgpd/retention.md",
    ".lgpd/policies/privacy-policy-v1.0-draft.md",
  ];

  for (const file of checkedFiles) {
    const functionalContent = removeExplicitRenameMigrationNotes(read(file));
    assert.doesNotMatch(functionalContent, /\/Togs-heads-up\//, `${file} must use the lowercase deployment path`);
  }
});

test("github pages deployment builds vite output for repository subpath", () => {
  const viteConfig = read("vite.config.js");
  const index = read("index.html");
  const main = read("src/main.jsx");
  const manifest = read("public/manifest.webmanifest");
  const serviceWorker = read("public/sw.js");
  const workflow = read(".github/workflows/deploy-pages.yml");
  const packageJson = read("package.json");
  const readme = read("README.md");
  const privacyPolicy = read(".lgpd/policies/privacy-policy-v1.0-draft.md");
  const testCmd = read("test.cmd");

  assert.match(viteConfig, /\/togs-heads-up\//);
  assert.doesNotMatch(viteConfig, /\/Togs-heads-up\//);
  assert.match(readme, /https:\/\/vinnitog\.github\.io\/togs-heads-up\//);
  assert.match(privacyPolicy, /https:\/\/vinnitog\.github\.io\/togs-heads-up\//);
  assert.doesNotMatch(`${readme}\n${privacyPolicy}`, /\/Togs-heads-up\//);
  assert.match(index, /%BASE_URL%manifest\.webmanifest/);
  assert.match(index, /%BASE_URL%icon\.svg/);
  assert.match(main, /register\(`\$\{import\.meta\.env\.BASE_URL\}sw\.js`/);
  assert.match(main, /scope: import\.meta\.env\.BASE_URL/);
  assert.match(manifest, /"start_url": "\.\/"/);
  assert.match(manifest, /"scope": "\.\/"/);
  assert.match(serviceWorker, /CACHE_PREFIX = "togs-heads-up-"/);
  assert.match(serviceWorker, /CACHE_NAME = `\$\{CACHE_PREFIX\}v13`/);
  assert.match(serviceWorker, /LEGACY_SCOPE_CACHE_NAME = `\$\{CACHE_PREFIX\}v12`/);
  assert.match(serviceWorker, /application\/json/);
  assert.match(serviceWorker, /application\/xml/);
  assert.match(serviceWorker, /text\/xml/);
  assert.match(serviceWorker, /requestUrl\.origin !== self\.location\.origin/);
  assert.match(serviceWorker, /\/api\//);
  assert.match(serviceWorker, /self\.registration\.scope/);
  assert.match(workflow, /branches:\s*\n\s*- main\s*\n\s*- develop/);
  assert.match(workflow, /if: github\.ref == 'refs\/heads\/main'/);
  assert.match(packageJson, /"packageManager": "npm@11\.6\.2"/);
  assert.match(testCmd, /npm\.cmd test/);
  assert.match(testCmd, /npm\.cmd run build/);
  assert.match(workflow, /node-version: 24/);
  assert.match(workflow, /npm install -g npm@11\.6\.2/);
  assert.match(workflow, /npm ci/);
  assert.match(workflow, /npm run build/);
  assert.match(workflow, /actions\/upload-pages-artifact/);
  assert.match(workflow, /actions\/deploy-pages/);
});

test("responsive menu keeps accessible state and keyboard escape behavior", () => {
  const app = read("src/App.jsx");
  const styles = read("src/styles.css");

  assert.match(app, /aria-controls="dashboard-menu"/);
  assert.match(app, /aria-expanded=\{isMenuOpen\}/);
  assert.match(app, /id="dashboard-menu"/);
  assert.match(app, /aria-label="Navegação principal do painel"/);
  assert.match(app, /aria-current=\{activeView === item\.id \? "page" : undefined\}/);
  assert.match(app, /event\.key !== "Escape"/);
  assert.match(app, /menuToggleRef\.current\?\.focus\(\)/);

  assert.match(styles, /\.menu-toggle\s*\{\s*display:\s*none;/s);
  const tabletRules = styles.slice(
    styles.indexOf("@media (max-width: 1080px)"),
    styles.indexOf("@media (max-width: 760px)"),
  );
  assert.match(tabletRules, /\.menu-toggle\s*\{[^}]*display:\s*inline-flex;/s);
  assert.match(tabletRules, /\.api-menu\s*\{[^}]*display:\s*none;/s);
  assert.match(tabletRules, /\.api-menu\.open\s*\{[^}]*display:\s*grid;/s);
  assert.match(tabletRules, /\.menu-group\s*\{[^}]*minmax\(150px, 1fr\)/s);

  const phoneRules = styles.slice(styles.indexOf("@media (max-width: 460px)"));
  assert.match(phoneRules, /\.menu-group\s*\{[^}]*grid-template-columns:\s*1fr;/s);
  assert.match(styles, /\.api-menu button\s*\{[^}]*min-height:\s*44px;/s);
});

test("service worker bypasses external APIs before asset caching", () => {
  const serviceWorker = read("public/sw.js");
  const externalCheck = serviceWorker.indexOf("const isExternalRequest = requestUrl.origin !== self.location.origin");
  const bypassGuard = serviceWorker.indexOf(
    'if (isExternalRequest || acceptsDynamicData || requestUrl.pathname.includes("/api/"))',
  );
  const assetCache = serviceWorker.lastIndexOf("event.respondWith(");

  assert.ok(externalCheck >= 0, "service worker should identify cross-origin requests");
  assert.ok(bypassGuard > externalCheck, "external request guard should use the origin check");
  assert.ok(assetCache > bypassGuard, "external APIs should return before the asset cache handler");
  assert.match(serviceWorker.slice(bypassGuard, assetCache), /\{\s*return;\s*\}/);
});

test("service worker only removes old caches owned by this app", () => {
  const serviceWorker = read("public/sw.js");

  assert.match(serviceWorker, /key\.startsWith\(CACHE_PREFIX\) && key !== CACHE_NAME/);
  assert.doesNotMatch(serviceWorker, /keys\.filter\(\(key\) => key !== CACHE_NAME\)/);
});

test("app is consult only and uses public APIs without private keys", () => {
  const app = read("src/App.jsx");
  const api = read("src/services/earthSpaceApi.js");
  const env = read(".env.example");
  const workflow = read(".github/workflows/deploy-pages.yml");

  assert.doesNotMatch(app, new RegExp("Relat" + "ar|Registrar " + "alerta|ReportPanel|PlusCircle|Trash2"));
  assert.doesNotMatch(app, new RegExp("local" + "Storage"));
  assert.doesNotMatch(app, /Dados demo|demonstrativos|SEED_INCIDENTS/);
  assert.match(app, /fetchEarthSpaceDashboard/);
  assert.match(app, /fetchIncidents/);
  assert.match(app, /searchLocations/);
  assert.match(api, /api\.open-meteo\.com/);
  assert.match(api, /geocoding-api\.open-meteo\.com/);
  assert.match(api, /servicos\.cptec\.inpe\.br/);
  assert.match(api, /fireball\.api/);
  assert.doesNotMatch(api, /planetary\/apod|neo\/rest\/v1\/feed|cad\.api|mars-photos|api_key/i);
  assert.doesNotMatch(app, /NASA APOD|NASA NeoWs|JPL CAD|Fotos de Marte/);
  assert.doesNotMatch(env, /VITE_NASA_API_KEY|VITE_INCIDENTS_API_URL|VITE_INFOSIGA_API_URL/);
  assert.doesNotMatch(workflow, /VITE_NASA_API_KEY|secrets\.VITE_/);
});
