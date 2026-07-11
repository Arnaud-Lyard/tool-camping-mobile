import { useState } from "react";
import { useTranslation } from "react-i18next";
import { BottomNavigation } from "react-native-paper";

import ChecklistScreen from "@/features/checklist/checklist-screen";
import SettingsScreen from "@/features/settings/settings-screen";
import ToolsScreen from "@/features/tools/tools-screen";
import WeatherHomeScreen from "@/features/weather/weather-home-screen";

const renderScene = BottomNavigation.SceneMap({
  weather: WeatherHomeScreen,
  checklist: ChecklistScreen,
  tools: ToolsScreen,
  settings: SettingsScreen,
});

export default function MainTabs() {
  const { t } = useTranslation();
  const [index, setIndex] = useState(0);

  const routes = [
    {
      key: "weather",
      title: t("tabs.weather"),
      focusedIcon: "home-thermometer",
      unfocusedIcon: "home-thermometer-outline",
    },
    {
      key: "checklist",
      title: t("tabs.checklist"),
      focusedIcon: "clipboard-check",
      unfocusedIcon: "clipboard-check-outline",
    },
    {
      key: "tools",
      title: t("tabs.tools"),
      focusedIcon: "tools",
    },
    {
      key: "settings",
      title: t("tabs.settings"),
      focusedIcon: "cog",
      unfocusedIcon: "cog-outline",
    },
  ];

  return (
    <BottomNavigation
      navigationState={{ index, routes }}
      onIndexChange={setIndex}
      renderScene={renderScene}
    />
  );
}
