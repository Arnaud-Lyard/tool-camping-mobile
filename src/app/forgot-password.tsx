import { useRouter } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';
import { Button, HelperText, Text, TextInput, useTheme } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';

import { forgotPassword as apiForgotPassword } from '@/api/client';
import { AuthHero } from '@/components/auth-hero';

export default function ForgotPasswordScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const theme = useTheme();
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
    <SafeAreaView style={styles.root} edges={[]}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView bounces={false} contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <AuthHero />

          <View style={[styles.card, { backgroundColor: theme.colors.surface }]}>
            <Text variant="headlineMedium" style={styles.heading}>
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
                  placeholder={t('login.emailPlaceholder')}
                  left={<TextInput.Icon icon="email-outline" />}
                />
                <HelperText type="error" visible={!!error}>
                  {error}
                </HelperText>
                <Button
                  mode="contained"
                  onPress={onSubmit}
                  loading={submitting}
                  disabled={submitting || !email}
                  style={styles.submitBtn}
                  contentStyle={styles.submitContent}>
                  {t('forgotPassword.submit')}
                </Button>
              </>
            )}

            <Button mode="text" onPress={() => router.replace('/login')} style={styles.linkBtn}>
              {t('forgotPassword.backToLogin')}
            </Button>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#0a0e27' },
  flex: { flex: 1 },
  scroll: { flexGrow: 1 },
  card: {
    flex: 1,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 24,
    paddingTop: 32,
    paddingBottom: 40,
    gap: 12,
  },
  heading: { fontWeight: '700', marginBottom: 4 },
  muted: { opacity: 0.7 },
  success: { textAlign: 'center' },
  submitBtn: { marginTop: 4, borderRadius: 14 },
  submitContent: { height: 50 },
  linkBtn: { marginTop: 2 },
});
