import { useRouter } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { KeyboardAvoidingView, Platform, StyleSheet, View } from 'react-native';
import { Button, HelperText, Text, TextInput } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';

import { forgotPassword as apiForgotPassword } from '@/api/client';

export default function ForgotPasswordScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const onSubmit = async () => {
    setError(null);
    setSubmitting(true);
    try {
      await apiForgotPassword(email.trim());
      setDone(true);
    } catch {
      setError(t('forgotPassword.network'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.content}>
          <Text variant="headlineMedium" style={styles.title}>
            {t('forgotPassword.title')}
          </Text>

          {done ? (
            <Text variant="bodyMedium" style={styles.success}>
              {t('forgotPassword.success')}
            </Text>
          ) : (
            <>
              <Text variant="bodyMedium" style={styles.muted}>
                {t('forgotPassword.description')}
              </Text>
              <TextInput
                label={t('forgotPassword.email')}
                value={email}
                onChangeText={setEmail}
                mode="outlined"
                autoCapitalize="none"
                keyboardType="email-address"
                textContentType="emailAddress"
              />
              <HelperText type="error" visible={!!error}>
                {error}
              </HelperText>
              <Button
                mode="contained"
                onPress={onSubmit}
                loading={submitting}
                disabled={submitting || !email}>
                {t('forgotPassword.submit')}
              </Button>
            </>
          )}

          <Button mode="text" onPress={() => router.replace('/login')}>
            {t('forgotPassword.backToLogin')}
          </Button>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  flex: { flex: 1 },
  content: { flex: 1, justifyContent: 'center', padding: 24, gap: 12 },
  title: { textAlign: 'center', marginBottom: 8 },
  muted: { opacity: 0.7 },
  success: { textAlign: 'center' },
});
