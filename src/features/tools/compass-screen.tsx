import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { StyleSheet, View, useWindowDimensions } from "react-native";
import { Magnetometer } from "expo-sensors";
import { Text, useTheme } from "react-native-paper";

// Exponential low-pass factor applied to the field vector (not the heading, to
// avoid the 0°/360° wrap-around). Smaller = smoother but more lag.
const FILTER_ALPHA = 0.15;
const NORTH_COLOR = "#d9534f";

const RAD = 180 / Math.PI;

export default function CompassScreen() {
  const { t } = useTranslation();
  const theme = useTheme();
  const { width } = useWindowDimensions();

  const size = Math.min(width - 48, 300);

  const [available, setAvailable] = useState<boolean | null>(null);
  const [field, setField] = useState({ x: 0, y: 0 });
  const filtered = useRef({ x: 0, y: 0 });

  useEffect(() => {
    let mounted = true;
    let sub: ReturnType<typeof Magnetometer.addListener> | undefined;

    Magnetometer.isAvailableAsync().then((ok) => {
      if (!mounted) return;
      setAvailable(ok);
      if (!ok) return;
      Magnetometer.setUpdateInterval(80);
      sub = Magnetometer.addListener(({ x, y }) => {
        const f = filtered.current;
        f.x += FILTER_ALPHA * (x - f.x);
        f.y += FILTER_ALPHA * (y - f.y);
        setField({ x: f.x, y: f.y });
      });
    });

    return () => {
      mounted = false;
      sub?.remove();
    };
  }, []);

  // Heading the top of the phone points to, clockwise from magnetic north.
  // North=0, East=90, South=180, West=270. If a device reports opposite axes,
  // adjust the -90 offset / atan2 argument order here.
  let heading = Math.atan2(field.y, field.x) * RAD - 90;
  heading = ((heading % 360) + 360) % 360;

  const letters = {
    n: t("tools.compassNorth"),
    e: t("tools.compassEast"),
    s: t("tools.compassSouth"),
    w: t("tools.compassWest"),
  };
  // Eight-wind label built from the four base letters (works for FR & EN:
  // NE = N+E, SO/SW = S+W, NO/NW = N+W…).
  const eightWind = [
    letters.n,
    letters.n + letters.e,
    letters.e,
    letters.s + letters.e,
    letters.s,
    letters.s + letters.w,
    letters.w,
    letters.n + letters.w,
  ];
  const cardinal = eightWind[Math.round(heading / 45) % 8];

  if (available === false) {
    return (
      <View style={styles.center}>
        <Text variant="bodyMedium" style={{ color: theme.colors.error }}>
          {t("tools.compassUnavailable")}
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.center}>
      <Text variant="bodyMedium" style={styles.instruction}>
        {t("tools.compassInstruction")}
      </Text>

      <View style={{ width: size, height: size }}>
        {/* Fixed pointer at the top, showing where the phone points */}
        <View
          style={[
            styles.pointer,
            { borderTopColor: theme.colors.primary },
          ]}
        />

        {/* Rotating dial: turned so its North marker keeps facing real north */}
        <View
          style={[
            styles.dial,
            {
              width: size,
              height: size,
              borderRadius: size / 2,
              backgroundColor: theme.colors.surfaceVariant,
              borderColor: theme.colors.outline,
              transform: [{ rotate: `${-heading}deg` }],
            },
          ]}
        >
          <View style={[styles.edge, styles.edgeTop]}>
            <Text variant="titleLarge" style={{ color: NORTH_COLOR }}>
              {letters.n}
            </Text>
          </View>
          <View style={[styles.edge, styles.edgeRight]}>
            <Text variant="titleMedium">{letters.e}</Text>
          </View>
          <View style={[styles.edge, styles.edgeBottom]}>
            <Text variant="titleMedium">{letters.s}</Text>
          </View>
          <View style={[styles.edge, styles.edgeLeft]}>
            <Text variant="titleMedium">{letters.w}</Text>
          </View>
          <View
            style={[
              styles.needle,
              {
                backgroundColor: NORTH_COLOR,
                height: size * 0.36,
                left: size / 2 - 2,
                top: size * 0.14,
              },
            ]}
          />
          <View
            style={[
              styles.hub,
              {
                backgroundColor: theme.colors.onSurfaceVariant,
                left: size / 2 - 7,
                top: size / 2 - 7,
              },
            ]}
          />
        </View>
      </View>

      <Text variant="displaySmall">
        {Math.round(heading)}° {cardinal}
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
    gap: 28,
  },
  instruction: { textAlign: "center" },
  pointer: {
    position: "absolute",
    top: -2,
    alignSelf: "center",
    zIndex: 1,
    width: 0,
    height: 0,
    borderLeftWidth: 10,
    borderRightWidth: 10,
    borderTopWidth: 16,
    borderLeftColor: "transparent",
    borderRightColor: "transparent",
  },
  dial: {
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },
  edge: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  edgeTop: { alignItems: "center", justifyContent: "flex-start", paddingTop: 10 },
  edgeBottom: { alignItems: "center", justifyContent: "flex-end", paddingBottom: 10 },
  edgeRight: { alignItems: "flex-end", justifyContent: "center", paddingRight: 14 },
  edgeLeft: { alignItems: "flex-start", justifyContent: "center", paddingLeft: 14 },
  needle: { position: "absolute", width: 4, borderRadius: 2 },
  hub: { position: "absolute", width: 14, height: 14, borderRadius: 7 },
});
