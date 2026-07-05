import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { BottomNavigation } from 'react-native-paper';

import EquipementsScreen from '@/features/equipements/equipements-screen';
import MaintenanceScreen from '@/features/maintenance/maintenance-screen';
import SettingsScreen from '@/features/settings/settings-screen';
import ToolsScreen from '@/features/tools/tools-screen';

const renderScene = BottomNavigation.SceneMap({
  equipements: EquipementsScreen,
  outils: ToolsScreen,
  entretien: MaintenanceScreen,
  parametres: SettingsScreen,
});

export default function MainTabs() {
  const { t } = useTranslation();
  const [index, setIndex] = useState(0);

  // Titles are rebuilt on every render so they follow language changes.
  const routes = [
    { key: 'equipements', title: t('tabs.equipements'), focusedIcon: 'bag-personal' },
    { key: 'outils', title: t('tabs.outils'), focusedIcon: 'tools' },
    { key: 'entretien', title: t('tabs.entretien'), focusedIcon: 'wrench-clock' },
    { key: 'parametres', title: t('tabs.parametres'), focusedIcon: 'cog' },
  ];

  return (
    <BottomNavigation
      navigationState={{ index, routes }}
      onIndexChange={setIndex}
      renderScene={renderScene}
    />
  );
}
