import { useEffect, useRef, useState } from "react";
import { CloudSun, MapPin, RefreshCw, Search } from "lucide-react";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { buildLocationLabel } from "../services/earthSpaceApi.js";
import { buildOpenWeatherTileUrl, OPEN_WEATHER_MAP_LAYERS, searchOpenWeatherLocations } from "../services/openWeatherApi.js";
import { AIR_QUALITY_LABELS, POLLUTANTS, formatOpenWeatherTime as time, formatOpenWeatherValue as value } from "../utils/openWeatherDisplay.js";
import "./openWeather.css";

export default function OpenWeatherScreen({ apiKey, location, onLocationChange, data, loading, error, onRefresh }) {
  const [tab, setTab] = useState("current");
  const current = data?.current;
  const offset = data?.timezoneOffset;
  return (
    <div className="ow-screen">
      <div className="ow-heading">
        <h3><MapPin size={18} /> {buildLocationLabel(location)}</h3>
        <button className="icon-button" type="button" title="Atualizar OpenWeather" aria-label="Atualizar OpenWeather" disabled={!apiKey || loading} onClick={onRefresh}><RefreshCw size={18} className={loading ? "spin" : ""} /></button>
      </div>
      {apiKey && <LocationSearch key={apiKey} apiKey={apiKey} onSelect={onLocationChange} />}
      <div role="status" aria-live="polite" className="ow-caption">
        {!apiKey ? "OpenWeather temporariamente indisponível nesta versão." : loading ? "Consultando OpenWeather…" : error || (data?.fetchedAt ? `Consulta: ${new Date(data.fetchedAt).toLocaleString("pt-BR")}` : "Aguardando dados.")}
      </div>
      {apiKey && <>
        <div className="ow-tabs" role="group" aria-label="Dados OpenWeather">
          {[["current", "Agora"], ["forecast", "Previsão · 5 dias"], ["air", "Qualidade do ar"], ["maps", "Mapas"]].map(([id, label]) => <button key={id} type="button" aria-pressed={tab === id} onClick={() => setTab(id)}>{label}</button>)}
        </div>
        {tab === "current" && <section className="ow-section" aria-label="Condições atuais">
          <div className="ow-condition"><CloudSun size={30} /><h3>{current?.description || "Condições atuais indisponíveis"}</h3><strong>{value(current?.temp, " °C")}</strong></div>
          <dl className="ow-metrics">
            {[["Sensação térmica", current?.feelsLike, " °C"], ["Mínima observada", current?.tempMin, " °C"], ["Máxima observada", current?.tempMax, " °C"], ["Umidade", current?.humidity, "%"], ["Pressão", current?.pressure, " hPa"], ["Pressão ao nível do mar", current?.seaLevel, " hPa"], ["Pressão no solo", current?.groundLevel, " hPa"], ["Visibilidade", current?.visibility, " m"], ["Nuvens", current?.clouds, "%"], ["Vento", current?.windSpeed, " km/h"], ["Rajadas", current?.windGust, " km/h"], ["Direção do vento", current?.windDirection, "°"], ["Chuva na última hora", current?.rain1h, " mm"], ["Neve na última hora", current?.snow1h, " mm"]].map(([label, metric, unit]) => <div key={label}><dt>{label}</dt><dd>{value(metric, unit)}</dd></div>)}
            <div><dt>Nascer do sol</dt><dd>{time(current?.sunrise, offset)}</dd></div><div><dt>Pôr do sol</dt><dd>{time(current?.sunset, offset)}</dd></div>
          </dl>
          <p className="ow-caption">Observação: {time(current?.time, offset, true)} · {Number.isFinite(offset) ? "horário do local" : "UTC"}</p>
        </section>}
        {tab === "forecast" && <section className="ow-section"><h3>Previsão a cada 3 horas</h3><Forecast data={data?.forecast ?? []} offset={offset} /></section>}
        {tab === "air" && <AirQuality data={data} offset={offset} />}
        {tab === "maps" && <WeatherMap key={`${location.latitude}:${location.longitude}:${apiKey}`} apiKey={apiKey} location={location} />}
        <details className="ow-sources"><summary>Estado das consultas</summary><ul>{data?.sources?.map((source) => <li key={source.id}><strong>{source.label}</strong>: {source.detail || source.state}</li>)}</ul></details>
      </>}
      <p className="ow-caption">Fonte: <a href="https://openweathermap.org/" target="_blank" rel="noreferrer">OpenWeather</a>. Valores ausentes: --.</p>
    </div>
  );
}

