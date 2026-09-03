import { QueryClientProvider } from '@tanstack/react-query';
import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import { useFonts } from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, useColorScheme, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { AuthFlow } from '@/components/auth/auth-flow';
import { AppError } from '@/components/app/app-error';
import { LockScreen } from '@/components/auth/lock-screen';
import { SheetBackdropHost } from '@/components/ui/sheet-backdrop';
import { ToastHost } from '@/components/ui/toast';
import { PREVIEWS } from '@/config/previews';
import { useMembershipSync } from '@/hooks/use-membership-sync';
import { useSession } from '@/hooks/use-session';
import { Brand, Fyp } from '@/constants/theme';
import { interFontSources } from '@/constants/fonts';
import { initRemoteConfig } from '@acme/config/firebase-remote-config';
import { queryClient } from '@acme/services';

void SplashScreen.preventAutoHideAsync().catch(() => {
  // A splash-control failure must not prevent the app from rendering.
});

function hideSplashSafely() {
  return SplashScreen.hideAsync().catch(() => {
    // The splash may already be hidden. Rendering must continue either way.
  });
}

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const [fontsLoaded, fontError] = useFonts(interFontSources);

  if (fontError) throw fontError;
  if (!fontsLoaded) return null;

  return (
    /*
      Required on Android for any gesture-handler gesture to receive touches at
      all — the horse page's scrubbing timeline is the first (slice 4c). iOS
      installs a root view automatically, so a missing wrapper here is the
      classic bug that works perfectly on the simulator and does nothing on a
      phone.
    */
    <GestureHandlerRootView style={{ flex: 1 }}>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
          <SessionGate />
        </ThemeProvider>
      </QueryClientProvider>
    </GestureHandlerRootView>
  );
}

export function ErrorBoundary(props: Parameters<typeof AppError>[0]) {
  useEffect(() => {
    // A render error can happen before SessionGate gets a chance to clear the
    // splash. Always reveal the recoverable error screen.
    void hideSplashSafely();
  }, []);

  return <AppError {...props} />;
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
  // Role for the current organization (memberType / memberId) — see the hook.
  useMembershipSync();

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
    if (status !== 'loading') void hideSplashSafely();
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
    <ToastHost>
      <SheetBackdropHost>
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="alerts" />
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
    </ToastHost>
  );
}
