import { useTranslation } from "react-i18next";
import { StyleSheet, View } from "react-native";
import { ActivityIndicator, Text, useTheme } from "react-native-paper";

import { useLocation } from "./use-location";

export default function AltimeterScreen() {
  const { t } = useTranslation();
  const theme = useTheme();
  const { status, coords } = useLocation();

  if (status === "loading") {
    return (
      <View style={styles.center}>
        <View style={styles.loadingRow}>
          <ActivityIndicator />
          <Text variant="bodyMedium" style={styles.muted}>
            {t("tools.locationLoading")}
          </Text>
        </View>
      </View>
    );
  }
  if (status === "denied") {
    return (
      <View style={styles.center}>
        <Text variant="bodyMedium" style={styles.muted}>
          {t("tools.locationDenied")}
        </Text>
      </View>
    );
  }
  if (!coords || coords.altitude == null) {
    return (
      <View style={styles.center}>
        <Text variant="bodyMedium" style={{ color: theme.colors.error }}>
          {t("tools.altimeterGpsUnavailable")}
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.center}>
      <View style={styles.readout}>
        <Text variant="displayLarge">{Math.round(coords.altitude)}</Text>
        <Text variant="titleMedium" style={styles.muted}>
          m
        </Text>
      </View>
      {coords.accuracy != null ? (
        <Text variant="bodyMedium" style={styles.muted}>
          {t("tools.altimeterAccuracy", { m: Math.round(coords.accuracy) })}
        </Text>
      ) : null}
      <Text variant="labelSmall" style={styles.source}>
        {t("tools.altimeterSource")}
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
  source: { opacity: 0.5, marginTop: 12 },
});
