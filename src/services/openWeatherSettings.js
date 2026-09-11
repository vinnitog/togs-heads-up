const SESSION_KEY = "togs-openweather-key";

export function readOpenWeatherKey(env = import.meta.env ?? {}, storage) {
  try {
    const session = storage ?? globalThis.sessionStorage;
    const saved = session?.getItem(SESSION_KEY);
    if (saved !== null && saved !== undefined) return saved;
  } catch {
    // Storage can be disabled; the current React session remains usable.
  }
  return env.DEV ? String(env.VITE_OPENWEATHER_API_KEY ?? "").trim() : "";
}

export function saveOpenWeatherKey(value, storage) {
  const key = String(value ?? "").trim();
  try {
    (storage ?? globalThis.sessionStorage)?.setItem(SESSION_KEY, key);
  } catch {
    // A blocked sessionStorage must not prevent an in-memory connection.
  }
  return key;
}
