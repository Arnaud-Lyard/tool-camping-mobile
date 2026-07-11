import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { StyleSheet, View } from "react-native";
import {
  ActivityIndicator,
  Button,
  HelperText,
  Snackbar,
  Switch,
  Text,
  TextInput,
} from "react-native-paper";

import { useAuth } from "@/auth/auth-context";

type Battery = {
  isActive: boolean;
  frequency: number;
  lastReminderAt: string | null;
};

export default function BatteryScreen() {
  const { t } = useTranslation();
  const { authedFetch } = useAuth();

  const [loading, setLoading] = useState(true);
  const [isActive, setIsActive] = useState(false);
  const [frequency, setFrequency] = useState("30");
  const [saving, setSaving] = useState(false);
  const [snack, setSnack] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const data = await authedFetch<Battery>("/api/battery");
        setIsActive(data.isActive);
        setFrequency(String(data.frequency));
      } catch {
        setSnack(t("battery.loadError"));
      } finally {
        setLoading(false);
      }
    })();
  }, [authedFetch, t]);

  const freq = Number(frequency);
  const freqInvalid = !Number.isInteger(freq) || freq < 1 || freq > 365;

  const save = async () => {
    if (freqInvalid) return;
    setSaving(true);
    try {
      await authedFetch("/api/battery", {
        method: "PUT",
        body: JSON.stringify({ isActive, frequency: freq }),
      });
      setSnack(t("battery.saved"));
    } catch {
      setSnack(t("battery.loadError"));
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <ActivityIndicator style={styles.center} />;
  }

  return (
    <View style={styles.content}>
      <Text variant="bodyMedium" style={styles.muted}>
        {t("battery.description")}
      </Text>

      <View style={styles.switchRow}>
        <View style={styles.switchText}>
          <Text variant="titleSmall">{t("battery.activeLabel")}</Text>
          <Text variant="bodySmall" style={styles.muted}>
            {t("battery.activeHelp")}
          </Text>
        </View>
        <Switch value={isActive} onValueChange={setIsActive} />
      </View>

      <View>
        <TextInput
          mode="outlined"
          label={t("battery.frequencyLabel")}
          value={frequency}
          onChangeText={setFrequency}
          keyboardType="number-pad"
          right={<TextInput.Affix text={t("battery.frequencyUnit")} />}
          style={styles.frequency}
        />
        <HelperText type={freqInvalid ? "error" : "info"} visible>
          {freqInvalid ? t("battery.frequencyRange") : t("battery.frequencyHelp")}
        </HelperText>
      </View>

      <Button
        mode="contained"
        onPress={save}
        loading={saving}
        disabled={saving || freqInvalid}
      >
        {t("battery.save")}
      </Button>

      <Snackbar visible={!!snack} onDismiss={() => setSnack("")} duration={2500}>
        {snack}
      </Snackbar>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { marginTop: 32 },
  content: { padding: 24, gap: 16 },
  muted: { opacity: 0.7 },
  switchRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 16,
  },
  switchText: { flex: 1, gap: 2 },
  frequency: { width: 160 },
});
