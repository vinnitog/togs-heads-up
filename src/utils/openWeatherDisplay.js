export function formatOpenWeatherValue(value, unit = "") {
  if (value === null || value === undefined || !Number.isFinite(Number(value))) return "--";
  return `${Number(value).toLocaleString("pt-BR", { maximumFractionDigits: 1 })}${unit}`;
}

export function formatOpenWeatherTime(seconds, offset = 0, date = false) {
  if (!Number.isFinite(seconds)) return "--";
  return new Date((seconds + (offset ?? 0)) * 1000).toLocaleString("pt-BR", {
    timeZone: "UTC", ...(date ? { day: "2-digit", month: "2-digit" } : {}),
    hour: "2-digit", minute: "2-digit",
  });
}

export const AIR_QUALITY_LABELS = ["--", "Boa", "Razoável", "Moderada", "Ruim", "Muito ruim"];

export const POLLUTANTS = [
  ["pm2_5", "PM2,5"], ["pm10", "PM10"], ["co", "CO"], ["no", "NO"],
  ["no2", "NO2"], ["o3", "O3"], ["so2", "SO2"], ["nh3", "NH3"],
];
