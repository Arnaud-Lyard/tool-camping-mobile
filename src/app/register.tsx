import { useRouter } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet } from 'react-native';
import {
  Button,
  Checkbox,
  HelperText,
  SegmentedButtons,
  Snackbar,
  Text,
  TextInput,
} from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ApiError, register as apiRegister } from '@/api/client';
import type { Language } from '@/i18n';

const ERROR_KEYS: Record<string, string> = {
  invalid_email: 'register.errors.invalidEmail',
  password_too_short: 'register.errors.passwordTooShort',
  email_taken: 'register.errors.emailTaken',
};

export default function RegisterScreen() {
  const { t, i18n } = useTranslation();
  const router = useRouter();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [language, setLanguage] = useState<Language>(i18n.language === 'en' ? 'en' : 'fr');
  const [agree, setAgree] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [snack, setSnack] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const mismatch = confirm.length > 0 && password !== confirm;
  const canSubmit =
    !!email && password.length >= 6 && password === confirm && agree && !submitting;

  const onSubmit = async () => {
    setError(null);
    if (!canSubmit) return;
    setSubmitting(true);
    try {
      await apiRegister(email.trim(), password, language);
      setSnack(t('register.success'));
      setTimeout(() => router.replace('/login'), 1200);
    } catch (err) {
      if (err instanceof ApiError) {
        setError(t(ERROR_KEYS[err.message] ?? 'register.errors.generic'));
      } else {
        setError(t('register.errors.network'));
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <Text variant="headlineMedium" style={styles.title}>
            {t('register.title')}
          </Text>

          <TextInput
            label={t('register.email')}
            value={email}
            onChangeText={setEmail}
            mode="outlined"
            autoCapitalize="none"
            keyboardType="email-address"
            textContentType="emailAddress"
          />
          <TextInput
            label={t('register.password')}
            value={password}
            onChangeText={setPassword}
            mode="outlined"
            secureTextEntry
            textContentType="newPassword"
          />
          <TextInput
            label={t('register.confirmPassword')}
            value={confirm}
            onChangeText={setConfirm}
            mode="outlined"
            secureTextEntry
            error={mismatch}
          />
          <HelperText type="error" visible={mismatch}>
            {t('register.errors.passwordMismatch')}
          </HelperText>

          <Text variant="labelLarge">{t('register.language')}</Text>
          <SegmentedButtons
            value={language}
            onValueChange={(v) => setLanguage(v as Language)}
            buttons={[
              { value: 'fr', label: 'Français' },
              { value: 'en', label: 'English' },
            ]}
          />

          <Checkbox.Item
            label={t('register.agreeTerms')}
            status={agree ? 'checked' : 'unchecked'}
            onPress={() => setAgree((a) => !a)}
            position="leading"
            style={styles.terms}
          />

          <HelperText type="error" visible={!!error}>
            {error}
          </HelperText>

          <Button mode="contained" onPress={onSubmit} loading={submitting} disabled={!canSubmit}>
            {t('register.submit')}
          </Button>
          <Button mode="text" onPress={() => router.replace('/login')}>
            {t('register.haveAccount')}
          </Button>
        </ScrollView>
      </KeyboardAvoidingView>

      <Snackbar visible={!!snack} onDismiss={() => setSnack('')} duration={3000}>
        {snack}
      </Snackbar>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  flex: { flex: 1 },
  content: { padding: 24, gap: 10 },
  title: { textAlign: 'center', marginBottom: 8 },
  terms: { paddingHorizontal: 0 },
});