function LocationSearch({ apiKey, onSelect }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const request = useRef(null);
  useEffect(() => () => request.current?.abort(), [apiKey]);
  async function search(event) {
    event.preventDefault();
    request.current?.abort();
    const controller = new AbortController();
    request.current = controller;
    setBusy(true); setError(""); setResults([]);
    try {
      const matches = await searchOpenWeatherLocations(query, { apiKey, signal: controller.signal });
      if (controller.signal.aborted) return;
      setResults(matches);
      if (!matches.length) setError("Nenhum local encontrado.");
    } catch (failure) { if (!controller.signal.aborted) setError(failure.message); }
    finally { if (!controller.signal.aborted) setBusy(false); }
  }
  return <form className="ow-search" onSubmit={search}>
    <div className="ow-controls"><label className="ow-query-label">Cidade ou CEP e país<input aria-label="Buscar local na OpenWeather" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Marília,BR ou 10001,US" required /></label><button className="search-button" type="submit" disabled={busy}><Search size={16} /> {busy ? "Buscando" : "Buscar"}</button></div>
    {error && <p role="status">{error}</p>}
    <div className="ow-results">{results.map((item) => <button className="search-button" key={item.id} type="button" onClick={() => { onSelect(item); setResults([]); setQuery(""); }}><MapPin size={16} />{buildLocationLabel(item)}</button>)}</div>
  </form>;
}

function Forecast({ data, offset }) {
  if (!data.length) return <p className="empty-state">Previsão indisponível para este local.</p>;
  return <>
    <div className="ow-chart"><ResponsiveContainer width="100%" height="100%"><AreaChart data={data}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="time" tickFormatter={(t) => time(t, offset, true)} minTickGap={60} /><YAxis unit="°" width={42} /><Tooltip labelFormatter={(t) => time(t, offset, true)} formatter={(v) => [value(v, " °C"), "Temperatura"]} /><Area type="monotone" dataKey="temp" stroke="#0f766e" fill="#ccfbf1" isAnimationActive={false} /></AreaChart></ResponsiveContainer></div>
    <div className="ow-table-wrap" tabIndex={0} role="region" aria-label="Tabela de previsão a cada 3 horas"><table><caption>{Number.isFinite(offset) ? "Horário local" : "UTC"} · acumulados por intervalo de 3 horas</caption><thead><tr>{["Data / hora", "Condição", "Temp.", "Sensação", "Chuva", "Neve", "Chance", "Umidade", "Vento", "Rajadas", "Direção", "Nuvens", "Visibilidade", "Pressão", "Nível do mar", "Solo"].map((label) => <th key={label} scope="col">{label}</th>)}</tr></thead><tbody>{data.map((row) => <tr key={row.time}><th scope="row">{time(row.time, offset, true)}</th><td>{row.description}</td>{[[row.temp, " °C"], [row.feelsLike, " °C"], [row.rain3h, " mm"], [row.snow3h, " mm"], [row.probability, "%"], [row.humidity, "%"], [row.windSpeed, " km/h"], [row.windGust, " km/h"], [row.windDirection, "°"], [row.clouds, "%"], [row.visibility, " m"], [row.pressure, " hPa"], [row.seaLevel, " hPa"], [row.groundLevel, " hPa"]].map(([metric, unit], i) => <td key={i}>{value(metric, unit)}</td>)}</tr>)}</tbody></table></div>
  </>;
}

