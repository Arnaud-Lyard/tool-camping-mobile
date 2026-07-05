import { useRouter } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { KeyboardAvoidingView, Platform, StyleSheet, View } from 'react-native';
import { Button, HelperText, Text, TextInput } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ApiError } from '@/api/client';
import { useAuth } from '@/auth/auth-context';

export default function LoginScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { signIn } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const onSubmit = async () => {
    setError(null);
    setSubmitting(true);
    try {
      await signIn(email.trim(), password);
      // Navigation handled by the auth gate in _layout.
    } catch (err) {
      if (err instanceof ApiError) {
        setError(
          err.status === 401
            ? t('login.error')
            : t('login.serverError', { status: err.status }),
        );
      } else {
        setError(t('login.networkError'));
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
        <View style={styles.content}>
          <Text variant="headlineMedium" style={styles.title}>
            {t('login.title')}
          </Text>

          <TextInput
            label={t('login.email')}
            value={email}
            onChangeText={setEmail}
            mode="outlined"
            autoCapitalize="none"
            keyboardType="email-address"
            textContentType="emailAddress"
          />

          <TextInput
            label={t('login.password')}
            value={password}
            onChangeText={setPassword}
            mode="outlined"
            secureTextEntry
            textContentType="password"
          />

          <HelperText type="error" visible={!!error}>
            {error}
          </HelperText>

          <Button
            mode="contained"
            onPress={onSubmit}
            loading={submitting}
            disabled={submitting || !email || !password}>
            {t('login.submit')}
          </Button>

          <Button mode="text" onPress={() => router.push('/forgot-password')}>
            {t('login.forgotPasswordLink')}
          </Button>
          <Button mode="text" onPress={() => router.push('/register')}>
            {t('login.noAccount')}
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
  title: { textAlign: 'center', marginBottom: 12 },
});
