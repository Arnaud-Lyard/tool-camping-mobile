import { useState } from "react";
import { useTranslation } from "react-i18next";
import { BottomNavigation } from "react-native-paper";

import EquipmentScreen from "@/features/equipment/equipment-screen";
import MaintenanceScreen from "@/features/maintenance/maintenance-screen";
import SettingsScreen from "@/features/settings/settings-screen";
import ToolsScreen from "@/features/tools/tools-screen";

const renderScene = BottomNavigation.SceneMap({
  equipment: EquipmentScreen,
  tools: ToolsScreen,
  maintenance: MaintenanceScreen,
  settings: SettingsScreen,
});

export default function MainTabs() {
  const { t } = useTranslation();
  const [index, setIndex] = useState(0);

  // Titles are rebuilt on every render so they follow language changes.
  const routes = [
    {
      key: "equipment",
      title: t("tabs.equipment"),
      focusedIcon: "bag-personal",
    },
    { key: "tools", title: t("tabs.tools"), focusedIcon: "tools" },
    {
      key: "maintenance",
      title: t("tabs.maintenance"),
      focusedIcon: "wrench-clock",
    },
    { key: "settings", title: t("tabs.settings"), focusedIcon: "cog" },
  ];

  return (
    <BottomNavigation
      navigationState={{ index, routes }}
      onIndexChange={setIndex}
      renderScene={renderScene}
    />
  );
}
