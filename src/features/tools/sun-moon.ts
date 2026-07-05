import { getMoonIllumination, getTimes, type SunTimes } from "suncalc";

export type MoonInfo = {
  /** 0=new … 4=full … 7=waning crescent. Maps to the `sunMoonPhase{n}` keys. */
  phaseIndex: number;
  /** Illuminated fraction as a whole percentage (0–100). */
  illumination: number;
  /** Date of the next full moon, or null if none found within the search window. */
  nextFullMoon: Date | null;
};

export function getSunTimes(date: Date, lat: number, lon: number): SunTimes {
  return getTimes(date, lat, lon);
}

export function getMoonInfo(date: Date): MoonInfo {
  const { fraction, phase } = getMoonIllumination(date);
  return {
    phaseIndex: Math.round(phase * 8) % 8,
    illumination: Math.round(fraction * 100),
    nextFullMoon: findNextFullMoon(date),
  };
}

// Scans forward hour by hour (up to ~40 days) for the moment the illumination
// phase crosses 0.5 upward — i.e. the next full moon. Location-independent.
function findNextFullMoon(from: Date): Date | null {
  const stepMs = 60 * 60 * 1000;
  let prev = getMoonIllumination(from).phase;
  for (let i = 1; i <= 24 * 40; i++) {
    const d = new Date(from.getTime() + i * stepMs);
    const phase = getMoonIllumination(d).phase;
    if (prev < 0.5 && phase >= 0.5) return d;
    prev = phase;
  }
  return null;
}
