import { useEffect, useState, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { ScrollView, StyleSheet, View } from "react-native";
import { ActivityIndicator, Divider, Icon, Text, useTheme } from "react-native-paper";

import { fetchWeather, type WeatherData } from "./open-meteo";
import { getMoonInfo, getSunTimes } from "./sun-moon";
import { useLocation } from "./use-location";

const MOON_EMOJI = ["🌑", "🌒", "🌓", "🌔", "🌕", "🌖", "🌗", "🌘"];

// Change (in hPa over ~3 h) above which the trend counts as rising/falling.
const TREND_THRESHOLD = 0.5;

const isValid = (d: Date | undefined) => d instanceof Date && !Number.isNaN(d.getTime());

export default function WeatherScreen() {
  const { t, i18n } = useTranslation();
  const theme = useTheme();
  const { status: permission, coords } = useLocation();

  const [data, setData] = useState<WeatherData | null>(null);
  const [error, setError] = useState(false);
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    if (!coords) return;
    let mounted = true;
    setError(false);
    setData(null);
    fetchWeather(coords.lat, coords.lon)
      .then((d) => mounted && setData(d))
      .catch(() => mounted && setError(true));
    return () => {
      mounted = false;
    };
  }, [coords]);

  // Refresh every 30 s so the sunset countdown stays live.
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(id);
  }, []);

  if (permission === "loading") {
    return <Centered><Loading label={t("tools.locationLoading")} /></Centered>;
  }
  if (permission === "denied") {
    return (
      <Centered>
        <Text variant="bodyMedium" style={styles.muted}>
          {t("tools.locationDenied")}
        </Text>
      </Centered>
    );
  }
  if (error) {
    return (
      <Centered>
        <Text variant="bodyMedium" style={{ color: theme.colors.error }}>
          {t("tools.weatherError")}
        </Text>
      </Centered>
    );
  }
  if (!data) {
    return <Centered><Loading label={t("tools.weatherLoading")} /></Centered>;
  }

  const formatTime = (d: Date | undefined) =>
    isValid(d) ? d!.toLocaleTimeString(i18n.language, { hour: "2-digit", minute: "2-digit" }) : "—";

  const formatDuration = (ms: number) => {
    const total = Math.max(0, Math.round(ms / 60000));
    const h = Math.floor(total / 60);
    const m = total % 60;
    return `${h} h ${String(m).padStart(2, "0")}`;
  };

  const formatDay = (iso: string) =>
    new Date(`${iso}T00:00:00`).toLocaleDateString(i18n.language, {
      weekday: "long",
      day: "numeric",
      month: "short",
    });

  const formatFullDate = (d: Date) =>
    d.toLocaleDateString(i18n.language, { weekday: "long", day: "numeric", month: "long" });

  const { pressure, trend, daily } = data;
  const trendView =
    trend > TREND_THRESHOLD
      ? { icon: "▲", label: t("tools.barometerTrendRising"), color: theme.colors.primary }
      : trend < -TREND_THRESHOLD
        ? { icon: "▼", label: t("tools.barometerTrendFalling"), color: theme.colors.error }
        : { icon: "＝", label: t("tools.barometerTrendStable"), color: theme.colors.onSurfaceVariant };
  const inHg = pressure * 0.02953;

  const moon = getMoonInfo(now);
  const sun = coords ? getSunTimes(now, coords.lat, coords.lon) : null;
  const sunsetCountdown =
    sun && isValid(sun.sunset) && sun.sunset.getTime() > now.getTime()
      ? formatDuration(sun.sunset.getTime() - now.getTime())
      : null;
  const dayLength =
    sun && isValid(sun.sunrise) && isValid(sun.sunset)
      ? formatDuration(sun.sunset.getTime() - sun.sunrise.getTime())
      : "—";

  return (
    <ScrollView contentContainerStyle={styles.container}>
      {/* Pressure & trend */}
      <View style={styles.pressureSection}>
        <View style={styles.readout}>
          <Text variant="displaySmall">{pressure.toFixed(1)}</Text>
          <Text variant="titleMedium" style={styles.muted}>
            hPa
          </Text>
        </View>
        <Text variant="bodyMedium" style={styles.muted}>
          {inHg.toFixed(2)} inHg
        </Text>
        <View style={styles.trend}>
          <Text variant="titleLarge" style={{ color: trendView.color }}>
            {trendView.icon}
          </Text>
          <Text variant="titleMedium" style={{ color: trendView.color }}>
            {trendView.label}
          </Text>
        </View>
      </View>

      <Divider />

      {/* Forecast: tomorrow + 2 days */}
      <View style={styles.section}>
        <Text variant="labelLarge" style={styles.muted}>
          {t("tools.weatherForecast")}
        </Text>
        <View style={styles.forecastRow}>
          <View style={styles.forecastDay} />
          <View style={styles.tempCol}>
            <Icon source="thermometer" size={20} color={theme.colors.onSurfaceVariant} />
          </View>
          <View style={styles.precipCol}>
            <Icon source="water" size={20} color={theme.colors.onSurfaceVariant} />
          </View>
        </View>
        {daily.map((day) => (
          <View key={day.date} style={styles.forecastRow}>
            <Text variant="bodyLarge" style={styles.forecastDay}>
              {formatDay(day.date)}
            </Text>
            <View style={styles.tempCol}>
              <Text variant="bodyLarge">
                {t("tools.weatherTempRange", {
                  min: Math.round(day.tempMin),
                  max: Math.round(day.tempMax),
                })}
              </Text>
            </View>
            <View style={styles.precipCol}>
              <Text variant="bodyMedium" style={styles.muted}>
                {t("tools.weatherPrecipitation", { mm: day.precipitation.toFixed(1) })}
              </Text>
            </View>
          </View>
        ))}
      </View>

      <Divider />

      {/* Sun */}
      <View style={styles.section}>
        <Text variant="labelLarge" style={styles.muted}>
          {t("tools.weatherSun")}
        </Text>
        {sun ? (
          <>
            {sunsetCountdown ? (
              <Text variant="titleMedium" style={{ color: theme.colors.primary }}>
                {t("tools.sunMoonSunsetIn", { time: sunsetCountdown })}
              </Text>
            ) : null}
            <InfoRow label={t("tools.sunMoonSunrise")} value={formatTime(sun.sunrise)} />
            <InfoRow label={t("tools.sunMoonSolarNoon")} value={formatTime(sun.solarNoon)} />
            <InfoRow label={t("tools.sunMoonGoldenHour")} value={formatTime(sun.goldenHour)} />
            <InfoRow label={t("tools.sunMoonSunset")} value={formatTime(sun.sunset)} />
            <InfoRow label={t("tools.sunMoonDayLength")} value={dayLength} />
          </>
        ) : null}
      </View>

      <Divider />

      {/* Moon (location-independent) */}
      <View style={styles.section}>
        <Text variant="labelLarge" style={styles.muted}>
          {t("tools.sunMoonMoon")}
        </Text>
        <View style={styles.moonHeader}>
          <Text style={styles.emoji}>{MOON_EMOJI[moon.phaseIndex]}</Text>
          <View style={styles.moonText}>
            <Text variant="titleLarge">{t(`tools.sunMoonPhase${moon.phaseIndex}`)}</Text>
            <Text variant="bodyMedium" style={styles.muted}>
              {t("tools.sunMoonIllumination", { percent: moon.illumination })}
            </Text>
          </View>
        </View>
        {moon.nextFullMoon ? (
          <InfoRow
            label={t("tools.sunMoonNextFullMoon")}
            value={formatFullDate(moon.nextFullMoon)}
          />
        ) : null}
      </View>

      <Text variant="labelSmall" style={styles.source}>
        {t("tools.barometerSource")}
      </Text>
    </ScrollView>
  );
}

function Centered({ children }: { children: ReactNode }) {
  return <View style={styles.center}>{children}</View>;
}

function Loading({ label }: { label: string }) {
  return (
    <View style={styles.loadingRow}>
      <ActivityIndicator />
      <Text variant="bodyMedium" style={styles.muted}>
        {label}
      </Text>
    </View>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.row}>
      <Text variant="bodyLarge" style={styles.muted}>
        {label}
      </Text>
      <Text variant="bodyLarge">{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24, gap: 12 },
  loadingRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  container: { padding: 24, gap: 20 },
  pressureSection: { alignItems: "center", gap: 4 },
  section: { gap: 12 },
  readout: { flexDirection: "row", alignItems: "baseline", gap: 8 },
  trend: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 4 },
  forecastRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  forecastDay: { flex: 1 },
  tempCol: { minWidth: 92, alignItems: "flex-end" },
  precipCol: { minWidth: 60, alignItems: "flex-end" },
  row: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  moonHeader: { flexDirection: "row", alignItems: "center", gap: 16 },
  emoji: { fontSize: 56 },
  moonText: { gap: 2 },
  muted: { opacity: 0.7 },
  source: { opacity: 0.5, textAlign: "center" },
});
