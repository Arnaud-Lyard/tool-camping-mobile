import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';
import {
  Button,
  Dialog,
  HelperText,
  Portal,
  SegmentedButtons,
  Text,
  TextInput,
} from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ApiError } from '@/api/client';
import { useAuth } from '@/auth/auth-context';
import { setLanguage } from '@/i18n/language';
import type { Language } from '@/i18n';

export default function SettingsScreen() {
  const { t, i18n } = useTranslation();
  const { user, signOut, deleteAccount } = useAuth();
  const [language, setLang] = useState<Language>(
    i18n.language === 'en' ? 'en' : 'fr',
  );

  const [deleteVisible, setDeleteVisible] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');
  const [showDeletePassword, setShowDeletePassword] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const onChange = async (value: string) => {
    const lang = value as Language;
    setLang(lang);
    await setLanguage(lang);
  };

  const openDeleteDialog = () => {
    setDeletePassword('');
    setDeleteError(null);
    setDeleteVisible(true);
  };

  const closeDeleteDialog = () => {
    if (deleting) return;
    setDeleteVisible(false);
  };

  const onConfirmDelete = async () => {
    setDeleteError(null);
    setDeleting(true);
    try {
      await deleteAccount(deletePassword);
    } catch (err) {
      if (err instanceof ApiError && err.message === 'invalid_password') {
        setDeleteError(t('settings.deleteAccountInvalidPassword'));
      } else {
        setDeleteError(t('settings.deleteAccountError'));
      }
      setDeleting(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <Portal>
        <Dialog visible={deleteVisible} onDismiss={closeDeleteDialog}>
          <Dialog.Title>{t('settings.deleteAccountTitle')}</Dialog.Title>
          <Dialog.Content style={styles.dialogContent}>
            <Text variant="bodyMedium">{t('settings.deleteAccountText')}</Text>
            <TextInput
              label={t('settings.deleteAccountPassword')}
              value={deletePassword}
              onChangeText={setDeletePassword}
              mode="outlined"
              secureTextEntry={!showDeletePassword}
              right={
                <TextInput.Icon
                  icon={showDeletePassword ? 'eye-off' : 'eye'}
                  onPress={() => setShowDeletePassword((v) => !v)}
                />
              }
              style={styles.passwordInput}
            />
            <HelperText type="error" visible={!!deleteError}>
              {deleteError}
            </HelperText>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={closeDeleteDialog} disabled={deleting}>
              {t('settings.deleteAccountCancel')}
            </Button>
            <Button
              onPress={onConfirmDelete}
              loading={deleting}
              disabled={deleting || !deletePassword}
              textColor="red">
              {t('settings.deleteAccountConfirm')}
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>

      <View style={styles.content}>
        <Text variant="headlineMedium">{t('settings.title')}</Text>

        {user ? (
          <Text variant="bodyMedium">
            {t('settings.loggedInAs', { email: user.email })}
          </Text>
        ) : null}

        <Text variant="labelLarge">{t('settings.language')}</Text>
        <SegmentedButtons
          value={language}
          onValueChange={onChange}
          buttons={[
            { value: 'fr', label: t('settings.french') },
            { value: 'en', label: t('settings.english') },
          ]}
        />

        <Button mode="contained-tonal" onPress={signOut} style={styles.logout}>
          {t('settings.logout')}
        </Button>

        <Button
          mode="outlined"
          onPress={openDeleteDialog}
          style={styles.deleteBtn}
          textColor="red">
          {t('settings.deleteAccount')}
        </Button>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { flex: 1, padding: 24, gap: 16 },
  logout: { marginTop: 'auto' },
  deleteBtn: { borderColor: 'red' },
  dialogContent: { gap: 8 },
  passwordInput: { marginTop: 8 },
});
