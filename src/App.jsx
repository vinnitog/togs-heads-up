import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Activity,
  CloudRain,
  CloudSun,
  Database,
  Droplets,
  ExternalLink,
  Flame,
  Gauge,
  Globe2,
  LocateFixed,
  MapPin,
  Menu,
  MoonStar,
  Newspaper,
  RefreshCw,
  Search,
  Sun,
  Thermometer,
  WifiOff,
  Wind,
  X,
  Zap,
} from "lucide-react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  DEFAULT_LOCATION,
  buildLocationLabel,
  fetchEarthSpaceDashboard,
  resolveLocationFromCoords,
  searchLocations,
} from "./services/earthSpaceApi.js";
import { fetchIncidents } from "./services/incidentsApi.js";
import {
  formatTimeInZone,
  getViewState,
  mergeLocalFeedResult,
  summarizeFireballs,
  summarizeHourlyWeather,
} from "./utils/dashboardState.js";
import { formatAge, getIncidentAgeMinutes, sortIncidentsByOccurredAt } from "./utils/incidents.js";
import { assessHourlyWeatherRisk } from "./utils/weatherRisk.js";

const EMPTY_DASHBOARD = {
  weather: null,
  cptec: null,
  fireballs: [],
  sources: [],
  warnings: [],
  fetchedAt: null,
};

const EMPTY_LOCAL_FEED = {
  incidents: [],
  sources: [],
  warnings: [],
  fetchedAt: null,
  usingSessionFallback: false,
};

const VIEW_GROUPS = [
  {
    title: "Terra",
    items: [
      { id: "overview", label: "Resumo", icon: Activity },
      { id: "weather", label: "Open-Meteo", icon: CloudSun },
      { id: "cptec", label: "CPTEC/INPE", icon: CloudRain },
      { id: "local", label: "Notícias locais", icon: Newspaper },
    ],
  },
  {
    title: "Espaço",
    items: [{ id: "fireballs", label: "Bolas de fogo", icon: Flame }],
  },
  {
    title: "Sistema",
    items: [{ id: "sources", label: "Fontes", icon: Database }],
  },
];

const SOURCE_LABELS = {
  online: "Online",
  conectado: "Online",
  erro: "Erro",
  pendente: "Pendente",
  "sem-dados": "Sem dados",
  cache: "Cache",
  indisponivel: "Indisponível",
};

const INCIDENT_TYPE_LABELS = {
  acidente: "Acidente",
  policial: "Policial",
  risco: "Risco",
  rodovia: "Rodovia",
  historico: "Histórico",
};

const SEVERITY_LABELS = {
  alta: "Alta",
  media: "Média",
  baixa: "Baixa",
};

