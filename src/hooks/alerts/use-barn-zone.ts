import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';

import { queries } from '@acme/services';
import { useAuthStore } from '@acme/stores/authorization-states';
import { resolveZone } from '@/domain/alerts/window';

/**
 * The barn's IANA timezone from the organization record — the zone every
 * alert window is authored and read in. Falls back to the device zone and
 * SAYS SO (`fallback: true`) when the organization has none.
 */
export function useBarnZone(): { zone: string; fallback: boolean; isLoading: boolean } {
  const organizationID = useAuthStore((s) => s.organizationID);
  const query = useQuery({
    ...queries.organization.detail(organizationID ?? ''),
    enabled: !!organizationID,
  });
  const timezone = query.data?.data?.timezone;
  const resolved = useMemo(() => resolveZone(timezone), [timezone]);
  return { ...resolved, isLoading: query.isLoading };
}
