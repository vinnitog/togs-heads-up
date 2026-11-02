import { useEffect, useMemo, useRef, useState } from "react";
import { ExternalLink } from "lucide-react";
import { GLOSSARY_CATEGORIES, GLOSSARY_ENTRIES, GLOSSARY_SOURCES, filterGlossaryEntries } from "../data/glossary.js";
import "./glossary.css";

export default function GlossaryScreen() {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("todas");
  const [pageSize, setPageSize] = useState(10);
  const [page, setPage] = useState(1);
  const resultsRef = useRef(null);
  const focusResultsAfterNavigation = useRef(false);
  const entries = useMemo(() => filterGlossaryEntries(GLOSSARY_ENTRIES, { query, category }), [query, category]);
  const totalPages = Math.max(1, Math.ceil(entries.length / pageSize));
  const currentPage = Math.min(Math.max(1, page), totalPages);
  const startIndex = (currentPage - 1) * pageSize;
  const visibleEntries = entries.slice(startIndex, startIndex + pageSize);
  const visibleRange = entries.length > 0
    ? `Mostrando ${startIndex + 1}–${startIndex + visibleEntries.length} de ${entries.length} termos`
    : "Mostrando 0 de 0 termos";

  // [UI] Após trocar a página, retome a leitura no início dos novos resultados.
  useEffect(() => {
    if (!focusResultsAfterNavigation.current) return;
    focusResultsAfterNavigation.current = false;
    resultsRef.current?.focus();
    resultsRef.current?.scrollIntoView?.({ block: "start" });
  }, [page]);

  function navigateToPage(nextPage) {
    focusResultsAfterNavigation.current = true;
    setPage(nextPage);
  }

  function clearFilters() {
    setQuery("");
    setCategory("todas");
    setPage(1);
  }

  return <div className="glossary-screen">
    <header className="screen-heading">
      <div>
        <h2>Glossário</h2>
        <p className="glossary-intro">Entenda as siglas, os símbolos e as unidades do painel.</p>
      </div>
    </header>
    <p className="glossary-context">Consulte os termos dos painéis e das notícias conhecidas. Algumas siglas têm mais de um significado; a frase e o assunto ajudam a identificar o sentido. Novas notícias podem trazer termos ainda não incluídos.</p>
    <section className="data-section" aria-label="Consultar o glossário">
      <div className="glossary-filters">
        <label>Buscar sigla ou significado
          <input type="search" value={query} maxLength={200} placeholder="Ex.: PEC, qualidade do ar, NASA" onChange={(event) => {
            setQuery(event.target.value);
            setPage(1);
          }} />
        </label>
        <label>Categoria
          <select value={category} onChange={(event) => {
            setCategory(event.target.value);
            setPage(1);
          }}>
            <option value="todas">Todas as categorias</option>
            {Object.entries(GLOSSARY_CATEGORIES).map(([id, label]) => <option value={id} key={id}>{label}</option>)}
          </select>
        </label>
        <button className="glossary-clear" type="button" onClick={clearFilters}>Limpar filtros</button>
      </div>
      <p className="glossary-count" ref={resultsRef} tabIndex={-1} role="status" aria-live="polite">{visibleRange} · {GLOSSARY_ENTRIES.length} no catálogo · {query.trim() ? "sigla exata primeiro; demais em ordem alfabética" : "ordem alfabética"}</p>
      {entries.length === 0 ? <p className="empty-state">Nenhum termo corresponde aos filtros. Tente outra palavra ou limpe os filtros.</p> : <dl className="glossary-list">
        {visibleEntries.map((entry) => {
          const source = GLOSSARY_SOURCES[entry.sourceId];
          return <div className="glossary-entry" key={entry.id}>
            <dt>{entry.term}<span>{GLOSSARY_CATEGORIES[entry.category]}</span></dt>
            <dd>
              <h3>{entry.name}</h3>
              <p>{entry.description}</p>
              {/* [UI] O aviso de nova aba pertence ao link para ser anunciado com seu destino. */}
              <a href={source.url} target="_blank" rel="noopener noreferrer" aria-label={`Conferir: ${source.label} (abre em nova aba)`}>Conferir: {source.label} <ExternalLink size={14} aria-hidden="true" /></a>
            </dd>
          </div>;
        })}
      </dl>}
      <div className="glossary-pagination">
        <label>Itens por página
          <select value={pageSize} onChange={(event) => {
            setPageSize(Number(event.target.value));
            setPage(1);
          }}>
            {[10, 20, 50].map((size) => <option value={size} key={size}>{size}</option>)}
          </select>
        </label>
        {entries.length > 0 && <nav aria-label="Paginação do glossário">
          <button type="button" disabled={currentPage === 1} onClick={() => navigateToPage(Math.max(1, currentPage - 1))}>Anterior</button>
          <p>Página {currentPage} de {totalPages}</p>
          <button type="button" disabled={currentPage === totalPages} onClick={() => navigateToPage(Math.min(totalPages, currentPage + 1))}>Próxima</button>
        </nav>}
      </div>
    </section>
  </div>;
}
