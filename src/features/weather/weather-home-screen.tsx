import { useEffect, useState, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { ScrollView, StyleSheet, View } from "react-native";
import {
  ActivityIndicator,
  Appbar,
  Card,
  Divider,
  Icon,
  Text,
  useTheme,
} from "react-native-paper";
import { SafeAreaView } from "react-native-safe-area-context";
import WebView from "react-native-webview";

import {
  degreesToCompass,
  fetchWeather,
  weatherEmoji,
  weatherI18nKey,
  type WeatherData,
} from "@/features/tools/open-meteo";
import { getMoonInfo, getSunTimes } from "@/features/tools/sun-moon";
import { useLocation } from "@/features/tools/use-location";

const MOON_EMOJI = ["🌑", "🌒", "🌓", "🌔", "🌕", "🌖", "🌗", "🌘"];
const TREND_THRESHOLD = 0.5;
const MAP_HEIGHT = 230;

function buildMapHtml(lat: number, lon: number): string {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1.0,maximum-scale=1.0,user-scalable=no">
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"/>
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <style>
    *{margin:0;padding:0;box-sizing:border-box}
    html,body,#map{width:100%;height:100%}
  </style>
</head>
<body>
  <div id="map"></div>
  <script>
    var lat=${lat},lon=${lon};
    var map=L.map('map',{zoomControl:true,attributionControl:true}).setView([lat,lon],14);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{
      maxZoom:19,
      attribution:'&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
    }).addTo(map);
    var icon=L.divIcon({
      html:'<div style="width:18px;height:18px;border-radius:50%;background:#1976D2;border:3px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.45)"></div>',
      iconSize:[18,18],iconAnchor:[9,9],className:''
    });
    L.marker([lat,lon],{icon:icon}).addTo(map);
    L.circle([lat,lon],{radius:40,color:'#1976D2',fillColor:'#1976D2',fillOpacity:0.12,weight:1}).addTo(map);
  </script>
</body>
</html>`;
}

const isValid = (d: Date | undefined): d is Date =>
  d instanceof Date && !Number.isNaN(d.getTime());

export default function WeatherHomeScreen() {
  const { t, i18n } = useTranslation();
  const theme = useTheme();
  const { status: locationStatus, coords } = useLocation();

  const [data, setData] = useState<WeatherData | null>(null);
  const [weatherError, setWeatherError] = useState(false);
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    if (!coords) return;
    let mounted = true;
    setWeatherError(false);
    setData(null);
    fetchWeather(coords.lat, coords.lon)
      .then((d) => mounted && setData(d))
      .catch(() => mounted && setWeatherError(true));
    return () => { mounted = false; };
  }, [coords]);

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(id);
  }, []);

  const formatTime = (d: Date | undefined) =>
    isValid(d)
      ? d.toLocaleTimeString(i18n.language, { hour: "2-digit", minute: "2-digit" })
      : "—";

  const formatDuration = (ms: number) => {
    const total = Math.max(0, Math.round(ms / 60_000));
    const h = Math.floor(total / 60);
    const m = total % 60;
    return `${h} h ${String(m).padStart(2, "0")}`;
  };

  const formatDay = (iso: string, idx: number) => {
    if (idx === 0) return t("home.today");
    return new Date(`${iso}T00:00:00`).toLocaleDateString(i18n.language, {
      weekday: "short",
      day: "numeric",
      month: "short",
    });
  };

  const sun = coords ? getSunTimes(now, coords.lat, coords.lon) : null;
  const moon = getMoonInfo(now);

  const sunsetCountdown =
    sun && isValid(sun.sunset) && sun.sunset.getTime() > now.getTime()
      ? formatDuration(sun.sunset.getTime() - now.getTime())
      : null;
  const dayLength =
    sun && isValid(sun.sunrise) && isValid(sun.sunset)
      ? formatDuration(sun.sunset.getTime() - sun.sunrise.getTime())
      : "—";

  const currentDate = now.toLocaleDateString(i18n.language, {
    weekday: "long",
    day: "numeric",
    month: "long",
  });

  const trendView =
    data && data.trend > TREND_THRESHOLD
      ? { icon: "▲", label: t("tools.barometerTrendRising"), color: theme.colors.primary }
      : data && data.trend < -TREND_THRESHOLD
        ? { icon: "▼", label: t("tools.barometerTrendFalling"), color: theme.colors.error }
        : { icon: "＝", label: t("tools.barometerTrendStable"), color: theme.colors.onSurfaceVariant };

  return (
    <SafeAreaView style={styles.root} edges={[]}>
      <Appbar.Header elevated>
        <Appbar.Content
          title={t("home.title")}
          titleStyle={styles.appTitle}
          subtitle={currentDate}
        />
      </Appbar.Header>

      {/* Map — rendered outside ScrollView to avoid gesture conflicts */}
      <View style={styles.mapContainer}>
        {locationStatus === "loading" ? (
          <View style={styles.mapPlaceholder}>
            <ActivityIndicator />
            <Text variant="bodySmall" style={styles.muted}>{t("home.locationLoading")}</Text>
          </View>
        ) : locationStatus === "denied" ? (
          <View style={styles.mapPlaceholder}>
            <Icon source="map-marker-off" size={36} color={theme.colors.onSurfaceVariant} />
            <Text variant="bodySmall" style={styles.muted}>{t("home.locationDenied")}</Text>
          </View>
        ) : coords ? (
          <WebView
            source={{ html: buildMapHtml(coords.lat, coords.lon) }}
            style={styles.map}
            scrollEnabled={false}
            originWhitelist={["*"]}
            javaScriptEnabled
          />
        ) : null}
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Current conditions */}
        {locationStatus === "denied" ? (
          <Card style={styles.card}>
            <Card.Content>
              <Text variant="bodyMedium" style={styles.muted}>{t("home.locationDenied")}</Text>
            </Card.Content>
          </Card>
        ) : data ? (
          <Card style={styles.card} mode="elevated">
            <Card.Content style={styles.currentContent}>
              {/* Temperature + weather */}
              <View style={styles.currentTop}>
                <Text style={styles.bigEmoji}>
                  {weatherEmoji(data.current.weathercode)}
                </Text>
                <View style={styles.currentRight}>
                  <Text variant="displaySmall" style={styles.temperature}>
                    {Math.round(data.current.temperature)}°C
                  </Text>
                  <Text variant="bodyLarge" style={styles.weatherDesc}>
                    {t(`home.${weatherI18nKey(data.current.weathercode)}`)}
                  </Text>
                </View>
              </View>

              <Divider style={styles.inlineDivider} />

              {/* Stats row */}
              <View style={styles.statsRow}>
                <StatItem
                  icon="weather-windy"
                  value={`${degreesToCompass(data.current.winddirection, i18n.language)} ${Math.round(data.current.windspeed)} km/h`}
                />
                <StatItem
                  icon="gauge"
                  value={`${data.pressure.toFixed(0)} hPa`}
                  badge={trendView.icon}
                  badgeColor={trendView.color}
                />
                {coords?.altitude != null ? (
                  <StatItem
                    icon="terrain"
                    value={`${Math.round(coords.altitude)} m`}
                  />
                ) : null}
              </View>
            </Card.Content>
          </Card>
        ) : weatherError ? (
          <Card style={styles.card}>
            <Card.Content>
              <Text variant="bodyMedium" style={{ color: theme.colors.error }}>
                {t("home.weatherError")}
              </Text>
            </Card.Content>
          </Card>
        ) : locationStatus === "granted" ? (
          <Card style={styles.card}>
            <Card.Content style={styles.loadingRow}>
              <ActivityIndicator size="small" />
              <Text variant="bodyMedium" style={styles.muted}>{t("home.weatherLoading")}</Text>
            </Card.Content>
          </Card>
        ) : null}

        {/* 5-day forecast */}
        {data ? (
          <Card style={styles.card} mode="elevated">
            <Card.Title title={t("home.forecast")} titleVariant="titleMedium" />
            <Card.Content style={styles.forecastContent}>
              {data.daily.map((day, idx) => (
                <View key={day.date}>
                  {idx > 0 ? <Divider style={styles.forecastDivider} /> : null}
                  <View style={styles.forecastRow}>
                    <Text variant="bodyLarge" style={styles.forecastDay}>
                      {formatDay(day.date, idx)}
                    </Text>
                    <Text style={styles.forecastEmoji}>
                      {weatherEmoji(day.weathercode)}
                    </Text>
                    <Text variant="bodyLarge" style={styles.forecastTemp}>
                      {Math.round(day.tempMin)}° / {Math.round(day.tempMax)}°
                    </Text>
                    <View style={styles.precipCell}>
                      {day.precipitation > 0 ? (
                        <View style={styles.precipRow}>
                          <Icon source="water-outline" size={14} color={theme.colors.primary} />
                          <Text variant="bodySmall" style={{ color: theme.colors.primary }}>
                            {day.precipitation.toFixed(0)} mm
                          </Text>
                        </View>
                      ) : null}
                    </View>
                  </View>
                </View>
              ))}
            </Card.Content>
          </Card>
        ) : null}

        {/* Sun */}
        {sun ? (
          <Card style={styles.card} mode="elevated">
            <Card.Title
              title={t("tools.weatherSun")}
              titleVariant="titleMedium"
              left={(p) => <Icon source="white-balance-sunny" size={p.size} color={theme.colors.secondary} />}
            />
            <Card.Content style={styles.sunContent}>
              {sunsetCountdown ? (
                <Text variant="bodyMedium" style={{ color: theme.colors.secondary, marginBottom: 4 }}>
                  {t("tools.sunMoonSunsetIn", { time: sunsetCountdown })}
                </Text>
              ) : null}
              <SunRow label={t("tools.sunMoonSunrise")} value={formatTime(sun.sunrise)} icon="weather-sunset-up" />
              <SunRow label={t("tools.sunMoonSolarNoon")} value={formatTime(sun.solarNoon)} icon="weather-sunny" />
              <SunRow label={t("tools.sunMoonGoldenHour")} value={formatTime(sun.goldenHour)} icon="weather-sunset" />
              <SunRow label={t("tools.sunMoonSunset")} value={formatTime(sun.sunset)} icon="weather-sunset-down" />
              <SunRow label={t("tools.sunMoonDayLength")} value={dayLength} icon="clock-outline" />
            </Card.Content>
          </Card>
        ) : null}

        {/* Moon */}
        <Card style={styles.card} mode="elevated">
          <Card.Title
            title={t("tools.sunMoonMoon")}
            titleVariant="titleMedium"
            left={(p) => <Text style={{ fontSize: p.size }}>{MOON_EMOJI[moon.phaseIndex]}</Text>}
          />
          <Card.Content>
            <Text variant="titleMedium">{t(`tools.sunMoonPhase${moon.phaseIndex}`)}</Text>
            <Text variant="bodyMedium" style={styles.muted}>
              {t("tools.sunMoonIllumination", { percent: moon.illumination })}
            </Text>
            {moon.nextFullMoon ? (
              <Text variant="bodySmall" style={[styles.muted, { marginTop: 4 }]}>
                {t("tools.sunMoonNextFullMoon")} :{" "}
                {moon.nextFullMoon.toLocaleDateString(i18n.language, {
                  weekday: "long",
                  day: "numeric",
                  month: "long",
                })}
              </Text>
            ) : null}
          </Card.Content>
        </Card>

        <Text variant="labelSmall" style={styles.source}>
          {t("home.source")}
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

function StatItem({
  icon,
  value,
  badge,
  badgeColor,
}: {
  icon: string;
  value: string;
  badge?: string;
  badgeColor?: string;
}) {
  const theme = useTheme();
  return (
    <View style={styles.statItem}>
      <Icon source={icon} size={18} color={theme.colors.onSurfaceVariant} />
      <Text variant="bodyMedium">{value}</Text>
      {badge ? (
        <Text variant="labelSmall" style={{ color: badgeColor }}>
          {badge}
        </Text>
      ) : null}
    </View>
  );
}

function SunRow({ label, value, icon }: { label: string; value: string; icon: string }) {
  const theme = useTheme();
  return (
    <View style={styles.sunRow}>
      <Icon source={icon} size={16} color={theme.colors.onSurfaceVariant} />
      <Text variant="bodyMedium" style={styles.sunLabel}>{label}</Text>
      <Text variant="bodyMedium">{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  appTitle: { fontWeight: "700" },
  mapContainer: {
    height: MAP_HEIGHT,
    backgroundColor: "#e8e8e8",
  },
  map: { flex: 1 },
  mapPlaceholder: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  scroll: { padding: 12, gap: 12, paddingBottom: 24 },
  card: { borderRadius: 16 },
  currentContent: { gap: 12 },
  currentTop: { flexDirection: "row", alignItems: "center", gap: 16 },
  bigEmoji: { fontSize: 56 },
  currentRight: { gap: 2 },
  temperature: { fontWeight: "700", lineHeight: 48 },
  weatherDesc: { opacity: 0.8 },
  inlineDivider: { marginVertical: 4 },
  statsRow: { flexDirection: "row", flexWrap: "wrap", gap: 16 },
  statItem: { flexDirection: "row", alignItems: "center", gap: 6 },
  loadingRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  forecastContent: { gap: 0 },
  forecastDivider: { marginVertical: 2, opacity: 0.4 },
  forecastRow: { flexDirection: "row", alignItems: "center", paddingVertical: 6, gap: 8 },
  forecastDay: { flex: 1 },
  forecastEmoji: { fontSize: 22, width: 32, textAlign: "center" },
  forecastTemp: { minWidth: 90, textAlign: "right" },
  precipCell: { width: 60, alignItems: "flex-end" },
  precipRow: { flexDirection: "row", alignItems: "center", gap: 2 },
  sunContent: { gap: 6 },
  sunRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  sunLabel: { flex: 1, opacity: 0.7 },
  muted: { opacity: 0.7 },
  source: { opacity: 0.45, textAlign: "center", marginTop: 4 },
});
