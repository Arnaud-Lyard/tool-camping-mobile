export type CurrentConditions = {
  temperature: number;
  windspeed: number;
  winddirection: number;
  weathercode: number;
};

export type DailyForecast = {
  /** ISO local date, e.g. "2026-07-07". */
  date: string;
  tempMin: number;
  tempMax: number;
  precipitation: number;
  weathercode: number;
};

export type HourlyEntry = {
  time: string; // display label, e.g. "14:00"
  temperature: number;
  precipitation: number; // probability %
  weathercode: number;
  isCurrent: boolean;
  isPast: boolean;
};

export type WeatherData = {
  /** Current surface pressure at the location, in hPa. */
  pressure: number;
  /** Change over the last ~3 h in hPa (positive = rising). */
  trend: number;
  /** Current conditions from the Open-Meteo `current` endpoint. */
  current: CurrentConditions;
  /** All 24 hourly entries for today (00:00–23:00). */
  hourly: HourlyEntry[];
  /** Forecast for the next 5 days (today + 4 more). */
  daily: DailyForecast[];
};

const pad = (n: number) => String(n).padStart(2, "0");

const localHourKey = (d: Date) =>
  `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:00`;

const localDateKey = (d: Date) =>
  `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

const WMO_EMOJI: Record<number, string> = {
  0: "☀️", 1: "🌤️", 2: "⛅", 3: "☁️",
  45: "🌫️", 48: "🌫️",
  51: "🌦️", 53: "🌦️", 55: "🌦️", 56: "🌨️", 57: "🌨️",
  61: "🌧️", 63: "🌧️", 65: "🌧️", 66: "🌨️", 67: "🌨️",
  71: "❄️", 73: "❄️", 75: "❄️", 77: "❄️",
  80: "🌦️", 81: "🌦️", 82: "🌦️", 85: "🌨️", 86: "🌨️",
  95: "⛈️", 96: "⛈️", 99: "⛈️",
};

export function weatherEmoji(code: number): string {
  return WMO_EMOJI[code] ?? "🌡️";
}

export function weatherI18nKey(code: number): string {
  if (code === 0) return "wmo_clear";
  if (code === 1) return "wmo_mainly_clear";
  if (code === 2) return "wmo_partly_cloudy";
  if (code === 3) return "wmo_overcast";
  if (code === 45 || code === 48) return "wmo_fog";
  if (code >= 51 && code <= 57) return "wmo_drizzle";
  if (code >= 61 && code <= 67) return "wmo_rain";
  if (code >= 71 && code <= 77) return "wmo_snow";
  if (code >= 80 && code <= 82) return "wmo_showers";
  if (code === 85 || code === 86) return "wmo_snow_showers";
  if (code === 95) return "wmo_thunder";
  if (code === 96 || code === 99) return "wmo_thunder_hail";
  return "wmo_clear";
}

const COMPASS_FR = ["N", "NE", "E", "SE", "S", "SO", "O", "NO"];
const COMPASS_EN = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];

export function degreesToCompass(deg: number, lang: string): string {
  const dirs = lang === "en" ? COMPASS_EN : COMPASS_FR;
  return dirs[Math.round(deg / 45) % 8];
}

export async function fetchWeather(lat: number, lon: number): Promise<WeatherData> {
  const url =
    "https://api.open-meteo.com/v1/forecast" +
    `?latitude=${lat}&longitude=${lon}` +
    "&current=temperature_2m,wind_speed_10m,wind_direction_10m,weather_code" +
    "&hourly=surface_pressure,temperature_2m,precipitation_probability,weather_code" +
    "&daily=temperature_2m_max,temperature_2m_min,precipitation_sum,weather_code" +
    "&past_days=1&forecast_days=6&timezone=auto";

  const res = await fetch(url);
  if (!res.ok) throw new Error(`Open-Meteo HTTP ${res.status}`);
  const json = await res.json();

  // --- Current conditions ---
  const cur = json?.current;
  if (
    typeof cur?.temperature_2m !== "number" ||
    typeof cur?.wind_speed_10m !== "number" ||
    typeof cur?.wind_direction_10m !== "number" ||
    typeof cur?.weather_code !== "number"
  ) {
    throw new Error("Open-Meteo: missing current conditions");
  }
  const current: CurrentConditions = {
    temperature: cur.temperature_2m,
    windspeed: cur.wind_speed_10m,
    winddirection: cur.wind_direction_10m,
    weathercode: cur.weather_code,
  };

  // --- Surface pressure + ~3 h trend ---
  const times: unknown = json?.hourly?.time;
  const values: unknown = json?.hourly?.surface_pressure;
  if (!Array.isArray(times) || !Array.isArray(values)) {
    throw new Error("Open-Meteo: missing hourly surface_pressure");
  }
  let idx = times.indexOf(localHourKey(new Date()));
  if (idx < 0 || typeof values[idx] !== "number") {
    idx = values.reduce((last: number, v: unknown, i: number) => (typeof v === "number" ? i : last), -1);
  }
  const pressure = values[idx];
  if (typeof pressure !== "number") throw new Error("Open-Meteo: no pressure value");
  const past = values[idx - 3];
  const trend = typeof past === "number" ? pressure - past : 0;

  // --- Daily forecast: today + 4 more days (5 total) ---
  const days: unknown = json?.daily?.time;
  const maxT: unknown = json?.daily?.temperature_2m_max;
  const minT: unknown = json?.daily?.temperature_2m_min;
  const precip: unknown = json?.daily?.precipitation_sum;
  const codes: unknown = json?.daily?.weather_code;
  if (
    !Array.isArray(days) || !Array.isArray(maxT) ||
    !Array.isArray(minT) || !Array.isArray(precip) || !Array.isArray(codes)
  ) {
    throw new Error("Open-Meteo: missing daily forecast");
  }
  let todayIdx = days.indexOf(localDateKey(new Date()));
  if (todayIdx < 0) todayIdx = 1; // past_days=1 → today is at index 1
  const daily: DailyForecast[] = [];
  for (let i = todayIdx; i < days.length && daily.length < 5; i++) {
    const date = days[i];
    const tMax = maxT[i];
    const tMin = minT[i];
    const p = precip[i];
    const wc = codes[i];
    if (
      typeof date === "string" && typeof tMax === "number" &&
      typeof tMin === "number" && typeof p === "number" && typeof wc === "number"
    ) {
      daily.push({ date, tempMin: tMin, tempMax: tMax, precipitation: p, weathercode: wc });
    }
  }
  if (daily.length === 0) throw new Error("Open-Meteo: no forecast days");

  // --- Hourly strip: all 24 h of today ---
  const hourlyTimes: unknown = json?.hourly?.time;
  const hourlyTemps: unknown = json?.hourly?.temperature_2m;
  const hourlyProbs: unknown = json?.hourly?.precipitation_probability;
  const hourlyCodes: unknown = json?.hourly?.weather_code;
  const todayDate = localDateKey(new Date());
  const curKey = localHourKey(new Date());
  const hourly: HourlyEntry[] = [];
  if (
    Array.isArray(hourlyTimes) && Array.isArray(hourlyTemps) &&
    Array.isArray(hourlyProbs) && Array.isArray(hourlyCodes)
  ) {
    for (let i = 0; i < hourlyTimes.length; i++) {
      const ts = hourlyTimes[i];
      if (typeof ts !== "string" || !ts.startsWith(todayDate)) continue;
      const temp = hourlyTemps[i];
      if (typeof temp !== "number") continue;
      hourly.push({
        time: ts.substring(11, 16),
        temperature: temp,
        precipitation: typeof hourlyProbs[i] === "number" ? (hourlyProbs[i] as number) : 0,
        weathercode: typeof hourlyCodes[i] === "number" ? (hourlyCodes[i] as number) : 0,
        isCurrent: ts === curKey,
        isPast: ts < curKey,
      });
    }
  }

  return { pressure, trend, current, hourly, daily };
}
