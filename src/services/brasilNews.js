export const BRASIL_NEWS_SINCE = "2026-10-25T00:00:00-03:00";
export const BRASIL_NEWS_ELECTION_SOURCE = "https://www.tre-sp.jus.br/comunicacao/noticias/2026/Outubro/eleicoes-2026-lula-e-reeleito-presidente-da-republica-confira-resultado-do-2o-turno-em-sp";
export const BRASIL_NEWS_CATEGORIES = {
  proposta: "Proposta / tramitação",
  ato: "Ato noticiado",
  decisao: "Decisão noticiada",
  acompanhamento: "Acompanhamento",
};
export const BRASIL_NEWS_BRANCHES = {
  executivo: "Executivo",
  legislativo: "Legislativo",
  judiciario: "Judiciário",
  diversos: "Poder não identificado",
};
export const BRASIL_NEWS_SOURCES = [
  { id: "camara", label: "Agência Câmara", type: "oficial", branch: "legislativo", feedUrl: "https://www.camara.leg.br/noticias/rss/ultimas-noticias", hosts: ["www.camara.leg.br"] },
  { id: "senado", label: "Agência Senado", type: "oficial", branch: "legislativo", feedUrl: "https://www12.senado.leg.br/noticias/rss.xml", hosts: ["www12.senado.leg.br"] },
  { id: "agenciagov", label: "Agência Gov", type: "oficial", branch: "executivo", feedUrl: "https://agenciagov.ebc.com.br/@@RSS", hosts: ["agenciagov.ebc.com.br"] },
  { id: "stf", label: "Supremo Tribunal Federal", type: "oficial", branch: "judiciario", feedUrl: "https://noticias.stf.jus.br/feed/?post_type=postsnoticias", hosts: ["noticias.stf.jus.br"] },
  { id: "stj", label: "Superior Tribunal de Justiça", type: "oficial", branch: "judiciario", feedUrl: "https://res.stj.jus.br/hrestp-c-portalp/RSS.xml", hosts: ["www.stj.jus.br"], feedHosts: ["res.stj.jus.br"] },
  { id: "agenciabrasil", label: "Agência Brasil", type: "imprensa-publica", branch: "diversos", feedUrl: "https://agenciabrasil.ebc.com.br/rss/politica/feed.xml", hosts: ["agenciabrasil.ebc.com.br"] },
  { id: "g1", label: "g1 · Política", type: "imprensa", branch: "diversos", feedUrl: "https://g1.globo.com/rss/g1/politica/", hosts: ["g1.globo.com"] },
  { id: "folha", label: "Folha de S.Paulo · Poder", type: "imprensa", branch: "diversos", feedUrl: "https://feeds.folha.uol.com.br/poder/rss091.xml", hosts: ["www1.folha.uol.com.br"], feedHosts: ["feeds.folha.uol.com.br"] },
];
export const BRASIL_NEWS_COVERAGE = "Seleção automática de atos federais nos feeds monitorados, desde 25/10/2026. Feeds têm alcance limitado; o histórico cresce a partir das coletas e não garante todas as notícias ou atos. A origem é conferida pelo domínio, sem certificar o conteúdo ou a vigência da medida.";

