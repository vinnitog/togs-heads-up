import { useEffect, useMemo, useState } from "react";
import { ExternalLink, RefreshCw } from "lucide-react";
import {
  BRASIL_NEWS_BRANCHES,
  BRASIL_NEWS_CATEGORIES,
  BRASIL_NEWS_ELECTION_SOURCE,
  BRASIL_NEWS_SOURCES,
  fetchBrasilNews,
  filterBrasilNews,
} from "../services/brasilNews.js";
import "./brasilNews.css";

const PAGE_SIZE = 25;
const ORIGIN_LABELS = {
  oficial: "Portal oficial",
  "imprensa-publica": "Imprensa pública",
  imprensa: "Imprensa",
};
const SOURCE_BY_ID = new Map(BRASIL_NEWS_SOURCES.map((source) => [source.id, source]));

function formatDate(value) {
  return value
    ? new Date(value).toLocaleString("pt-BR", {
      timeZone: "America/Sao_Paulo", dateStyle: "short", timeStyle: "short",
    })
    : "Ainda sem coleta bem-sucedida";
}

export default function BrasilNewsScreen() {
  const [feed, setFeed] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [refresh, setRefresh] = useState(0);
  const [query, setQuery] = useState("");
  const [origin, setOrigin] = useState("todas");
  const [branch, setBranch] = useState("todos");
  const [category, setCategory] = useState("todas");
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [clock, setClock] = useState(Date.now);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError("");
    fetchBrasilNews({ signal: controller.signal })
      .then((result) => {
        if (controller.signal.aborted) return;
        setFeed(result);
        setClock(Date.now());
      })
      .catch(() => {
        if (!controller.signal.aborted) {
          setError("Não foi possível carregar a coleta publicada. Tente atualizar o painel quando a conexão voltar.");
        }
      })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [refresh]);

  useEffect(() => {
    const timer = setInterval(() => {
      setClock(Date.now());
      setRefresh((value) => value + 1);
    }, 5 * 60 * 1000);
    return () => clearInterval(timer);
  }, []);

  const filtered = useMemo(() => filterBrasilNews(feed?.articles ?? [], {
    query, origin, branch, category,
  }).sort((a, b) => Date.parse(b.publishedAt) - Date.parse(a.publishedAt)), [feed, query, origin, branch, category]);
  const stale = feed?.generatedAt && clock - Date.parse(feed.generatedAt) > 90 * 60 * 1000;
  const availableSources = feed?.sources.filter((source) => source.state === "ok").length ?? 0;

  function changeFilter(setter, value) {
    setter(value);
    setVisibleCount(PAGE_SIZE);
  }

  function clearFilters() {
    setQuery("");
    setOrigin("todas");
    setBranch("todos");
    setCategory("todas");
    setVisibleCount(PAGE_SIZE);
  }

  return (
    <div className="brasil-news">
      <header className="screen-heading">
        <div>
          <h2>News Brasil</h2>
          <p className="brasil-news-intro">Leis, normas e decisões federais desde 25/10/2026</p>
        </div>
        <button className="ghost-button" type="button" disabled={loading} onClick={() => {
          setClock(Date.now());
          setRefresh((value) => value + 1);
        }}>
          <RefreshCw size={16} aria-hidden="true" className={loading ? "spin" : undefined} />
          {loading ? "Carregando…" : "Atualizar painel"}
        </button>
      </header>

      <div className="brasil-news-context">
        <p>Executivo, Câmara, Senado e tribunais: acompanhe atos e propostas com acesso à publicação original.</p>
        <p>Recorte a partir da reeleição de 2026, <a href={BRASIL_NEWS_ELECTION_SOURCE} target="_blank" rel="noopener noreferrer">confirmada pela Justiça Eleitoral <ExternalLink size={13} aria-hidden="true" /></a>.</p>
        <p className="brasil-news-note">A origem é conferida pelo domínio da fonte. Isso não confirma a veracidade de cada notícia nem a vigência de uma norma. As categorias são estimadas pelo título; confira o ato original e o Diário Oficial.</p>
      </div>

      <section className="data-section" aria-label="Notícias sobre atos federais" aria-busy={loading}>
        <div className="brasil-news-filters">
          <label className="brasil-news-search">Buscar assunto ou autoridade
            <input type="search" value={query} placeholder="Ex.: decreto, imposto, ministro" maxLength={200} onChange={(event) => changeFilter(setQuery, event.target.value)} />
          </label>
          <label>Origem
            <select value={origin} onChange={(event) => changeFilter(setOrigin, event.target.value)}>
              <option value="todas">Todas as origens</option>
              {Object.entries(ORIGIN_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
          </label>
          <label>Poder
            <select value={branch} onChange={(event) => changeFilter(setBranch, event.target.value)}>
              <option value="todos">Todos os poderes</option>
              {Object.entries(BRASIL_NEWS_BRANCHES).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
          </label>
          <label>Tipo de notícia
            <select value={category} onChange={(event) => changeFilter(setCategory, event.target.value)}>
              <option value="todas">Todos os tipos</option>
              {Object.entries(BRASIL_NEWS_CATEGORIES).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
          </label>
        </div>
        <div className="brasil-news-results">
          <p role="status" aria-live="polite">{loading ? "Carregando a última coleta publicada…" : `Mostrando ${Math.min(visibleCount, filtered.length)} de ${filtered.length} notícia(s) no filtro · mais recentes primeiro`}</p>
          <button className="ghost-button" type="button" onClick={clearFilters}>Limpar filtros</button>
        </div>

        {error && <p className="screen-alert error" role="alert">{error} {feed ? "Exibindo a última coleta carregada nesta sessão." : ""}</p>}
        {feed && (stale || availableSources === 0) && <p className="screen-alert warning" role="status">{availableSources === 0
          ? "Nenhuma fonte respondeu na última tentativa. Os registros anteriores, quando disponíveis, foram preservados."
          : "A coleta publicada está há mais de 90 minutos sem atualização."}</p>}
        {!loading && !error && filtered.length === 0 && <p className="empty-state">{feed?.articles.length
          ? "Nenhuma notícia corresponde aos filtros. Altere a busca ou limpe os filtros."
          : "Nenhuma notícia disponível no recorte. Consulte abaixo o estado das fontes; isso não significa ausência de novos atos."}</p>}

        <div className="brasil-news-list">
          {filtered.slice(0, visibleCount).map((article) => {
            const source = SOURCE_BY_ID.get(article.sourceId);
            return <article className="brasil-news-article" key={article.id}>
              <div className="brasil-news-article-meta">
                <span className={`brasil-news-origin ${source.type}`}>{ORIGIN_LABELS[source.type]}</span>
                <span>{BRASIL_NEWS_CATEGORIES[article.category]}</span>
                <span>{BRASIL_NEWS_BRANCHES[article.branch]}</span>
              </div>
              <h3><a href={article.url} target="_blank" rel="noopener noreferrer">{article.title} <ExternalLink size={15} aria-label="Abre em nova aba" /></a></h3>
              <p className="brasil-news-byline">{source.label} · {new URL(article.url).hostname} · <time dateTime={article.publishedAt}>{formatDate(article.publishedAt)}</time> (Brasília)</p>
            </article>;
          })}
        </div>
        {filtered.length > visibleCount && <button className="ghost-button brasil-news-more" type="button" onClick={() => setVisibleCount((count) => count + PAGE_SIZE)}>
          Mostrar mais {Math.min(PAGE_SIZE, filtered.length - visibleCount)} notícias
        </button>}
      </section>

      <section className="brasil-news-provenance data-section" aria-labelledby="brasil-news-sources-title">
        <h3 id="brasil-news-sources-title">Fontes e cobertura</h3>
        <p>Última tentativa de coleta: <strong>{feed?.generatedAt ? `${formatDate(feed.generatedAt)} (Brasília)` : "Pendente"}</strong>. {feed ? `${availableSources} de ${BRASIL_NEWS_SOURCES.length} fontes responderam.` : "Aguardando catálogo."}</p>
        <p>Coleta programada a cada 30 minutos, sujeita a atrasos e falhas dos portais. “Atualizar painel” carrega a última coleta publicada. O painel verifica novas publicações a cada cinco minutos enquanto esta tela está aberta.</p>
        <p>{feed?.coverage || "Os feeds têm alcance limitado. Não há garantia de reunir todos os atos nem de reconstruir o histórico completo desde o início do recorte."}</p>
        <details>
          <summary>Ver procedência e estado de cada fonte</summary>
          <ul className="brasil-news-sources">
            {BRASIL_NEWS_SOURCES.map((source) => {
              const status = feed?.sources.find((item) => item.id === source.id);
              return <li key={source.id}>
                <div><a href={source.feedUrl} target="_blank" rel="noopener noreferrer">{source.label} <ExternalLink size={13} aria-hidden="true" /></a> <span className="brasil-news-source-type">{ORIGIN_LABELS[source.type]}</span></div>
                <p>{!status ? "Aguardando coleta" : status.state === "ok" ? `${status.count} notícia(s) no recorte desta coleta` : `Falha: ${status.detail}`} · Último sucesso: {formatDate(status?.lastSuccessAt)}</p>
              </li>;
            })}
          </ul>
        </details>
        <p>Para conferir o texto e a vigência: <a href="https://www.in.gov.br/consulta" target="_blank" rel="noopener noreferrer">Diário Oficial da União</a> e <a href="https://www.planalto.gov.br/ccivil_03/" target="_blank" rel="noopener noreferrer">Legislação do Planalto</a>.</p>
      </section>
    </div>
  );
}
