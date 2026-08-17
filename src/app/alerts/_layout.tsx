import { Stack } from 'expo-router';

import { AlertsPermissionsProvider } from '@/components/alerts/alerts-permissions';

/**
 * The alerts stack. The permission gate lives HERE, once, for every screen
 * below it (architecture §8): read-only roles get a read-only list, no Add,
 * no Save, no Delete — visibly, with a reason.
 */
export default function AlertsLayout() {
  return (
    <AlertsPermissionsProvider>
      <Stack>
        <Stack.Screen name="index" options={{ title: 'Alerts', headerLargeTitle: true }} />
      </Stack>
    </AlertsPermissionsProvider>
  );
}