const SINCE_MS = Date.parse(BRASIL_NEWS_SINCE);
const FUTURE_TOLERANCE_MS = 5 * 60 * 1000;
const SOURCE_MAP = new Map(BRASIL_NEWS_SOURCES.map((source) => [source.id, source]));
const normalizeSearch = (value) => String(value ?? "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
export const plainNewsText = (value) => String(value ?? "").replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();

export function canonicalBrasilNewsUrl(value, source) {
  if (!source || typeof value !== "string") return null;
  let candidate = value.trim();
  // A Folha inclui o destino literal em seu link RSS; nunca seguimos o rastreador.
  const folhaPrefix = "https://redir.folha.com.br/redir/online/poder/rss091/*";
  if (source.id === "folha" && candidate.startsWith(folhaPrefix)) candidate = candidate.slice(folhaPrefix.length);
  try {
    const url = new URL(candidate);
    if (url.protocol !== "https:" || url.username || url.password || url.port || !source.hosts.includes(url.hostname)) return null;
    if (url.pathname === "/" || /(?:\/rss(?:\/|\.|$)|\/feed\/?$|\/@@|\/tags?\/|\/category\/)/i.test(url.pathname)) return null;
    if (source.id === "camara" && !/^\/noticias\/\d+-/.test(url.pathname)) return null;
    if (source.id === "senado" && !url.pathname.startsWith("/noticias/materias/")) return null;
    if (source.id === "agenciagov" && !/^\/noticias\/\d{6}\/.+/.test(url.pathname)) return null;
    if (source.id === "agenciabrasil" && !url.pathname.includes("/noticia/")) return null;
    if (source.id === "stf" && !url.pathname.startsWith("/postsnoticias/")) return null;
    if (source.id === "stj" && !url.pathname.startsWith("/sites/portalp/Paginas/Comunicacao/Noticias/")) return null;
    if (source.id === "g1" && (!url.pathname.endsWith(".ghtml") || url.pathname.includes("/fato-ou-fake/"))) return null;
    if (source.id === "folha" && (!url.pathname.endsWith(".shtml") || url.pathname.includes("/colunas/"))) return null;
    for (const key of [...url.searchParams.keys()]) {
      if (/^(?:utm_.+|fbclid|gclid|mc_cid|mc_eid)$/i.test(key)) url.searchParams.delete(key);
    }
    url.hash = "";
    return url.href;
  } catch {
    return null;
  }
}

export function classifyBrasilNews(title, context = "", source = {}) {
  const headline = normalizeSearch(title);
  const lead = normalizeSearch(context).slice(0, 500);
  const text = `${headline} ${lead}`;
  if (/\b(?:prefeitura|prefeito|camara municipal|vereador|assembleia legislativa|governador)\b/.test(headline)
    && !/\b(?:federal|congresso|stf|senado|lula|ministerio)\b/.test(headline)) return null;
  const measure = /\b(?:leis?|decretos?|portarias?|resolucoes?|resolucao|normas?|regulamenta\w*|regulacao|regulatori\w*|proib\w*|vetos?|veta\w*|vetou|sancion\w*|promulg\w*|medida provisoria|mp \d|pec\b|projeto de lei|pl \d|instrucao normativa|emenda constitucional|regras?|liminar|inconstitucional\w*|constitucionalidade|decisao|decide\w*|determina\w*|suspend\w*)\b/;
  const federal = source.branch && source.branch !== "diversos"
    || /\b(?:federal|congresso|senado|senadores?|deputad[oa]s?|camara dos deputados|stf|stj|supremo|ministerios?|ministr[oa]s?|lula|planalto|presiden\w*|anvisa|anatel|anpd|banco central)\b/.test(text);
  if (!federal || !measure.test(text)) return null;
  if (source.branch === "diversos" && !measure.test(headline)
    && !/\b(?:entra em vigor|passa a valer|obrigator\w*|devem oferecer|tem de|tera de)\b/.test(headline)) return null;
  let branch = source.branch ?? "diversos";
  const executiveAct = /^(?:(?:presidente )?lula|governo(?: federal)?|planalto|presidencia)\s+(?:sanciona|sancionou|veta|vetou|publica|publicou|promulga|promulgou|decreta|decretou|revoga|revogou|regulamenta|regulamentou)\b/.test(headline);
  if (executiveAct) branch = "executivo";
  else if (/\b(?:stf|stj|tse|supremo|judiciari\w*|tribunal|liminar|moraes|fachin|mendonca|nunes marques)\b/.test(headline)) branch = "judiciario";
  else if (/\b(?:camara|senado|senador\w*|deputad\w*|congresso|pec)\b/.test(headline)) branch = "legislativo";
  else if (/\b(?:lula|governo|planalto|presidente|ministerio|anvisa|anatel|anpd|banco central)\b/.test(headline) && !/ministerio publico/.test(headline)) branch = "executivo";
  if (branch === "diversos") {
    if (/\b(?:stf|stj|tse|supremo|tribunal federal|ministerio publico)\b/.test(lead)) branch = "judiciario";
    else if (/\b(?:camara dos deputados|senado|congresso)\b/.test(lead)) branch = "legislativo";
    else if (/\b(?:governo federal|ministerio|planalto|lula)\b/.test(lead)) branch = "executivo";
  }
  // Uma manchete não comprova publicação no DOU ou início da vigência.
  let category = "acompanhamento";
  if (executiveAct) category = "ato";
  else if (/\b(?:promet\w*|pretende|planeja|anuncia que vai|vetara|vetarao)\b/.test(headline)) category = "proposta";
  else if (/\b(?:audiencia publica|consulta publica|discute|discutira|discutem|pauta|agendad[oa]s?)\b/.test(headline)) category = "acompanhamento";
  else if (/\b(?:projeto|proposta|pec|tramita\w*|comissao|aprova\w*|votacao|vota\w*|debate\w*|pretende|podera|quer|sugere)\b/.test(headline)) category = "proposta";
  else if (branch === "judiciario" && /\b(?:decid\w*|decisao|determina\w*|suspend\w*|proib\w*|liminar|inconstitucional\w*|valida\w*|anula\w*|julg\w*)\b/.test(headline)) category = "decisao";
  else if (/\b(?:sancion\w*|publicad[oa]s?|publica (?:decreto|portaria|norma)|promulg\w*|decret\w*|portaria|resolucao|entra\w* em vigor|passa\w* a valer|regulament\w*|veta\w*|revoga\w*|proib\w*)\b/.test(headline)) category = "ato";
  return { category, branch: BRASIL_NEWS_BRANCHES[branch] ? branch : "diversos" };
}

export function normalizeBrasilNewsArticle(raw, { source, now = Date.now(), classify = false } = {}) {
  const registered = SOURCE_MAP.get(source?.id ?? raw?.sourceId);
  if (!registered) return null;
  const url = canonicalBrasilNewsUrl(raw?.url, registered);
  const title = plainNewsText(raw?.title).slice(0, 400);
  const publishedMs = Date.parse(raw?.publishedAt);
  if (!url || !title || !Number.isFinite(publishedMs) || publishedMs < SINCE_MS || publishedMs > now + FUTURE_TOLERANCE_MS) return null;
  const classification = classify ? classifyBrasilNews(title, raw?.context, registered) : raw;
  if (!classification || !Object.hasOwn(BRASIL_NEWS_CATEGORIES, classification.category) || !Object.hasOwn(BRASIL_NEWS_BRANCHES, classification.branch)) return null;
  return { id: url, title, url, publishedAt: new Date(publishedMs).toISOString(), sourceId: registered.id, category: classification.category, branch: classification.branch };
}

export function mergeBrasilNewsArticles(previous = [], incoming = [], { now = Date.now() } = {}) {
  const articles = new Map();
  for (const raw of [...previous, ...incoming]) {
    const article = normalizeBrasilNewsArticle(raw, { now });
    if (article) articles.set(article.url, article);
  }
  return [...articles.values()].sort((a, b) => b.publishedAt.localeCompare(a.publishedAt) || a.url.localeCompare(b.url));
}

export function filterBrasilNews(articles, { query = "", origin = "todas", branch = "todos", category = "todas" } = {}) {
  const term = normalizeSearch(query).trim();
  return articles.filter((article) => {
    const source = SOURCE_MAP.get(article.sourceId);
    return (origin === "todas" || source?.type === origin)
      && (branch === "todos" || article.branch === branch)
      && (category === "todas" || article.category === category)
      && (!term || normalizeSearch(`${article.title} ${source?.label ?? ""}`).includes(term));
  });
}

export function normalizeBrasilNewsFeed(payload, { now = Date.now() } = {}) {
  if (payload?.schemaVersion !== 1 || payload.since !== BRASIL_NEWS_SINCE || !Array.isArray(payload.articles) || !Array.isArray(payload.sources)
    || !Number.isFinite(Date.parse(payload.generatedAt)) || Date.parse(payload.generatedAt) < SINCE_MS || Date.parse(payload.generatedAt) > now + FUTURE_TOLERANCE_MS) {
    throw new Error("Formato da coleta News Brasil inválido.");
  }
  return {
    schemaVersion: 1,
    since: BRASIL_NEWS_SINCE,
    generatedAt: new Date(payload.generatedAt).toISOString(),
    coverage: BRASIL_NEWS_COVERAGE,
    articles: mergeBrasilNewsArticles([], payload.articles, { now }),
    sources: BRASIL_NEWS_SOURCES.map((source) => {
      const status = payload.sources.find((entry) => entry?.id === source.id);
      const successMs = Date.parse(status?.lastSuccessAt);
      const validSuccess = Number.isFinite(successMs) && successMs >= SINCE_MS && successMs <= Date.parse(payload.generatedAt);
      return { id: source.id, state: status?.state === "ok" && validSuccess ? "ok" : "erro",
        lastSuccessAt: validSuccess ? new Date(successMs).toISOString() : null,
        detail: plainNewsText(status?.detail).slice(0, 300), count: Number.isInteger(status?.count) && status.count >= 0 ? status.count : 0 };
    }),
  };
}

export async function fetchBrasilNews({ fetchImpl = globalThis.fetch, signal, baseUrl = import.meta.env?.BASE_URL ?? "/", timeoutMs = 15000 } = {}) {
  const controller = new AbortController();
  const abort = () => controller.abort();
  if (signal?.aborted) abort();
  else signal?.addEventListener("abort", abort, { once: true });
  const timer = setTimeout(abort, timeoutMs);
  try {
    const response = await fetchImpl(`${baseUrl.replace(/\/?$/, "/")}data/news-brasil.json`, { signal: controller.signal, cache: "no-store", headers: { Accept: "application/json" } });
    if (!response.ok) throw new Error(`Coleta News Brasil indisponível (HTTP ${response.status}).`);
    return normalizeBrasilNewsFeed(await response.json());
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener("abort", abort);
  }
}
