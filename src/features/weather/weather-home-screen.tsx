import { useEffect, useRef, useState } from "react";
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
  fetchWeather,
  weatherEmoji,
  weatherI18nKey,
  type HourlyEntry,
  type WeatherData,
} from "@/features/tools/open-meteo";
import { getSunTimes } from "@/features/tools/sun-moon";
import { useLocation } from "@/features/tools/use-location";

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

async function reverseGeocode(lat: number, lon: number, lang: string): Promise<string | null> {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json&addressdetails=1`,
      { headers: { "Accept-Language": lang } }
    );
    const data = await res.json();
    const a = data?.address;
    return a?.town ?? a?.village ?? a?.municipality ?? a?.city ?? a?.county ?? null;
  } catch {
    return null;
  }
}

export default function WeatherHomeScreen() {
  const { t, i18n } = useTranslation();
  const theme = useTheme();
  const { status: locationStatus, coords } = useLocation();

  const [data, setData] = useState<WeatherData | null>(null);
  const [weatherError, setWeatherError] = useState(false);
  const [locationName, setLocationName] = useState<string | null>(null);
  const [now, setNow] = useState(() => new Date());
  const hourlyScrollRef = useRef<ScrollView>(null);

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
    if (!coords) return;
    let mounted = true;
    reverseGeocode(coords.lat, coords.lon, i18n.language)
      .then((name) => { if (mounted) setLocationName(name); });
    return () => { mounted = false; };
  }, [coords, i18n.language]);

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(id);
  }, []);

  // Scroll hourly strip to centre the current hour once data arrives
  useEffect(() => {
    if (!data?.hourly?.length) return;
    const idx = data.hourly.findIndex((h) => h.isCurrent);
    if (idx <= 0) return;
    setTimeout(() => {
      hourlyScrollRef.current?.scrollTo({ x: Math.max(0, idx * 64 - 100), animated: false });
    }, 80);
  }, [data]);

  const formatTime = (d: Date | undefined) =>
    isValid(d)
      ? d.toLocaleTimeString(i18n.language, { hour: "2-digit", minute: "2-digit" })
      : "—";

  const fmtShortDay = (iso: string) => {
    const s = new Date(`${iso}T00:00:00`).toLocaleDateString(i18n.language, { weekday: "short" });
    return s.charAt(0).toUpperCase() + s.slice(1).replace(/\.$/, "");
  };

  const sun = coords ? getSunTimes(now, coords.lat, coords.lon) : null;

  const currentDate = now.toLocaleDateString(i18n.language, {
    weekday: "long",
    day: "numeric",
    month: "long",
  });

  const trendColor =
    data && data.trend > TREND_THRESHOLD
      ? theme.colors.primary
      : data && data.trend < -TREND_THRESHOLD
        ? theme.colors.error
        : theme.colors.onSurfaceVariant;

  const trendIcon =
    data && data.trend > TREND_THRESHOLD ? "▲" : data && data.trend < -TREND_THRESHOLD ? "▼" : null;

  return (
    <SafeAreaView style={styles.root} edges={[]}>
      <Appbar.Header elevated>
        <Appbar.Content
          title={t("home.title")}
          titleStyle={styles.appTitle}
          subtitle={currentDate}
        />
      </Appbar.Header>

      {/* Map */}
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
              <Text variant="bodySmall" style={styles.locationHeader}>
                {t(`home.${weatherI18nKey(data.current.weathercode)}`)}
                {locationName ? ` · ${locationName}` : ""}
              </Text>
              <View style={styles.currentRow}>
                <View style={styles.currentLeft}>
                  <Text style={styles.bigEmoji}>{weatherEmoji(data.current.weathercode)}</Text>
                  <Text variant="displaySmall" style={styles.temperature}>
                    {Math.round(data.current.temperature)}°C
                  </Text>
                </View>
                <View style={styles.statsCol}>
                  <View style={styles.statItem}>
                    <Icon source="weather-windy" size={16} color={theme.colors.onSurfaceVariant} />
                    <Text variant="bodyMedium">{Math.round(data.current.windspeed)} km/h</Text>
                  </View>
                  <View style={styles.statItem}>
                    <Icon source="gauge" size={16} color={theme.colors.onSurfaceVariant} />
                    <Text variant="bodyMedium">{data.pressure.toFixed(0)} hPa</Text>
                    {trendIcon ? (
                      <Text variant="labelSmall" style={{ color: trendColor }}>{trendIcon}</Text>
                    ) : null}
                  </View>
                </View>
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

        {/* Hourly strip */}
        {data?.hourly && data.hourly.length > 0 ? (
          <Card style={styles.card} mode="elevated">
            <Card.Title title={t("home.today")} titleVariant="labelLarge" />
            <ScrollView
              ref={hourlyScrollRef}
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.hourlyScroll}
            >
              {data.hourly.map((h: HourlyEntry) => (
                <View
                  key={h.time}
                  style={[
                    styles.hourlyItem,
                    h.isCurrent && styles.hourlyItemCurrent,
                    h.isPast && styles.hourlyItemPast,
                  ]}
                >
                  <Text
                    variant="labelSmall"
                    style={h.isCurrent ? styles.hourlyLabelCurrent : styles.hourlyLabel}
                  >
                    {h.isCurrent ? (i18n.language === "fr" ? "Maint." : "Now") : h.time}
                  </Text>
                  <Text style={styles.hourlyEmoji}>{weatherEmoji(h.weathercode)}</Text>
                  <Text
                    variant="bodySmall"
                    style={[styles.hourlyTemp, h.isCurrent && styles.hourlyTempCurrent]}
                  >
                    {Math.round(h.temperature)}°
                  </Text>
                  <Text
                    variant="labelSmall"
                    style={h.precipitation > 20 ? styles.hourlyRainActive : styles.hourlyRainMuted}
                  >
                    {h.precipitation}%
                  </Text>
                </View>
              ))}
            </ScrollView>
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
                      {idx === 0 ? t("home.today") : fmtShortDay(day.date)}
                    </Text>
                    <Text style={styles.forecastEmoji}>{weatherEmoji(day.weathercode)}</Text>
                    <View style={styles.forecastTempBox}>
                      <Text variant="bodyMedium" style={styles.tempMax}>
                        {Math.round(day.tempMax)}°
                      </Text>
                      <Text variant="bodyMedium" style={styles.tempMin}>
                        {Math.round(day.tempMin)}°
                      </Text>
                    </View>
                  </View>
                </View>
              ))}
            </Card.Content>
          </Card>
        ) : null}

        {/* Ensoleillement */}
        {sun ? (
          <View style={styles.sunSection}>
            <Text variant="titleMedium" style={styles.sectionTitle}>
              {t("home.ensoleillement")}
            </Text>
            <View style={styles.sunCards}>
              <View style={styles.sunCard}>
                <Icon source="weather-sunset-up" size={28} color="#f59e0b" />
                <Text variant="titleLarge" style={styles.sunTime}>
                  {formatTime(sun.sunrise)}
                </Text>
                <Text variant="bodySmall" style={styles.sunLabel}>
                  {t("tools.sunMoonSunrise")}
                </Text>
              </View>
              <View style={styles.sunCard}>
                <Icon source="weather-sunset-down" size={28} color="#f59e0b" />
                <Text variant="titleLarge" style={styles.sunTime}>
                  {formatTime(sun.sunset)}
                </Text>
                <Text variant="bodySmall" style={styles.sunLabel}>
                  {t("tools.sunMoonSunset")}
                </Text>
              </View>
            </View>
          </View>
        ) : null}

        <Text variant="labelSmall" style={styles.source}>
          {t("home.source")}
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  appTitle: { fontWeight: "700" },
  mapContainer: { height: MAP_HEIGHT, backgroundColor: "#e8e8e8" },
  map: { flex: 1 },
  mapPlaceholder: { flex: 1, alignItems: "center", justifyContent: "center", gap: 8 },
  scroll: { padding: 12, gap: 12, paddingBottom: 24 },
  card: { borderRadius: 16 },
  currentContent: { gap: 8 },
  locationHeader: { opacity: 0.6 },
  currentRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  currentLeft: { flexDirection: "row", alignItems: "center", gap: 8 },
  bigEmoji: { fontSize: 48 },
  temperature: { fontWeight: "700" },
  statsCol: { gap: 6, alignItems: "flex-end" },
  statItem: { flexDirection: "row", alignItems: "center", gap: 4 },
  loadingRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  forecastContent: { gap: 0 },
  forecastDivider: { marginVertical: 2, opacity: 0.4 },
  forecastRow: { flexDirection: "row", alignItems: "center", paddingVertical: 8, gap: 8 },
  forecastDay: { flex: 1 },
  forecastEmoji: { fontSize: 22, width: 32, textAlign: "center" },
  forecastTempBox: { flexDirection: "row", gap: 4, minWidth: 70, justifyContent: "flex-end" },
  tempMax: { fontWeight: "600" },
  tempMin: { opacity: 0.5 },
  sunSection: { gap: 10 },
  sectionTitle: { fontWeight: "700" },
  sunCards: { flexDirection: "row", gap: 12 },
  sunCard: {
    flex: 1,
    alignItems: "center",
    backgroundColor: "#fef3c7",
    borderRadius: 16,
    padding: 16,
    gap: 4,
  },
  sunTime: { fontWeight: "700", color: "#92400e" },
  sunLabel: { color: "#b45309", textAlign: "center" },
  muted: { opacity: 0.7 },
  source: { opacity: 0.45, textAlign: "center", marginTop: 4 },
  hourlyScroll: { paddingHorizontal: 12, paddingBottom: 12, gap: 4, flexDirection: "row" },
  hourlyItem: {
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 12,
    gap: 4,
    minWidth: 56,
  },
  hourlyItemCurrent: {
    backgroundColor: "rgba(79,70,229,0.1)",
    borderWidth: 1,
    borderColor: "rgba(79,70,229,0.25)",
  },
  hourlyItemPast: { opacity: 0.4 },
  hourlyLabel: { opacity: 0.6 },
  hourlyLabelCurrent: { color: "#4f46e5", fontWeight: "700" },
  hourlyEmoji: { fontSize: 18 },
  hourlyTemp: { fontWeight: "600" },
  hourlyTempCurrent: { color: "#4338ca" },
  hourlyRainActive: { color: "#3b82f6" },
  hourlyRainMuted: { opacity: 0.3 },
});
