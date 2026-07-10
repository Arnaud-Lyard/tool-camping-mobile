import { useState, type ComponentType } from "react";
import { useTranslation } from "react-i18next";
import { ScrollView, StyleSheet } from "react-native";
import { Appbar, List } from "react-native-paper";
import { SafeAreaView } from "react-native-safe-area-context";

import BatteryScreen from "./battery-screen";
import CompassScreen from "./compass-screen";
import SpiritLevelScreen from "./spirit-level-screen";

type Tool = "compass" | "spiritLevel" | "battery";

const toolScreens: Record<Tool, ComponentType> = {
  compass: CompassScreen,
  spiritLevel: SpiritLevelScreen,
  battery: BatteryScreen,
};

export default function ToolsScreen() {
  const { t } = useTranslation();
  const [tool, setTool] = useState<Tool | null>(null);

  if (tool) {
    const ToolScreen = toolScreens[tool];
    return (
      <SafeAreaView style={styles.container} edges={[]}>
        <Appbar.Header>
          <Appbar.BackAction onPress={() => setTool(null)} />
          <Appbar.Content title={t(`tools.${tool}`)} />
        </Appbar.Header>
        <ScrollView>
          <ToolScreen />
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={[]}>
      <Appbar.Header>
        <Appbar.Content title={t("tools.title")} />
      </Appbar.Header>
      <List.Section>
        <List.Item
          title={t("tools.compass")}
          left={(props) => <List.Icon {...props} icon="compass" />}
          right={(props) => <List.Icon {...props} icon="chevron-right" />}
          onPress={() => setTool("compass")}
        />
        <List.Item
          title={t("tools.spiritLevel")}
          left={(props) => <List.Icon {...props} icon="spirit-level" />}
          right={(props) => <List.Icon {...props} icon="chevron-right" />}
          onPress={() => setTool("spiritLevel")}
        />
        <List.Item
          title={t("tools.battery")}
          left={(props) => <List.Icon {...props} icon="battery-charging" />}
          right={(props) => <List.Icon {...props} icon="chevron-right" />}
          onPress={() => setTool("battery")}
        />
      </List.Section>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
});
