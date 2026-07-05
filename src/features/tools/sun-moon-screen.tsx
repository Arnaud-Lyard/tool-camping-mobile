import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { ScrollView, StyleSheet, View } from "react-native";
import { ActivityIndicator, Divider, Text, useTheme } from "react-native-paper";

import { getMoonInfo, getSunTimes } from "./sun-moon";
import { useLocation } from "./use-location";

const MOON_EMOJI = ["🌑", "🌒", "🌓", "🌔", "🌕", "🌖", "🌗", "🌘"];

const isValid = (d: Date | undefined) => d instanceof Date && !Number.isNaN(d.getTime());

export default function SunMoonScreen() {
  const { t, i18n } = useTranslation();
  const theme = useTheme();

  const { status: permission, coords } = useLocation();
  const [now, setNow] = useState(() => new Date());

  // Refresh every 30 s so the sunset countdown stays live.
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(id);
  }, []);

  const formatTime = (d: Date | undefined) =>
    isValid(d) ? d!.toLocaleTimeString(i18n.language, { hour: "2-digit", minute: "2-digit" }) : "—";

  const formatDuration = (ms: number) => {
    const total = Math.max(0, Math.round(ms / 60000));
    const h = Math.floor(total / 60);
    const m = total % 60;
    return `${h} h ${String(m).padStart(2, "0")}`;
  };

  const formatDate = (d: Date) =>
    d.toLocaleDateString(i18n.language, { weekday: "long", day: "numeric", month: "long" });

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
      {/* Sun */}
      <View style={styles.section}>
        {permission === "loading" ? (
          <View style={styles.centerRow}>
            <ActivityIndicator />
            <Text variant="bodyMedium" style={styles.muted}>
              {t("sunMoonLocating")}
            </Text>
          </View>
        ) : permission === "denied" ? (
          <Text variant="bodyMedium" style={styles.muted}>
            {t("sunMoonPermissionNeeded")}
          </Text>
        ) : sun ? (
          <>
            {sunsetCountdown ? (
              <Text variant="titleMedium" style={{ color: theme.colors.primary }}>
                {t("sunMoonSunsetIn", { time: sunsetCountdown })}
              </Text>
            ) : null}
            <InfoRow label={t("sunMoonSunrise")} value={formatTime(sun.sunrise)} />
            <InfoRow label={t("sunMoonSolarNoon")} value={formatTime(sun.solarNoon)} />
            <InfoRow label={t("sunMoonGoldenHour")} value={formatTime(sun.goldenHour)} />
            <InfoRow label={t("sunMoonSunset")} value={formatTime(sun.sunset)} />
            <InfoRow label={t("sunMoonDayLength")} value={dayLength} />
          </>
        ) : null}
      </View>

      <Divider />

      {/* Moon (location-independent) */}
      <View style={styles.section}>
        <Text variant="labelLarge" style={styles.muted}>
          {t("sunMoonMoon")}
        </Text>
        <View style={styles.moonHeader}>
          <Text style={styles.emoji}>{MOON_EMOJI[moon.phaseIndex]}</Text>
          <View style={styles.moonText}>
            <Text variant="titleLarge">{t(`sunMoonPhase${moon.phaseIndex}`)}</Text>
            <Text variant="bodyMedium" style={styles.muted}>
              {t("sunMoonIllumination", { percent: moon.illumination })}
            </Text>
          </View>
        </View>
        {moon.nextFullMoon ? (
          <InfoRow
            label={t("sunMoonNextFullMoon")}
            value={formatDate(moon.nextFullMoon)}
          />
        ) : null}
      </View>
    </ScrollView>
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
  container: { padding: 24, gap: 20 },
  section: { gap: 12 },
  centerRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  muted: { opacity: 0.7 },
  row: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  moonHeader: { flexDirection: "row", alignItems: "center", gap: 16 },
  emoji: { fontSize: 56 },
  moonText: { gap: 2 },
});
