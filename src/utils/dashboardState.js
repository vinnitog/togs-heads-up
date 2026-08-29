const SESSION_FALLBACK_WARNING = "Fontes indisponíveis; exibindo os últimos dados desta sessão.";
const DASHBOARD_VIEW_SOURCE = {
  weather: "weather",
  cptec: "cptec",
  fireballs: "fireballs",
};

export function mergeLocalFeedResult(previous, next) {
  const totalFailure = next.sources.length > 0 && next.sources.every((source) => source.status === "erro");
  const hasPreviousNews = previous.incidents.length > 0;

  if (!totalFailure || !hasPreviousNews) {
    return { ...next, usingSessionFallback: false };
  }

  return {
    ...next,
    incidents: previous.incidents,
    fetchedAt: previous.fetchedAt,
    usingSessionFallback: true,
    warnings: [...new Set([...next.warnings, SESSION_FALLBACK_WARNING])],
  };
}

export function getViewState(activeView, ctx) {
  const { dashboard, localFeed, loadError, localError, isLoading, isLocalLoading } = ctx;

  if (activeView === "local") {
    if (isLocalLoading) return { tone: "loading", message: "Atualizando notícias locais..." };
    if (localError) return { tone: "error", message: localError };
    if (localFeed.warnings.length > 0) {
      return { tone: "warning", message: localFeed.warnings.slice(0, 2).join(" | ") };
    }
    return null;
  }

  if (activeView === "overview" || activeView === "sources") {
    if (isLoading || isLocalLoading) {
      return {
        tone: "loading",
        message: activeView === "sources" ? "Atualizando estado das fontes..." : "Atualizando painel...",
      };
    }

    const errors = [loadError, localError].filter(Boolean);
    if (errors.length > 0) {
      return { tone: errors.length === 2 ? "error" : "warning", message: errors.join(" | ") };
    }

    const warnings = [...dashboard.warnings, ...localFeed.warnings];
    if (localFeed.usingSessionFallback) {
      const fallbackWarning = localFeed.warnings.find((warning) => warning === SESSION_FALLBACK_WARNING);
      if (fallbackWarning) warnings.unshift(...warnings.splice(warnings.indexOf(fallbackWarning), 1));
    }
    return warnings.length > 0 ? { tone: "warning", message: warnings.slice(0, 2).join(" | ") } : null;
  }

  const sourceKey = DASHBOARD_VIEW_SOURCE[activeView];
  if (!sourceKey) return null;
  if (isLoading) return { tone: "loading", message: "Consultando fonte..." };
  if (loadError) return { tone: "error", message: loadError };

  const source = dashboard.sources.find((item) => item.id === sourceKey);
  if (source?.state === "erro") {
    return { tone: "error", message: source.detail || `${source.label}: falha ao consultar` };
  }
  if (source?.state === "cache") {
    return { tone: "warning", message: source.detail || `${source.label}: exibindo dados em cache` };
  }
  if (source?.state === "indisponivel") {
    return { tone: "warning", message: source.detail || `${source.label}: indisponível no navegador` };
  }
  if (source?.state === "sem-dados") {
    return { tone: "warning", message: source.detail || `${source.label}: sem dados no recorte atual` };
  }
  return null;
}

export function formatTimeInZone(value, timeZone = "America/Sao_Paulo") {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "pendente";

  const options = {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  };

  if (timeZone && timeZone !== "auto") options.timeZone = timeZone;

  try {
    return date.toLocaleTimeString("pt-BR", options);
  } catch (error) {
    if (!(error instanceof RangeError)) throw error;
    delete options.timeZone;
    return date.toLocaleTimeString("pt-BR", options);
  }
}

function formatNumber(value) {
  return Number(value).toLocaleString("pt-BR", { maximumFractionDigits: 1 });
}

function finiteValues(items, key) {
  return items
    .map((item) => item?.[key])
    .filter((value) => value !== null && value !== undefined && !(typeof value === "string" && value.trim() === ""))
    .map(Number)
    .filter(Number.isFinite);
}

export function summarizeHourlyWeather(data) {
  const temperatures = finiteValues(data, "temperature");
  const rainProbabilities = finiteValues(data, "rainProbability");
  if (temperatures.length === 0 && rainProbabilities.length === 0) return "Resumo horário indisponível.";

  const temperatureSummary = temperatures.length > 0
    ? `Temperatura de ${formatNumber(Math.min(...temperatures))} °C a ${formatNumber(Math.max(...temperatures))} °C`
    : "Temperatura indisponível";
  const rainSummary = rainProbabilities.length > 0
    ? `maior probabilidade de chuva de ${formatNumber(Math.max(...rainProbabilities))}%`
    : "probabilidade de chuva indisponível";

  return `${temperatureSummary}; ${rainSummary}.`;
}

export function summarizeFireballs(fireballs) {
  const impacts = finiteValues(fireballs, "impactEnergyKt");
  if (fireballs.length === 0) return "Nenhum registro recente no recorte atual.";
  const recordCount = `${fireballs.length} ${fireballs.length === 1 ? "registro" : "registros"}`;
  if (impacts.length === 0) return `${recordCount} sem energia de impacto informada.`;
  return `${recordCount}; maior energia estimada de ${formatNumber(Math.max(...impacts))} kt.`;
}
