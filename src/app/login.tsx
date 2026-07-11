import { useRouter } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { Button, HelperText, Text, TextInput, useTheme } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ApiError } from '@/api/client';
import { useAuth } from '@/auth/auth-context';
import { AuthHero } from '@/components/auth-hero';

export default function LoginScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { signIn } = useAuth();
  const theme = useTheme();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const onSubmit = async () => {
    setError(null);
    setSubmitting(true);
    try {
      await signIn(email.trim(), password);
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
    <SafeAreaView style={styles.root} edges={[]}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView bounces={false} contentContainerStyle={styles.scroll}>
          <AuthHero />

          <View style={[styles.card, { backgroundColor: theme.colors.surface }]}>
            <Text variant="headlineMedium" style={styles.heading}>
              {t('login.welcomeBack')}
            </Text>

            <View style={styles.fields}>
              <View>
                <Text variant="labelLarge" style={styles.fieldLabel}>
                  {t('login.email')}
                </Text>
                <TextInput
                  value={email}
                  onChangeText={setEmail}
                  mode="outlined"
                  autoCapitalize="none"
                  keyboardType="email-address"
                  textContentType="emailAddress"
                  placeholder={t('login.emailPlaceholder')}
                  left={<TextInput.Icon icon="email-outline" />}
                />
              </View>

              <View>
                <Text variant="labelLarge" style={styles.fieldLabel}>
                  {t('login.password')}
                </Text>
                <TextInput
                  value={password}
                  onChangeText={setPassword}
                  mode="outlined"
                  secureTextEntry={!showPassword}
                  textContentType="password"
                  placeholder="••••••••"
                  left={<TextInput.Icon icon="lock-outline" />}
                  right={
                    <TextInput.Icon
                      icon={showPassword ? 'eye-off' : 'eye'}
                      onPress={() => setShowPassword((v) => !v)}
                    />
                  }
                />
              </View>
            </View>

            <HelperText type="error" visible={!!error}>
              {error}
            </HelperText>

            <View style={styles.forgotRow}>
              <Button
                mode="text"
                compact
                onPress={() => router.push('/forgot-password')}>
                {t('login.forgotPasswordLink')}
              </Button>
            </View>

            <Button
              mode="contained"
              onPress={onSubmit}
              loading={submitting}
              disabled={submitting || !email || !password}
              style={styles.submitBtn}
              contentStyle={styles.submitContent}>
              {t('login.submit')}
            </Button>

            <Button
              mode="text"
              onPress={() => router.push('/register')}
              style={styles.createBtn}>
              {t('login.noAccount')}
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
    gap: 4,
  },
  heading: { fontWeight: '700', marginBottom: 16 },
  fields: { gap: 16, marginTop: 4 },
  fieldLabel: { marginBottom: 6, fontWeight: '600' },
  forgotRow: { alignItems: 'flex-end', marginTop: -4 },
  submitBtn: { marginTop: 8, borderRadius: 14 },
  submitContent: { height: 50 },
  createBtn: { marginTop: 4 },
});
