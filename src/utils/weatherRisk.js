const HIGH_WEATHER_CODES = new Set([65, 67, 82, 95, 96, 99]);
const MODERATE_WEATHER_CODES = new Set([63, 80, 81]);
const LEVEL_WEIGHT = { baixo: 1, moderado: 2, alto: 3 };

function finiteValue(value) {
  if (value === null || value === undefined || value === "") return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function maximum(items, key) {
  const values = items.map((item) => finiteValue(item?.[key])).filter((value) => value !== null);
  return values.length > 0 ? Math.max(...values) : null;
}

function minimum(items, key) {
  const values = items.map((item) => finiteValue(item?.[key])).filter((value) => value !== null);
  return values.length > 0 ? Math.min(...values) : null;
}

function sum(items, key) {
  const values = items.map((item) => finiteValue(item?.[key])).filter((value) => value !== null);
  if (values.length === 0) return null;
  return Number(values.reduce((total, value) => total + value, 0).toFixed(1));
}

function levelForHour(hour) {
  const code = finiteValue(hour.weatherCode);
  const probability = finiteValue(hour.rainProbability) ?? 0;
  const precipitation = finiteValue(hour.precipitation) ?? 0;
  const cape = finiteValue(hour.cape) ?? 0;
  const gusts = finiteValue(hour.gusts) ?? 0;
  const visibility = finiteValue(hour.visibility);

  if (
    HIGH_WEATHER_CODES.has(code) ||
    precipitation >= 10 ||
    gusts >= 75 ||
    (cape >= 2000 && probability >= 50)
  ) {
    return "alto";
  }

  if (
    MODERATE_WEATHER_CODES.has(code) ||
    precipitation >= 5 ||
    gusts >= 50 ||
    (cape >= 1000 && probability >= 40) ||
    (visibility !== null && visibility < 2000)
  ) {
    return "moderado";
  }

  return "baixo";
}

function buildReasons({ codes, maxHourlyPrecipitation, maxCape, maxGusts, minVisibilityKm }) {
  const reasons = [];
  if (codes.some((code) => HIGH_WEATHER_CODES.has(code))) reasons.push("Tempestade ou chuva forte indicada pelo código meteorológico.");
  else if (codes.some((code) => MODERATE_WEATHER_CODES.has(code))) reasons.push("Chuva moderada indicada pelo código meteorológico.");
  if (maxHourlyPrecipitation >= 10) reasons.push(`Chuva intensa de até ${maxHourlyPrecipitation.toLocaleString("pt-BR")} mm em uma hora.`);
  else if (maxHourlyPrecipitation >= 5) reasons.push(`Precipitação de até ${maxHourlyPrecipitation.toLocaleString("pt-BR")} mm em uma hora.`);
  if (maxGusts >= 50) reasons.push(`Rajadas de até ${maxGusts.toLocaleString("pt-BR")} km/h.`);
  if (maxCape >= 1000) reasons.push(`Instabilidade atmosférica elevada (CAPE até ${maxCape.toLocaleString("pt-BR")} J/kg).`);
  if (minVisibilityKm !== null && minVisibilityKm < 2) reasons.push(`Visibilidade mínima estimada em ${minVisibilityKm.toLocaleString("pt-BR")} km.`);
  return reasons;
}

export function assessHourlyWeatherRisk(hourly) {
  const hours = Array.isArray(hourly) ? hourly : [];
  const hasRiskMeasurement = hours.some((hour) =>
    ["rainProbability", "precipitation", "weatherCode", "cape", "gusts", "visibility"]
      .some((key) => finiteValue(hour?.[key]) !== null),
  );
  if (hours.length === 0 || !hasRiskMeasurement) {
    return {
      level: "indisponivel",
      peakTime: null,
      maxRainProbability: null,
      totalPrecipitation: null,
      maxHourlyPrecipitation: null,
      maxCape: null,
      maxGusts: null,
      minVisibilityKm: null,
      reasons: [],
      summary: "Dados horários insuficientes para estimar risco meteorológico.",
    };
  }

  const rankedHours = hours.map((hour) => ({ hour, level: levelForHour(hour) }));
  const peak = rankedHours.reduce((highest, current) =>
    LEVEL_WEIGHT[current.level] > LEVEL_WEIGHT[highest.level] ? current : highest,
  );
  const level = peak.level;
  const maxRainProbability = maximum(hours, "rainProbability");
  const totalPrecipitation = sum(hours, "precipitation");
  const maxHourlyPrecipitation = maximum(hours, "precipitation");
  const maxCape = maximum(hours, "cape");
  const maxGusts = maximum(hours, "gusts");
  const minVisibilityMeters = minimum(hours, "visibility");
  const minVisibilityKm = minVisibilityMeters === null ? null : Number((minVisibilityMeters / 1000).toFixed(1));
  const codes = hours.map((hour) => finiteValue(hour.weatherCode)).filter((value) => value !== null);
  const reasons = buildReasons({ codes, maxHourlyPrecipitation, maxCape, maxGusts, minVisibilityKm });
  const peakTime = peak.hour.hour || peak.hour.time?.slice(11, 16) || null;

  return {
    level,
    peakTime,
    maxRainProbability,
    totalPrecipitation,
    maxHourlyPrecipitation,
    maxCape,
    maxGusts,
    minVisibilityKm,
    reasons,
    summary: `Risco meteorológico estimado ${level} nas próximas 24h${level !== "baixo" && peakTime ? `, com sinais desse nível a partir de ${peakTime}` : ""}.`,
  };
}
