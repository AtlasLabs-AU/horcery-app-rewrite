import { createContext, useContext, useMemo, type ReactNode } from 'react';

import { useAuthStore } from '@acme/stores/authorization-states';
import { canManageAlerts, permissionReason } from '@/domain/alerts/permissions';
import type { AlertPermissions } from '@/domain/alerts/types';

interface AlertsPermissionsValue extends AlertPermissions {
  /** The sentence shown where a control is disabled for lack of permission. */
  reason: string;
}

const AlertsPermissionsContext = createContext<AlertsPermissionsValue | null>(null);

/**
 * The permission gate for the whole alerts stack, provided ONCE at the route
 * layout (architecture §8) and read by every screen and control below it.
 * `memberType` is per-organization; the store updates it on org switch and
 * this recomputes.
 */
export function AlertsPermissionsProvider({ children }: { children: ReactNode }) {
  const memberType = useAuthStore((s) => s.memberType);
  const value = useMemo<AlertsPermissionsValue>(
    () => ({ ...canManageAlerts(memberType), reason: permissionReason(memberType) }),
    [memberType],
  );
  return <AlertsPermissionsContext.Provider value={value}>{children}</AlertsPermissionsContext.Provider>;
}

const READ_ONLY: AlertsPermissionsValue = {
  view: true,
  create: false,
  edit: false,
  delete: false,
  reason: permissionReason(null),
};

/** Read-only when rendered outside the provider (component tests). */
export function useAlertsPermissions(): AlertsPermissionsValue {
  return useContext(AlertsPermissionsContext) ?? READ_ONLY;
}