function App() {
  const [activeView, setActiveView] = useState("overview");
  const [location, setLocation] = useState(DEFAULT_LOCATION);
  const [locationQuery, setLocationQuery] = useState("Marília-SP");
  const [locationResults, setLocationResults] = useState([]);
  const [dashboard, setDashboard] = useState(EMPTY_DASHBOARD);
  const [localFeed, setLocalFeed] = useState(EMPTY_LOCAL_FEED);
  const [isLoading, setIsLoading] = useState(true);
  const [isLocalLoading, setIsLocalLoading] = useState(true);
  const [isSearching, setIsSearching] = useState(false);
  const [geoState, setGeoState] = useState("off");
  const [loadError, setLoadError] = useState("");
  const [localError, setLocalError] = useState("");
  const [notice, setNotice] = useState("");
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isOnline, setIsOnline] = useState(() => (typeof navigator === "undefined" ? true : navigator.onLine));
  const requestIdRef = useRef(0);
  const localRequestIdRef = useRef(0);
  const menuToggleRef = useRef(null);

  const loadDashboard = useCallback(
    async ({ signal, showNotice = false, forceRefresh = false } = {}) => {
      const requestId = requestIdRef.current + 1;
      requestIdRef.current = requestId;
      setIsLoading(true);
      setLoadError("");

      try {
        const result = await fetchEarthSpaceDashboard({
          location,
          env: import.meta.env,
          signal,
          forceRefresh,
        });

        if (signal?.aborted || requestId !== requestIdRef.current) return;
        setDashboard(result);
        if (showNotice) setNotice("Dados de clima e espaço atualizados");
      } catch (error) {
        if (error?.name === "AbortError" || requestId !== requestIdRef.current) return;
        setLoadError(error?.message || "Não foi possível consultar as APIs.");
        if (showNotice) setNotice("Falha ao atualizar clima e espaço");
      } finally {
        if (!signal?.aborted && requestId === requestIdRef.current) setIsLoading(false);
      }
    },
    [location],
  );

  const loadLocalFeed = useCallback(async ({ signal, showNotice = false } = {}) => {
    const requestId = localRequestIdRef.current + 1;
    localRequestIdRef.current = requestId;
    setIsLocalLoading(true);
    setLocalError("");

    try {
      const result = await fetchIncidents({ signal });
      if (signal?.aborted || requestId !== localRequestIdRef.current) return;

      const nextFeed = {
        ...result,
        incidents: sortIncidentsByOccurredAt(result.incidents),
      };
      setLocalFeed((previous) => mergeLocalFeedResult(previous, nextFeed));
      if (showNotice) setNotice("Notícias locais atualizadas");
    } catch (error) {
      if (error?.name === "AbortError" || requestId !== localRequestIdRef.current) return;
      setLocalError(error?.message || "Não foi possível consultar as notícias locais.");
      if (showNotice) setNotice("Falha ao atualizar notícias locais");
    } finally {
      if (!signal?.aborted && requestId === localRequestIdRef.current) setIsLocalLoading(false);
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    loadDashboard({ signal: controller.signal });
    return () => controller.abort();
  }, [loadDashboard]);

  useEffect(() => {
    const controller = new AbortController();
    loadLocalFeed({ signal: controller.signal });
    return () => controller.abort();
  }, [loadLocalFeed]);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  useEffect(() => {
    if (!notice) return undefined;
    const timeoutId = window.setTimeout(() => setNotice(""), 2600);
    return () => window.clearTimeout(timeoutId);
  }, [notice]);

  useEffect(() => {
    if (!isMenuOpen) return undefined;

    const closeOnEscape = (event) => {
      if (event.key !== "Escape") return;

      setIsMenuOpen(false);
      // [UI] Devolve o contexto ao acionador quando o menu recolhivel fecha pelo teclado.
      window.requestAnimationFrame(() => menuToggleRef.current?.focus());
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [isMenuOpen]);

  const currentView = useMemo(
    () => VIEW_GROUPS.flatMap((group) => group.items).find((item) => item.id === activeView),
    [activeView],
  );

  async function handleLocationSubmit(event) {
    event.preventDefault();
    const query = locationQuery.trim();
    if (!query) return;

    setIsSearching(true);
    setLoadError("");

    try {
      const results = await searchLocations(query);
      if (results.length === 0) {
        setLocationResults([]);
        setNotice("Nenhum local encontrado");
        return;
      }

      setLocationResults(results);
      if (results.length === 1) {
        selectLocation(results[0]);
      } else {
        setNotice("Escolha uma das opções encontradas.");
      }
    } catch (error) {
      setLoadError(error?.message || "Falha ao buscar local.");
    } finally {
      setIsSearching(false);
    }
  }

  function selectLocation(nextLocation) {
    setLocation(nextLocation);
    setLocationQuery(buildLocationLabel(nextLocation));
    setLocationResults([]);
    setGeoState("off");
    setNotice(`Local: ${buildLocationLabel(nextLocation)}`);
  }

  function resetLocation() {
    setLocation(DEFAULT_LOCATION);
    setLocationQuery("Marília-SP");
    setLocationResults([]);
    setNotice("Local: Marília-SP");
  }

  function readCurrentPosition() {
    return new Promise((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(resolve, reject, {
        timeout: 10000,
        maximumAge: 5 * 60 * 1000,
      });
    });
  }

  async function toggleGeolocation() {
    if (geoState === "on") {
      setGeoState("off");
      resetLocation();
      return;
    }

    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setNotice("Geolocalização não suportada neste navegador.");
      return;
    }

    setGeoState("loading");

    try {
      const position = await readCurrentPosition();
      const nextLocation = await resolveLocationFromCoords({
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
      });

      setLocation(nextLocation);
      setLocationQuery(buildLocationLabel(nextLocation));
      setLocationResults([]);
      setGeoState("on");
      setNotice(`Local: ${buildLocationLabel(nextLocation)}`);
    } catch (error) {
      setGeoState("off");
      setNotice(describeGeolocationError(error));
    }
  }

  function refreshAll() {
    loadDashboard({ showNotice: true, forceRefresh: true });
    loadLocalFeed({ showNotice: true });
  }

  function selectView(viewId) {
    setActiveView(viewId);
    setIsMenuOpen(false);

    // [UI] No menu recolhivel, evita manter o foco em um item que acabou oculto.
    if (window.matchMedia("(max-width: 1080px)").matches) {
      window.requestAnimationFrame(() => menuToggleRef.current?.focus());
    }
  }

  return (
    <div className="app-shell">
      <a className="skip-link" href="#dashboard-content">
        Ir para o conteúdo
      </a>
      <header className="topbar">
        <div className="topbar-copy">
          <h1>Togs Heads Up</h1>
          <p>Clima, alertas de Marília-SP e registros espaciais públicos em uma leitura rápida.</p>
        </div>

        <div className="topbar-actions">
          {!isOnline && (
            <span className="connection-pill offline">
              <WifiOff size={16} />
              Offline
            </span>
          )}

          <button
            className={`ghost-button ${geoState === "on" ? "active" : ""}`}
            type="button"
            onClick={toggleGeolocation}
            disabled={geoState === "loading"}
            aria-pressed={geoState === "on"}
            title={
              geoState === "on"
                ? "Desativar e voltar para Marília-SP"
                : "Usar a localização do navegador"
            }
          >
            <LocateFixed size={16} />
            {geoState === "loading" ? "Localizando" : "Localização"}
          </button>

          <button className="icon-button" type="button" onClick={refreshAll} aria-label="Atualizar painel">
            <RefreshCw size={18} className={isLoading || isLocalLoading ? "spin" : ""} />
          </button>
          <p className="location-privacy">
            Localização é opcional. Ao ativar, as coordenadas são consultadas no Open-Meteo e BigDataCloud, sem cadastro.
          </p>
        </div>
      </header>

      <main className="workspace">
        <button
          ref={menuToggleRef}
          className={`menu-toggle ${isMenuOpen ? "open" : ""}`}
          type="button"
          aria-controls="dashboard-menu"
          aria-expanded={isMenuOpen}
          onClick={() => setIsMenuOpen((open) => !open)}
        >
          {isMenuOpen ? <X size={20} /> : <Menu size={20} />}
          <span>{isMenuOpen ? "Fechar menu" : `Menu: ${currentView?.label ?? "Resumo"}`}</span>
        </button>

        {/* [UI] Navegacao nomeada melhora a identificacao do menu por tecnologias assistivas. */}
        <nav
          id="dashboard-menu"
          className={`api-menu ${isMenuOpen ? "open" : ""}`}
          aria-label="Navegação principal do painel"
        >
          {VIEW_GROUPS.map((group) => (
            <div className="menu-group" key={group.title}>
              <span>{group.title}</span>
              {group.items.map((item) => {
                const Icon = item.icon;
                return (
                  <button
                    type="button"
                    key={item.id}
                    className={activeView === item.id ? "active" : ""}
                    onClick={() => selectView(item.id)}
                    aria-current={activeView === item.id ? "page" : undefined}
                  >
                    <Icon size={17} />
                    {item.label}
                  </button>
                );
              })}
            </div>
          ))}
        </nav>

        <section className="screen-shell" id="dashboard-content" tabIndex="-1">
          <ScreenHeading
            view={currentView}
            activeView={activeView}
            dashboard={dashboard}
            localFeed={localFeed}
            location={location}
          />
          <ScreenAlert state={getViewState(activeView, { dashboard, localFeed, loadError, localError, isLoading, isLocalLoading })} />
          {activeView === "overview" && <OverviewScreen dashboard={dashboard} localFeed={localFeed} />}
          {activeView === "weather" && (
            <WeatherScreen
              weather={dashboard.weather}
              location={location}
              search={{
                query: locationQuery,
                results: locationResults,
                isSearching,
                onQueryChange: setLocationQuery,
                onSubmit: handleLocationSubmit,
                onSelect: selectLocation,
              }}
            />
          )}
          {activeView === "cptec" && <CptecScreen cptec={dashboard.cptec} location={location} />}
          {activeView === "local" && <LocalNewsScreen localFeed={localFeed} isLoading={isLocalLoading} />}
          {activeView === "fireballs" && <FireballScreen fireballs={dashboard.fireballs} />}
          {activeView === "sources" && <SourcesScreen dashboard={dashboard} localFeed={localFeed} />}
        </section>
      </main>

      {notice && <div className="toast" role="status" aria-live="polite">{notice}</div>}
    </div>
  );
}

function ScreenHeading({ view, activeView, dashboard, localFeed, location }) {
  const updatedAt = getViewUpdatedAt(activeView, dashboard, localFeed);
  const selectedTimeZone = location.timezone === "auto" ? dashboard.weather?.timezone : location.timezone;
  const timeZone = activeView === "weather" || activeView === "cptec" ? selectedTimeZone : "America/Sao_Paulo";

  return (
    <header className="screen-heading">
      <div>
        <h2>{getScreenTitle(view?.id)}</h2>
        <p className="screen-kicker">{view?.label ?? "Painel"}</p>
      </div>
      <div className="screen-meta">
        <Globe2 size={16} />
        <span>Atualizado {updatedAt ? formatTimeInZone(updatedAt, timeZone) : "pendente"}</span>
      </div>
    </header>
  );
}

function ScreenAlert({ state }) {
  if (!state) return null;

  return (
    <div className={`screen-alert ${state.tone}`} role={state.tone === "error" ? "alert" : "status"} aria-live="polite">
      <RefreshCw size={16} className={state.tone === "loading" ? "spin" : ""} />
      <span>{state.message}</span>
    </div>
  );
}

function OverviewScreen({ dashboard, localFeed }) {
  const current = dashboard.weather?.current;
  const today = dashboard.weather?.daily?.[0];
  const latestLocal = localFeed.incidents[0];

  return (
    <div className="screen-grid overview-grid">
      <section className="data-section">
        <h3>Leitura rápida</h3>
        <div className="summary-list">
          <SummaryLine icon={Thermometer} label="Open-Meteo" value={formatValue(current?.temperature, " °C")} detail={current?.condition} />
          <SummaryLine icon={CloudRain} label="Chuva hoje" value={formatValue(today?.rainProbability, "%")} detail={`${formatValue(today?.precipitation, " mm")} previstos`} />
          <SummaryLine icon={Newspaper} label="Notícias locais" value={formatInteger(localFeed.incidents.length)} detail={latestLocal?.title ?? "Sem item local no filtro atual"} />
          <SummaryLine icon={Flame} label="Bolas de fogo" value={formatInteger(dashboard.fireballs.length)} detail="Registros recentes CNEOS" />
        </div>
      </section>
    </div>
  );
}

function SummaryLine({ icon: Icon, label, value, detail }) {
  return (
    <div className="summary-line">
      <Icon size={18} />
      <span>{label}</span>
      <strong>{value}</strong>
      <small>{detail || "--"}</small>
    </div>
  );
}

function LocationBar({ search }) {
  return (
    <form className="location-bar" onSubmit={search.onSubmit}>
      <div className="location-search">
        <Search size={18} />
        <input
          value={search.query}
          onChange={(event) => search.onQueryChange(event.target.value)}
          placeholder="Buscar cidade ou local"
          aria-label="Buscar cidade ou local"
        />
      </div>

      <button className="search-button" type="submit" disabled={search.isSearching}>
        {search.isSearching ? "Buscando" : "Buscar"}
      </button>

      {search.results.length > 1 && (
        <div className="location-results" aria-label="Resultados de localização">
          {search.results.slice(0, 5).map((result) => (
            <button type="button" key={result.id} onClick={() => search.onSelect(result)}>
              <MapPin size={14} />
              {buildLocationLabel(result)}
            </button>
          ))}
        </div>
      )}
    </form>
  );
}

function WeatherScreen({ weather, location, search }) {
  const current = weather?.current;
  const data = weather?.hourly ?? [];
  const risk = assessHourlyWeatherRisk(data);

  if (!current) {
    return (
      <>
        <LocationBar search={search} />
        <EmptyState text="Open-Meteo ainda não retornou dados para este local." />
      </>
    );
  }

  return (
    <>
      <LocationBar search={search} />
      <div className="screen-grid">
        <WeatherRiskPanel risk={risk} />

        <section className="data-section weather-focus">
          <div className="weather-current">
            <div className="weather-symbol">{current.isDay ? <Sun size={42} /> : <MoonStar size={42} />}</div>
            <div>
              <span>{buildLocationLabel(location)}</span>
              <strong>{formatValue(current.temperature, " °C")}</strong>
              <small>{current.condition}</small>
            </div>
          </div>

          <div className="data-table compact">
            <InfoRow icon={Thermometer} label="Sensação" value={formatValue(current.apparentTemperature, " °C")} />
            <InfoRow icon={Droplets} label="Umidade" value={formatValue(current.humidity, "%")} />
            <InfoRow icon={Wind} label="Vento" value={formatValue(current.windSpeed, " km/h")} />
            <InfoRow icon={Zap} label="Rajadas" value={formatValue(current.windGusts, " km/h")} />
            <InfoRow icon={Gauge} label="Pressão" value={formatValue(current.pressure, " hPa")} />
            <InfoRow icon={CloudRain} label="Precipitação agora" value={formatValue(current.precipitation, " mm")} />
          </div>
        </section>

        <section className="data-section chart-section">
          <h3>Próximas 24h</h3>
          {data.length > 0 ? (
            <>
              <p className="chart-summary">{summarizeHourlyWeather(data)}</p>
              <div className="chart-visual" aria-hidden="true">
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={data}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#d7dee8" />
                    <XAxis dataKey="hour" tickLine={false} axisLine={false} fontSize={12} />
                    <YAxis yAxisId="left" tickLine={false} axisLine={false} fontSize={12} width={32} />
                    <YAxis yAxisId="right" orientation="right" tickLine={false} axisLine={false} fontSize={12} width={32} />
                    <Tooltip />
                    <Area yAxisId="left" type="monotone" dataKey="temperature" name="Temperatura °C" stroke="#0f766e" fill="#ccfbf1" strokeWidth={2} />
                    <Area yAxisId="right" type="monotone" dataKey="rainProbability" name="Chuva %" stroke="#2563eb" fill="#dbeafe" strokeWidth={2} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </>
          ) : (
            <EmptyState text="Gráfico aguardando dados horários." compact />
          )}
        </section>
      </div>
    </>
  );
}

function WeatherRiskPanel({ risk }) {
  const levelLabel = {
    alto: "Alto",
    moderado: "Moderado",
    baixo: "Baixo",
    indisponivel: "Indisponível",
  }[risk.level];

  const metrics = [
    ["Probabilidade máx. de chuva", formatValue(risk.maxRainProbability, "%")],
    ["Precipitação acumulada", formatValue(risk.totalPrecipitation, " mm")],
    ["Pico de precipitação", formatValue(risk.maxHourlyPrecipitation, " mm/h")],
    ["Rajada máxima", formatValue(risk.maxGusts, " km/h")],
    ["CAPE máximo", formatValue(risk.maxCape, " J/kg")],
    ["Visibilidade mínima", formatValue(risk.minVisibilityKm, " km")],
  ];

  return (
    <section className="data-section weather-risk-section" aria-labelledby="weather-risk-title">
      <div className="risk-heading">
        <div>
          <h3 id="weather-risk-title">Estimativa de risco nas próximas 24h</h3>
          <p>{risk.summary}</p>
        </div>
        <span className={`risk-badge ${risk.level}`}>Risco {levelLabel}</span>
      </div>

      <p className="risk-source-note">
        Estimativa por modelo Open-Meteo; não substitui aviso oficial do INMET.
      </p>

      <dl className="risk-metrics">
        {metrics.map(([label, value]) => (
          <div key={label}>
            <dt>{label}</dt>
            <dd>{value}</dd>
          </div>
        ))}
      </dl>

      {risk.reasons.length > 0 ? (
        <ul className="risk-reasons">
          {risk.reasons.map((reason) => <li key={reason}>{reason}</li>)}
        </ul>
      ) : (
        <p className="risk-reasons-empty">
          {risk.level === "indisponivel"
            ? "Aguardando dados horários suficientes para avaliar os sinais meteorológicos."
            : "Nenhum sinal de atenção adicional foi identificado nos dados disponíveis."}
        </p>
      )}
    </section>
  );
}

function InfoRow({ icon: Icon, label, value }) {
  return (
    <div className="info-row">
      <Icon size={16} />
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function CptecScreen({ cptec, location }) {
  if (!cptec) {
    return <EmptyState text={`CPTEC/INPE não retornou previsão para ${buildLocationLabel(location)}.`} />;
  }

  return (
    <section className="data-section">
      <div className="section-title">
        <div>
          <h3>{cptec.city ? `${cptec.city}-${cptec.uf}` : "Previsão nacional"}</h3>
          <p className="source-provenance">Previsão complementar do CPTEC/INPE distribuída pela BrasilAPI.</p>
        </div>
        <span>Atualização {cptec.updatedAt || "pendente"}</span>
      </div>
      <div className="data-table">
        {(cptec.days ?? []).map((day) => (
          <div className="data-row" key={day.date}>
            <span>{formatShortDate(day.date)}</span>
            <strong>{day.condition}</strong>
            <small>
              {formatValue(day.min, " °C")} / {formatValue(day.max, " °C")} | UV {formatValue(day.uv)}
            </small>
          </div>
        ))}
      </div>
    </section>
  );
}

function LocalNewsScreen({ localFeed, isLoading }) {
  const incidents = localFeed.incidents ?? [];

  return (
    <section className="data-section">
      <div className="section-title">
        <h3>Notícias e alertas recentes</h3>
        <span>{isLoading ? "Atualizando..." : `${incidents.length} item(ns) filtrado(s)`}</span>
      </div>

      {incidents.length === 0 ? (
        <EmptyState
          text={isLoading
            ? "Consultando fontes locais..."
            : "As fontes locais responderam sem notícias/alertas filtrados para Marília-SP."}
        />
      ) : (
        <div className="news-list">
          {incidents.map((incident) => (
            <article className="news-row" key={incident.id}>
              <span className={`severity-dot ${incident.severity}`} aria-hidden="true" />
              <div className="news-body">
                <strong>{incident.title}</strong>
                <small>
                  {incident.source} | {INCIDENT_TYPE_LABELS[incident.type] ?? "Local"} | Severidade {SEVERITY_LABELS[incident.severity] ?? "não informada"} | {incident.neighborhood} |{" "}
                  {formatAge(getIncidentAgeMinutes(incident))}
                </small>
                {incident.detail && <p>{incident.detail}</p>}
              </div>
              {incident.url && (
                <a href={incident.url} target="_blank" rel="noreferrer" aria-label="Abrir noticia">
                  <ExternalLink size={16} />
                </a>
              )}
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

function FireballScreen({ fireballs }) {
  const chartData = fireballs.slice(0, 6).map((item, index) => ({
    name: `${index + 1}`,
    energia: item.impactEnergyKt ?? 0,
  }));

  return (
    <div className="screen-grid">
      <section className="data-section chart-section">
        <h3>Energia de impacto estimada</h3>
        {fireballs.length > 0 ? (
          <>
            <p className="chart-summary">{summarizeFireballs(fireballs)}</p>
            <div className="chart-visual" aria-hidden="true">
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#d7dee8" />
                  <XAxis dataKey="name" tickLine={false} axisLine={false} fontSize={12} />
                  <YAxis tickLine={false} axisLine={false} fontSize={12} width={34} />
                  <Tooltip />
                  <Bar dataKey="energia" name="Impacto kt" fill="#d97706" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </>
        ) : (
          <EmptyState text="API de bolas de fogo sem registros recentes no recorte atual." compact />
        )}
      </section>

      <section className="data-section">
        <h3>Registros recentes</h3>
        <div className="data-table">
          {fireballs.map((item) => (
            <div className="data-row" key={`${item.date}-${item.latitude}-${item.longitude}`}>
              <span>{formatDateTime(item.date)}</span>
              <strong>{formatCoordinates(item)}</strong>
              <small>
                {formatValue(item.impactEnergyKt, " kt")} | {formatValue(item.altitudeKm, " km alt.")}
              </small>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

function SourcesScreen({ dashboard, localFeed }) {
  return (
    <div className="screen-grid">
      <SourceGroup title="Clima, previsão e espaço" sources={dashboard.sources} />
      <SourceGroup title="Fontes regionais" sources={localFeed.sources} local />
    </div>
  );
}

function SourceGroup({ title, sources, local = false }) {
  return (
    <section className="data-section">
      <h3>{title}</h3>
      {sources.length === 0 ? (
        <EmptyState text="Estado das fontes ainda não disponível." compact />
      ) : (
        <div className="source-list">
          {sources.map((source) => (
          <article className="source-row" key={source.id}>
            <div>
              <strong>{source.label ?? source.name}</strong>
              <small>{source.detail}</small>
            </div>
            <span className={`source-status ${source.state ?? source.status}`}>
              {SOURCE_LABELS[source.state ?? source.status] ?? (local ? source.cadence : "Fonte")}
            </span>
          </article>
          ))}
        </div>
      )}
    </section>
  );
}

function EmptyState({ text, compact = false }) {
  return <div className={`empty-state ${compact ? "compact" : ""}`}>{text}</div>;
}

// Codigos de GeolocationPositionError: 1 negado, 2 indisponivel, 3 tempo limite.
function describeGeolocationError(error) {
  if (error?.code === 1) return "Permissão de localização negada pelo navegador.";
  if (error?.code === 2) return "Não foi possível obter sua localização agora.";
  if (error?.code === 3) return "Tempo limite ao obter sua localização.";
  return error?.message || "Falha ao usar sua localização.";
}

function getScreenTitle(id) {
  const titles = {
    overview: "Visão geral",
    weather: "Clima atual e próximas 24h",
    cptec: "Previsão nacional brasileira",
    local: "Notícias e alertas regionais",
    fireballs: "Meteoros e bolas de fogo",
    sources: "Estado das integrações",
  };
  return titles[id] ?? "Painel";
}

function getViewUpdatedAt(activeView, dashboard, localFeed) {
  if (activeView === "local") return localFeed.fetchedAt;
  if (activeView === "overview" || activeView === "sources") {
    return [dashboard.fetchedAt, localFeed.fetchedAt].filter(Boolean).sort().slice(-1)[0] ?? null;
  }
  return dashboard.fetchedAt;
}

function formatValue(value, suffix = "") {
  const number = Number(value);
  if (!Number.isFinite(number)) return "--";
  return `${number.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}${suffix}`;
}

function formatInteger(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return "--";
  return number.toLocaleString("pt-BR", { maximumFractionDigits: 0 });
}

function formatShortDate(value) {
  if (!value) return "";
  const date = new Date(value.includes("T") ? value : `${value}T12:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
}

function formatDateTime(value) {
  if (!value) return "--";
  const date = new Date(value.replace(" ", "T"));
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatCoordinates(item) {
  if (!Number.isFinite(item.latitude) || !Number.isFinite(item.longitude)) return "Local não informado";
  return `${Math.abs(item.latitude).toFixed(1)}${item.latitude < 0 ? "S" : "N"}, ${Math.abs(item.longitude).toFixed(1)}${
    item.longitude < 0 ? "W" : "E"
  }`;
}

export default App;
