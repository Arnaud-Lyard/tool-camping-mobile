import { useEffect, useState, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { StyleSheet, View } from "react-native";
import { ActivityIndicator, Text, useTheme } from "react-native-paper";

import { fetchSurfacePressure, type PressureReading } from "./open-meteo";
import { useLocation } from "./use-location";

// Change (in hPa over ~3 h) above which the trend counts as rising/falling.
const TREND_THRESHOLD = 0.5;

export default function BarometerScreen() {
  const { t } = useTranslation();
  const theme = useTheme();
  const { status, coords } = useLocation();

  const [reading, setReading] = useState<PressureReading | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!coords) return;
    let mounted = true;
    setError(false);
    setReading(null);
    fetchSurfacePressure(coords.lat, coords.lon)
      .then((r) => mounted && setReading(r))
      .catch(() => mounted && setError(true));
    return () => {
      mounted = false;
    };
  }, [coords]);

  if (status === "loading") {
    return <Centered><Loading label={t("tools.locationLoading")} /></Centered>;
  }
  if (status === "denied") {
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
          {t("tools.barometerError")}
        </Text>
      </Centered>
    );
  }
  if (!reading) {
    return <Centered><Loading label={t("tools.barometerLoading")} /></Centered>;
  }

  const { pressure, trend } = reading;
  const trendView =
    trend > TREND_THRESHOLD
      ? { icon: "▲", label: t("tools.barometerTrendRising"), color: theme.colors.primary }
      : trend < -TREND_THRESHOLD
        ? { icon: "▼", label: t("tools.barometerTrendFalling"), color: theme.colors.error }
        : { icon: "＝", label: t("tools.barometerTrendStable"), color: theme.colors.onSurfaceVariant };
  const inHg = pressure * 0.02953;

  return (
    <Centered>
      <View style={styles.readout}>
        <Text variant="displayLarge">{pressure.toFixed(1)}</Text>
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
      <Text variant="labelSmall" style={styles.source}>
        {t("tools.barometerSource")}
      </Text>
    </Centered>
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

const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
    gap: 12,
  },
  loadingRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  readout: { flexDirection: "row", alignItems: "baseline", gap: 8 },
  muted: { opacity: 0.7 },
  trend: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 8 },
  source: { opacity: 0.5, marginTop: 12 },
});
