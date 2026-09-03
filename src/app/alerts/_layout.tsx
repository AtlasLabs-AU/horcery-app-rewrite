import { router, Stack } from 'expo-router';
import { Pressable, StyleSheet } from 'react-native';

import { AlertsPermissionsProvider } from '@/components/alerts/alerts-permissions';
import { Icon } from '@/components/ui/icon';
import { font } from '@/constants/fonts';
import { space } from '@/constants/tokens';
import { useTokens } from '@/hooks/use-tokens';

/**
 * The alerts stack. The permission gate lives HERE, once, for every screen
 * below it (architecture §8): read-only roles get a read-only list, no Add,
 * no Save, no Delete — visibly, with a reason.
 *
 * The stack is pushed OVER the tabs from More / Horse Details / For You, so
 * its first screen needs its own way back — a nested stack's first route
 * gets no native back button. Found the hard way (Inakshi, 2026-08-17: "I
 * can't even leave the page").
 */
export default function AlertsLayout() {
  const { colors } = useTokens();
  return (
    <AlertsPermissionsProvider>
      <Stack
        screenOptions={{
          headerTitleStyle: { fontFamily: font.semibold },
          headerLargeTitleStyle: { fontFamily: font.bold },
        }}>
        <Stack.Screen name="new" options={{ title: 'New alert' }} />
        <Stack.Screen name="configure" options={{ title: 'Alert' }} />
        {/* The targets picker is a FORM SHEET so it keeps a native header (search + Done). */}
        <Stack.Screen
          name="targets"
          options={{
            presentation: 'formSheet',
            sheetAllowedDetents: [0.9],
            sheetGrabberVisible: true,
            headerShown: true,
          }}
        />
        <Stack.Screen
          name="index"
          options={{
            title: 'Alerts',
            headerLargeTitle: true,
            headerLeft: () => (
              <Pressable
                onPress={() => router.back()}
                hitSlop={12}
                accessibilityRole="button"
                accessibilityLabel="Back"
                testID="alerts-back"
                style={styles.back}>
                <Icon name="back" size={20} color={colors.foreground} />
              </Pressable>
            ),
          }}
        />
      </Stack>
    </AlertsPermissionsProvider>
  );
}

const styles = StyleSheet.create({
  back: { minWidth: 44, minHeight: 44, justifyContent: 'center', paddingRight: space.sm },
});
