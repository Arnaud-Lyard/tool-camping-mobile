import { useState, type ComponentType } from "react";
import { useTranslation } from "react-i18next";
import { StyleSheet } from "react-native";
import { Appbar, List } from "react-native-paper";
import { SafeAreaView } from "react-native-safe-area-context";

import AltimeterScreen from "./altimeter-screen";
import BarometerScreen from "./barometer-screen";
import CompassScreen from "./compass-screen";
import SpiritLevelScreen from "./spirit-level-screen";
import SunMoonScreen from "./sun-moon-screen";

type Tool = "compass" | "spiritLevel" | "barometer" | "altimeter" | "sunMoon";

const toolScreens: Record<Tool, ComponentType> = {
  compass: CompassScreen,
  spiritLevel: SpiritLevelScreen,
  barometer: BarometerScreen,
  altimeter: AltimeterScreen,
  sunMoon: SunMoonScreen,
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
        <ToolScreen />
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
          title={t("tools.barometer")}
          left={(props) => <List.Icon {...props} icon="gauge" />}
          right={(props) => <List.Icon {...props} icon="chevron-right" />}
          onPress={() => setTool("barometer")}
        />
        <List.Item
          title={t("tools.altimeter")}
          left={(props) => <List.Icon {...props} icon="altimeter" />}
          right={(props) => <List.Icon {...props} icon="chevron-right" />}
          onPress={() => setTool("altimeter")}
        />
        <List.Item
          title={t("tools.sunMoon")}
          left={(props) => <List.Icon {...props} icon="weather-sunset" />}
          right={(props) => <List.Icon {...props} icon="chevron-right" />}
          onPress={() => setTool("sunMoon")}
        />
      </List.Section>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
});
