export type PressureReading = {
  /** Current surface pressure at the location, in hPa. */
  pressure: number;
  /** Change over the last ~3 h in hPa (positive = rising). */
  trend: number;
};

const pad = (n: number) => String(n).padStart(2, "0");

// Open-Meteo hourly timestamps look like "2026-07-05T14:00" (no seconds) and,
// with timezone=UTC, are in UTC — so we can match the current hour by string.
const utcHourKey = (d: Date) =>
  `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}T${pad(
    d.getUTCHours(),
  )}:00`;

/**
 * Fetches the real atmospheric pressure at a position from Open-Meteo
 * (free, no API key). Reads the hourly surface-pressure series (surface
 * pressure at the location's elevation) and derives a ~3 h trend. Throws on
 * network or unexpected-shape errors — the caller shows an error state
 * (no offline fallback).
 *
 * Relies only on the documented `hourly` structure + `past_days`/`forecast_days`
 * so the request stays valid across API revisions.
 */
export async function fetchSurfacePressure(
  lat: number,
  lon: number,
): Promise<PressureReading> {
  const url =
    "https://api.open-meteo.com/v1/forecast" +
    `?latitude=${lat}&longitude=${lon}` +
    "&hourly=surface_pressure&past_days=1&forecast_days=1&timezone=UTC";

  const res = await fetch(url);
  if (!res.ok) throw new Error(`Open-Meteo HTTP ${res.status}`);

  const json = await res.json();
  const times: unknown = json?.hourly?.time;
  const values: unknown = json?.hourly?.surface_pressure;
  if (!Array.isArray(times) || !Array.isArray(values)) {
    throw new Error("Open-Meteo: missing hourly surface_pressure");
  }

  // Index of the current hour; fall back to the latest hour with a value.
  let idx = times.indexOf(utcHourKey(new Date()));
  if (idx < 0 || typeof values[idx] !== "number") {
    idx = values.reduce((last, v, i) => (typeof v === "number" ? i : last), -1);
  }
  const pressure = values[idx];
  if (typeof pressure !== "number") {
    throw new Error("Open-Meteo: no pressure value");
  }

  const past = values[idx - 3];
  const trend = typeof past === "number" ? pressure - past : 0;

  return { pressure, trend };
}