function AirQuality({ data, offset }) {
  const [period, setPeriod] = useState("forecast");
  const current = data?.airCurrent?.[0];
  const rows = (period === "forecast" ? data?.airForecast : data?.airHistory) ?? [];
  return <section className="ow-section"><h3>Qualidade do ar</h3>
    <p className={`ow-aqi ow-aqi-${current?.aqi ?? 0}`}>{AIR_QUALITY_LABELS[current?.aqi ?? 0]} · IQA OpenWeather {value(current?.aqi)} / 5</p>
    <p className="ow-caption">Escala OpenWeather: 1 boa, 2 razoável, 3 moderada, 4 ruim, 5 muito ruim. Concentrações em µg/m³. Observação: {time(current?.time, offset, true)} · {Number.isFinite(offset) ? "horário do local" : "UTC"}.</p>
    <dl className="ow-metrics">{POLLUTANTS.map(([id, label]) => <div key={id}><dt>{label}</dt><dd>{value(current?.components?.[id], " µg/m³")}</dd></div>)}</dl>
    <div className="ow-tabs" role="group" aria-label="Período da qualidade do ar"><button type="button" aria-pressed={period === "forecast"} onClick={() => setPeriod("forecast")}>Previsão · até 4 dias</button><button type="button" aria-pressed={period === "history"} onClick={() => setPeriod("history")}>Últimas 24 horas</button></div>
    {!rows.length ? <p className="empty-state">Sem dados neste período.</p> : <div className="ow-table-wrap" tabIndex={0} role="region" aria-label="Série horária de qualidade do ar"><table><caption>Concentrações horárias · µg/m³ · {Number.isFinite(offset) ? "horário do local" : "UTC"}</caption><thead><tr><th scope="col">Data / hora</th><th scope="col">IQA</th>{POLLUTANTS.map(([id, label]) => <th scope="col" key={id}>{label}</th>)}</tr></thead><tbody>{rows.map((row) => <tr key={row.time}><th scope="row">{time(row.time, offset, true)}</th><td>{value(row.aqi)} · {AIR_QUALITY_LABELS[row.aqi] ?? "--"}</td>{POLLUTANTS.map(([id]) => <td key={id}>{value(row.components?.[id])}</td>)}</tr>)}</tbody></table></div>}
  </section>;
}

function WeatherMap({ apiKey, location }) {
  const element = useRef(null);
  const mapRef = useRef(null);
  const [layer, setLayer] = useState("temp_new");
  const [error, setError] = useState("");
  useEffect(() => {
    const map = L.map(element.current, { center: [location.latitude, location.longitude], zoom: 5, minZoom: 2, maxZoom: 10, scrollWheelZoom: false });
    mapRef.current = map;
    L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", { maxZoom: 19, keepBuffer: 0, attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>' }).on("tileerror", () => setError("Mapa de base indisponível. Tente novamente mais tarde.")).addTo(map);
    L.circleMarker([location.latitude, location.longitude], { radius: 6, color: "#101828", fillColor: "#fff", fillOpacity: 1 }).addTo(map);
    const observer = new ResizeObserver(() => map.invalidateSize());
    observer.observe(element.current);
    return () => { observer.disconnect(); map.remove(); mapRef.current = null; };
  }, [location.latitude, location.longitude]);
  useEffect(() => {
    setError("");
    const overlay = L.tileLayer(buildOpenWeatherTileUrl(layer, apiKey), { opacity: 0.8, keepBuffer: 0, updateWhenIdle: true, attribution: '<a href="https://openweathermap.org/">OpenWeather</a>' });
    overlay.on("tileerror", () => setError("Camada meteorológica indisponível. Tente novamente mais tarde."));
    overlay.addTo(mapRef.current);
    return () => { overlay.off(); overlay.remove(); };
  }, [layer, apiKey]);
  return <section className="ow-section"><div className="ow-controls"><label>Camada<select value={layer} onChange={(event) => setLayer(event.target.value)}>{OPEN_WEATHER_MAP_LAYERS.map((entry) => <option key={entry.id} value={entry.id}>{entry.label} ({entry.unit})</option>)}</select></label><button type="button" className="icon-button" title="Centralizar no local" aria-label="Centralizar mapa no local" onClick={() => mapRef.current?.setView([location.latitude, location.longitude], 5)}><MapPin size={18} /></button></div>
    {error && <p role="status">{error}</p>}<div className="ow-map" ref={element} role="region" aria-label={`Mapa meteorológico de ${location.name}`} />
    <p className="ow-caption">Condições atuais · base OpenStreetMap. <a href="https://openweathermap.org/api/weathermaps" target="_blank" rel="noreferrer">Escalas das camadas</a></p>
  </section>;
}
