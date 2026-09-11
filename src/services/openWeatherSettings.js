export function readOpenWeatherKey(env = import.meta.env ?? {}) {
  return String(env.VITE_OPENWEATHER_API_KEY ?? "").trim();
}
