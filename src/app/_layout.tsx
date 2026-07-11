import {
  DarkTheme,
  DefaultTheme,
  Stack,
  ThemeProvider,
  useRouter,
  useSegments,
} from 'expo-router';
import { useEffect } from 'react';
import { useColorScheme, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import {
  ActivityIndicator,
  MD3DarkTheme,
  MD3LightTheme,
  PaperProvider,
} from 'react-native-paper';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { AuthProvider, useAuth } from '@/auth/auth-context';

const lightTheme = {
  ...MD3LightTheme,
  colors: {
    ...MD3LightTheme.colors,
    primary: '#185d34',
    onPrimary: '#ffffff',
    primaryContainer: '#b3e5c5',
    onPrimaryContainer: '#0a2218',
    secondary: '#d97706',
    onSecondary: '#ffffff',
    secondaryContainer: '#fde68a',
    onSecondaryContainer: '#92400e',
  },
};

const darkTheme = {
  ...MD3DarkTheme,
  colors: {
    ...MD3DarkTheme.colors,
    primary: '#4ade80',
    onPrimary: '#0a2218',
    primaryContainer: '#185d34',
    onPrimaryContainer: '#b3e5c5',
    secondary: '#d97706',
    onSecondary: '#ffffff',
    secondaryContainer: '#78350f',
    onSecondaryContainer: '#fde68a',
  },
};
import { loadStoredLanguage } from '@/i18n/language';
import '@/i18n';

const PUBLIC_ROUTES = ['login', 'register', 'forgot-password'];

function RootNavigator() {
  const { status } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (status === 'loading') return;
    const onPublic = PUBLIC_ROUTES.includes(segments[0]);
    if (status === 'unauthenticated' && !onPublic) {
      router.replace('/login');
    } else if (status === 'authenticated' && onPublic) {
      router.replace('/');
    }
  }, [status, segments, router]);

  const onPublic = PUBLIC_ROUTES.includes(segments[0] as string);
  // Keep the spinner visible while the redirect hasn't completed yet, to prevent
  // a brief flash of the wrong screen between auth resolution and navigation.
  const isRedirecting =
    status !== 'loading' &&
    ((status === 'unauthenticated' && !onPublic) || (status === 'authenticated' && onPublic));

  if (status === 'loading' || isRedirecting) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator />
      </View>
    );
  }

  return <Stack screenOptions={{ headerShown: false }} />;
}

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  useEffect(() => {
    loadStoredLanguage();
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <PaperProvider theme={isDark ? darkTheme : lightTheme}>
          <ThemeProvider value={isDark ? DarkTheme : DefaultTheme}>
            <AuthProvider>
              <RootNavigator />
            </AuthProvider>
          </ThemeProvider>
        </PaperProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
