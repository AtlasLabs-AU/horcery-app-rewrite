import { useQuery } from '@tanstack/react-query';

import { queries } from '@acme/services';
import { useAuthStore } from '@acme/stores/authorization-states';

/**
 * The organization's IANA timezone, on its own.
 *
 * Any screen that shows a time or a day boundary needs this, and it must not
 * pay for the rest of For You to get it: `useForYouData` fires the weather,
 * device, location, snapshot and review queries too. This is the *same* query
 * key, so on a warm cache it costs nothing and on a cold one it costs the one
 * request the page actually needs.
 *
 * Undefined means "use the device zone" — the current app's fallback, and what
 * `useOrganizationNow` does with a nullish zone.
 */
export function useOrganizationTimezone(): string | undefined {
  const organizationID = useAuthStore((s) => s.organizationID);

  const { data } = useQuery({
    ...queries.organization.detail(organizationID ?? ''),
    enabled: !!organizationID,
  });

  return data?.data?.timezone ?? undefined;
}
