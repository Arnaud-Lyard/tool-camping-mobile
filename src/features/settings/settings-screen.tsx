import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';
import { Button, SegmentedButtons, Text } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAuth } from '@/auth/auth-context';
import { setLanguage } from '@/i18n/language';
import type { Language } from '@/i18n';

export default function SettingsScreen() {
  const { t, i18n } = useTranslation();
  const { user, signOut } = useAuth();
  const [language, setLang] = useState<Language>(
    i18n.language === 'en' ? 'en' : 'fr',
  );

  const onChange = async (value: string) => {
    const lang = value as Language;
    setLang(lang);
    await setLanguage(lang);
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.content}>
        <Text variant="headlineMedium">{t('parametres.title')}</Text>

        {user ? (
          <Text variant="bodyMedium">
            {t('parametres.loggedInAs', { email: user.email })}
          </Text>
        ) : null}

        <Text variant="labelLarge">{t('parametres.language')}</Text>
        <SegmentedButtons
          value={language}
          onValueChange={onChange}
          buttons={[
            { value: 'fr', label: t('parametres.french') },
            { value: 'en', label: t('parametres.english') },
          ]}
        />

        <Button mode="contained-tonal" onPress={signOut} style={styles.logout}>
          {t('parametres.logout')}
        </Button>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { flex: 1, padding: 24, gap: 16 },
  logout: { marginTop: 'auto' },
});
