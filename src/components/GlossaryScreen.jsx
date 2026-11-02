import { useMemo, useState } from "react";
import { ExternalLink } from "lucide-react";
import { GLOSSARY_CATEGORIES, GLOSSARY_ENTRIES, GLOSSARY_SOURCES, filterGlossaryEntries } from "../data/glossary.js";
import "./glossary.css";

export default function GlossaryScreen() {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("todas");
  const entries = useMemo(() => filterGlossaryEntries(GLOSSARY_ENTRIES, { query, category }), [query, category]);

  function clearFilters() {
    setQuery("");
    setCategory("todas");
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
          <input type="search" value={query} maxLength={200} placeholder="Ex.: PEC, qualidade do ar, NASA" onChange={(event) => setQuery(event.target.value)} />
        </label>
        <label>Categoria
          <select value={category} onChange={(event) => setCategory(event.target.value)}>
            <option value="todas">Todas as categorias</option>
            {Object.entries(GLOSSARY_CATEGORIES).map(([id, label]) => <option value={id} key={id}>{label}</option>)}
          </select>
        </label>
        <button className="glossary-clear" type="button" onClick={clearFilters}>Limpar filtros</button>
      </div>
      <p className="glossary-count" role="status" aria-live="polite">{entries.length} de {GLOSSARY_ENTRIES.length} termos · {query.trim() ? "sigla exata primeiro; demais em ordem alfabética" : "ordem alfabética"}</p>
      {entries.length === 0 ? <p className="empty-state">Nenhum termo corresponde aos filtros. Tente outra palavra ou limpe os filtros.</p> : <dl className="glossary-list">
        {entries.map((entry) => {
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
    </section>
  </div>;
}
