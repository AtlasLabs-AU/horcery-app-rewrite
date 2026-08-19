import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';

import { queries } from '@acme/services';
import { resolveDescriptors } from '@/domain/alerts/descriptors';
import type { AlertTypeDescriptor, ServerAlertType, Units } from '@/domain/alerts/types';
import { useAuthStore } from '@acme/stores/authorization-states';

/** Alert types change rarely; an hour of freshness is plenty. */
const TYPES_STALE_MS = 60 * 60 * 1000;

export interface AlertTypesResult {
  descriptors: AlertTypeDescriptor[];
  byId: Map<string, AlertTypeDescriptor>;
  bySlug: Map<string, AlertTypeDescriptor>;
  isLoading: boolean;
  isError: boolean;
  refetch: () => Promise<unknown>;
}

/**
 * The server's alert types, resolved into descriptors once per fetch. Every
 * page follows pagination (`listComplete`), so a type cannot be silently
 * dropped. `overrideTypes` lets sample mode supply the A0 fixture when the
 * API is unavailable in a preview.
 *
 * Resolved in the user's units, because a descriptor's threshold presets are
 * in DISPLAY units (see `domain/alerts/units.ts`). Reading the preference here
 * means every screen gets the same scale without asking for it.
 */
export function useAlertTypes(overrideTypes?: ServerAlertType[] | null): AlertTypesResult {
  const isMetric = useAuthStore((s) => s.userPreferences?.isMetric);
  const units: Units = isMetric ? 'metric' : 'imperial';

  const query = useQuery({
    ...queries.alertType.listComplete({ ordering: 'name' }, [
      { key: 'deleted_at__isnull', value: 'true' },
    ]),
    staleTime: TYPES_STALE_MS,
    enabled: !overrideTypes,
  });

  const resolved = useMemo(() => {
    const source = overrideTypes ?? ((query.data ?? []) as ServerAlertType[]);
    return resolveDescriptors(source, units);
  }, [overrideTypes, query.data, units]);

  return {
    descriptors: resolved.list,
    byId: resolved.byId,
    bySlug: resolved.bySlug,
    isLoading: !overrideTypes && query.isLoading,
    isError: !overrideTypes && query.isError,
    refetch: query.refetch,
  };
}
