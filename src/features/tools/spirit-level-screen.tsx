import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { StyleSheet, View, useWindowDimensions } from "react-native";
import * as Haptics from "expo-haptics";
import { Accelerometer } from "expo-sensors";
import { MD3Theme, Text, useTheme } from "react-native-paper";

// An axis must stay under this tilt (in degrees) to be considered "level".
const LEVEL_THRESHOLD = 0.6;
// Tilt (in degrees) that pushes the bubble all the way to the end of the tube.
const MAX_ANGLE = 12;
// Exponential low-pass factor: smaller = smoother but more lag. Kills jitter.
const FILTER_ALPHA = 0.2;
const LEVEL_COLOR = "#2e9e44";

const RAD = 180 / Math.PI;
const clamp = (v: number) => Math.max(-1, Math.min(1, v));

type BarProps = {
  orientation: "horizontal" | "vertical";
  label: string;
  angle: number;
  length: number;
  thickness: number;
  headerWidth: number;
  theme: MD3Theme;
};

function LevelBar({
  orientation,
  label,
  angle,
  length,
  thickness,
  headerWidth,
  theme,
}: BarProps) {
  const horizontal = orientation === "horizontal";
  const isLevel = Math.abs(angle) <= LEVEL_THRESHOLD;
  const bubbleSize = thickness - 12;
  const maxTravel = (length - bubbleSize) / 2 - 4;
  const zoneSize = bubbleSize + 12;
  // Bubble travels toward the raised (high) side, like a real spirit level.
  // Screen Y grows downward, so the vertical tube uses -frac. Flip if a device
  // reports opposite axes.
  const frac = clamp(angle / MAX_ANGLE) * maxTravel;
  const transform = horizontal
    ? [{ translateX: frac }]
    : [{ translateY: -frac }];
  const accent = isLevel ? LEVEL_COLOR : theme.colors.primary;

  return (
    <View style={styles.bar}>
      <View style={[styles.barHeader, { width: headerWidth }]}>
        <Text variant="labelLarge" style={styles.axisLabel}>
          {label}
        </Text>
        <Text
          variant="titleMedium"
          style={{ color: isLevel ? LEVEL_COLOR : theme.colors.onSurface }}
        >
          {angle.toFixed(1)}°
        </Text>
      </View>
      <View
        style={[
          styles.tube,
          {
            width: horizontal ? length : thickness,
            height: horizontal ? thickness : length,
            borderRadius: thickness / 2,
            backgroundColor: theme.colors.surfaceVariant,
            borderColor: isLevel ? LEVEL_COLOR : theme.colors.outline,
          },
        ]}
      >
        {/* Tolerance zone at the centre */}
        <View
          style={{
            position: "absolute",
            width: horizontal ? zoneSize : thickness,
            height: horizontal ? thickness : zoneSize,
            borderLeftWidth: horizontal ? 1 : 0,
            borderRightWidth: horizontal ? 1 : 0,
            borderTopWidth: horizontal ? 0 : 1,
            borderBottomWidth: horizontal ? 0 : 1,
            borderColor: isLevel ? LEVEL_COLOR : theme.colors.outlineVariant,
          }}
        />
        {/* Bubble */}
        <View
          style={[
            styles.bubble,
            {
              width: bubbleSize,
              height: bubbleSize,
              borderRadius: bubbleSize / 2,
              backgroundColor: accent,
              borderColor: theme.colors.background,
              transform,
            },
          ]}
        />
      </View>
    </View>
  );
}

export default function SpiritLevelScreen() {
  const { t } = useTranslation();
  const theme = useTheme();
  const { width } = useWindowDimensions();

  const barLength = Math.min(width - 48, 320);

  const [available, setAvailable] = useState<boolean | null>(null);
  const [reading, setReading] = useState({ x: 0, y: 0, z: 1 });
  const filtered = useRef({ x: 0, y: 0, z: 1 });
  const wasLevelX = useRef(false);
  const wasLevelY = useRef(false);

  useEffect(() => {
    let mounted = true;
    let sub: ReturnType<typeof Accelerometer.addListener> | undefined;

    Accelerometer.isAvailableAsync().then((ok) => {
      if (!mounted) return;
      setAvailable(ok);
      if (!ok) return;
      Accelerometer.setUpdateInterval(50);
      sub = Accelerometer.addListener(({ x, y, z }) => {
        const f = filtered.current;
        f.x += FILTER_ALPHA * (x - f.x);
        f.y += FILTER_ALPHA * (y - f.y);
        f.z += FILTER_ALPHA * (z - f.z);
        setReading({ x: f.x, y: f.y, z: f.z });
      });
    });

    return () => {
      mounted = false;
      sub?.remove();
    };
  }, []);

  const { x: fx, y: fy, z: fz } = reading;
  const angleX = Math.atan2(fx, Math.hypot(fy, fz)) * RAD; // left-right tilt
  const angleY = Math.atan2(fy, Math.hypot(fx, fz)) * RAD; // front-back tilt

  // Light haptic pulse each time an axis independently reaches level.
  useEffect(() => {
    const levelX = Math.abs(angleX) <= LEVEL_THRESHOLD;
    if (levelX && !wasLevelX.current) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    }
    wasLevelX.current = levelX;
  }, [angleX]);

  useEffect(() => {
    const levelY = Math.abs(angleY) <= LEVEL_THRESHOLD;
    if (levelY && !wasLevelY.current) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    }
    wasLevelY.current = levelY;
  }, [angleY]);

  if (available === false) {
    return (
      <View style={styles.center}>
        <Text variant="bodyMedium" style={{ color: theme.colors.error }}>
          {t("tools.spiritLevelUnavailable")}
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.center}>
      <Text variant="bodyMedium" style={styles.instruction}>
        {t("tools.spiritLevelInstruction")}
      </Text>

      <LevelBar
        orientation="horizontal"
        label={t("tools.spiritLevelAxisX")}
        angle={angleX}
        length={barLength}
        thickness={52}
        headerWidth={barLength}
        theme={theme}
      />

      <LevelBar
        orientation="vertical"
        label={t("tools.spiritLevelAxisY")}
        angle={angleY}
        length={200}
        thickness={52}
        headerWidth={barLength}
        theme={theme}
      />
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
  bar: { alignItems: "center", gap: 8 },
  barHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 4,
  },
  axisLabel: { opacity: 0.7 },
  tube: {
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    overflow: "hidden",
  },
  bubble: { position: "absolute", borderWidth: 2, opacity: 0.9 },
});
