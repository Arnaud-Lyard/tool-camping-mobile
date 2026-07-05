import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';
import { Appbar, List, Text } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';

type Tool = 'boussole' | 'niveau';

export default function ToolsScreen() {
  const { t } = useTranslation();
  const [tool, setTool] = useState<Tool | null>(null);

  if (tool) {
    return (
      <SafeAreaView style={styles.container} edges={[]}>
        <Appbar.Header>
          <Appbar.BackAction onPress={() => setTool(null)} />
          <Appbar.Content title={t(`outils.${tool}`)} />
        </Appbar.Header>
        <View style={styles.placeholder}>
          <Text variant="bodyMedium">{t(`outils.${tool}Placeholder`)}</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={[]}>
      <Appbar.Header>
        <Appbar.Content title={t('outils.title')} />
      </Appbar.Header>
      <List.Section>
        <List.Item
          title={t('outils.boussole')}
          left={(props) => <List.Icon {...props} icon="compass" />}
          right={(props) => <List.Icon {...props} icon="chevron-right" />}
          onPress={() => setTool('boussole')}
        />
        <List.Item
          title={t('outils.niveau')}
          left={(props) => <List.Icon {...props} icon="spirit-level" />}
          right={(props) => <List.Icon {...props} icon="chevron-right" />}
          onPress={() => setTool('niveau')}
        />
      </List.Section>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  placeholder: { flex: 1, alignItems: 'center', justifyContent: 'center' },
});
