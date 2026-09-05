import { DarkTheme, DefaultTheme, ThemeProvider as NavThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { I18nextProvider } from 'react-i18next';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import 'react-native-reanimated';

import { AuthProvider, useAuth } from '@/contexts/auth-context';
import { ThemePreferenceProvider } from '@/contexts/theme-context';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import i18n, { initI18n } from '@/lib/i18n';

export const unstable_settings = {
  anchor: '(tabs)',
};

SplashScreen.preventAutoHideAsync();

const AppLightTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    primary: Colors.light.tint,
    background: Colors.light.background,
    card: Colors.light.surface,
    text: Colors.light.text,
    border: Colors.light.border,
    notification: Colors.light.error,
  },
};

const AppDarkTheme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    primary: Colors.dark.tint,
    background: Colors.dark.background,
    card: Colors.dark.surface,
    text: Colors.dark.text,
    border: Colors.dark.border,
    notification: Colors.dark.error,
  },
};

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
        <Stack.Screen name="day/[date]" options={{ presentation: 'modal' }} />
        <Stack.Screen name="appointment-new" options={{ presentation: 'modal' }} />
        <Stack.Screen name="appointment/[id]" options={{ presentation: 'modal' }} />
        <Stack.Screen name="client/[id]" />
        <Stack.Screen name="client/new" options={{ presentation: 'modal' }} />
        <Stack.Screen name="services/index" />
        <Stack.Screen name="services/[id]" />
        <Stack.Screen name="services/new" options={{ presentation: 'modal' }} />
        <Stack.Screen name="services/price-option" options={{ presentation: 'modal' }} />
        <Stack.Screen name="staff/index" />
        <Stack.Screen name="staff/[id]" />
        <Stack.Screen name="staff/new" options={{ presentation: 'modal' }} />
        <Stack.Screen name="staff/[id]/availability" />
        <Stack.Screen name="staff/[id]/time-off" />
        <Stack.Screen name="staff/[id]/schedule" />
        <Stack.Screen name="staff/time-off-new" options={{ presentation: 'modal' }} />
        <Stack.Screen name="checkout/[appointmentId]" options={{ presentation: 'modal', headerShown: false }} />
        <Stack.Screen name="orders/index" />
        <Stack.Screen name="orders/[id]" />
        <Stack.Screen name="dashboard/index" />
        <Stack.Screen name="settings/index" />
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
    <NavThemeProvider value={colorScheme === 'dark' ? AppDarkTheme : AppLightTheme}>
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
    <GestureHandlerRootView style={{ flex: 1 }}>
      <I18nextProvider i18n={i18n}>
        <ThemePreferenceProvider>
          <AuthProvider>
            <RootLayoutInner />
          </AuthProvider>
        </ThemePreferenceProvider>
      </I18nextProvider>
    </GestureHandlerRootView>
  );
}
