import { DarkTheme, DefaultTheme, ThemeProvider as NavThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { I18nextProvider } from 'react-i18next';
import 'react-native-reanimated';

import { AuthProvider, useAuth } from '@/contexts/auth-context';
import { ThemePreferenceProvider } from '@/contexts/theme-context';
import { useColorScheme } from '@/hooks/use-color-scheme';
import i18n, { initI18n } from '@/lib/i18n';

export const unstable_settings = {
  anchor: '(tabs)',
};

SplashScreen.preventAutoHideAsync();

function RootNavigator() {
  const { session, loading } = useAuth();

  useEffect(() => {
    if (!loading) {
      SplashScreen.hideAsync();
    }
  }, [loading]);

  if (loading) {
    return null;
  }

  return (
    <Stack>
      <Stack.Protected guard={!!session}>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'Modal' }} />
        <Stack.Screen name="appointment-new" options={{ presentation: 'modal', headerShown: false }} />
        <Stack.Screen name="client/[id]" options={{ headerShown: false }} />
        <Stack.Screen name="client/new" options={{ presentation: 'modal', headerShown: false }} />
        <Stack.Screen name="treatments/index" options={{ headerShown: false }} />
        <Stack.Screen name="treatments/[id]" options={{ headerShown: false }} />
        <Stack.Screen name="treatments/new" options={{ presentation: 'modal', headerShown: false }} />
        <Stack.Screen name="staff/index" options={{ headerShown: false }} />
        <Stack.Screen name="staff/[id]" options={{ headerShown: false }} />
        <Stack.Screen name="staff/new" options={{ presentation: 'modal', headerShown: false }} />
        <Stack.Screen name="staff/[id]/availability" options={{ headerShown: false }} />
        <Stack.Screen name="staff/[id]/time-off" options={{ headerShown: false }} />
        <Stack.Screen name="checkout/[appointmentId]" options={{ presentation: 'modal', headerShown: false }} />
        <Stack.Screen name="orders/index" options={{ headerShown: false }} />
        <Stack.Screen name="orders/[id]" options={{ headerShown: false }} />
        <Stack.Screen name="dashboard/index" options={{ headerShown: false }} />
        <Stack.Screen name="settings/index" options={{ headerShown: false }} />
      </Stack.Protected>
      <Stack.Protected guard={!session}>
        <Stack.Screen name="login" options={{ headerShown: false }} />
      </Stack.Protected>
    </Stack>
  );
}

function RootLayoutInner() {
  const colorScheme = useColorScheme();

  return (
    <NavThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <RootNavigator />
      <StatusBar style="auto" />
    </NavThemeProvider>
  );
}

export default function RootLayout() {
  const [i18nReady, setI18nReady] = useState(false);

  useEffect(() => {
    initI18n().finally(() => setI18nReady(true));
  }, []);

  if (!i18nReady) {
    return null;
  }

  return (
    <I18nextProvider i18n={i18n}>
      <ThemePreferenceProvider>
        <AuthProvider>
          <RootLayoutInner />
        </AuthProvider>
      </ThemePreferenceProvider>
    </I18nextProvider>
  );
}
