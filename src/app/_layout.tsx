import { QueryClientProvider } from '@tanstack/react-query';
import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, useColorScheme, View } from 'react-native';

import { AuthFlow } from '@/components/auth/auth-flow';
import { LockScreen } from '@/components/auth/lock-screen';
import { SheetBackdropHost } from '@/components/ui/sheet-backdrop';
import { PREVIEWS } from '@/config/previews';
import { useSession } from '@/hooks/use-session';
import { Brand, Fyp } from '@/constants/theme';
import { initRemoteConfig } from '@acme/config/firebase-remote-config';
import { queryClient } from '@acme/services';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const colorScheme = useColorScheme();

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
        <SessionGate />
      </ThemeProvider>
    </QueryClientProvider>
  );
}

/**
 * Shows the app once there is a session, the sign-in screen when there is not.
 *
 * Remote Config is kicked off here rather than gating render on it: the current
 * app's feature flags read through safe getters that fall back to defaults, so
 * a slow or failed fetch delays nothing.
 */
function SessionGate() {
  const { status } = useSession();

  /**
   * Face ID gate (front-end preview): lock only when a session was RESTORED
   * on open — someone who just typed their password is not asked again.
   */
  const [locked, setLocked] = useState(false);
  const sawSignedOut = useRef(false);
  useEffect(() => {
    if (status === 'signed-out') sawSignedOut.current = true;
    if (status === 'signed-in' && !sawSignedOut.current && PREVIEWS.faceIdUnlock) {
      setLocked(true);
    }
  }, [status]);

  useEffect(() => {
    initRemoteConfig().catch(() => {
      // Safe getters fall back to defaults; nothing to do here.
    });
  }, []);

  useEffect(() => {
    if (status !== 'loading') SplashScreen.hideAsync();
  }, [status]);

  if (status === 'loading') {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: Fyp.pageBackground }}>
        <ActivityIndicator color={Brand.primary} />
      </View>
    );
  }

  if (status !== 'signed-in') return <AuthFlow />;

  if (locked) return <LockScreen onUnlock={() => setLocked(false)} />;

  return (
    /*
      Wraps the whole navigator so an open sheet blurs the ENTIRE app — tab
      bar included — rather than blurring one screen inside a sharp frame.
    */
    <SheetBackdropHost>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen
          name="menu"
          options={{
            presentation: 'transparentModal',
            animation: 'fade',
            contentStyle: { backgroundColor: 'transparent' },
          }}
        />
      </Stack>
    </SheetBackdropHost>
  );
}
