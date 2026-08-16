import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';

import { queries } from '@acme/services';
import { useAuthStore } from '@acme/stores/authorization-states';

export interface HorseGroup {
  id: string;
  name: string;
}

/**
 * The organization's complete horse-group set for the filter chips. Unlike
 * the current app's fixed `page_size: 100`, this follows pagination so a
 * large organization cannot silently lose groups.
 */
export function useHorseGroups() {
  const organizationID = useAuthStore((s) => s.organizationID);
  const enabled = !!organizationID;

  const query = useQuery({
    ...queries.animalGroup.listComplete({
      organization_id: organizationID ?? '',
      deleted_at__isnull: true,
      page_size: 100,
    }),
    enabled,
  });

  const groups = useMemo<HorseGroup[]>(
    () =>
      (query.data ?? [])
        .filter((group) => !group.deleted_at)
        .map((group) => ({ id: group.id, name: group.group_name })),
    [query.data],
  );

  return {
    groups,
    isLoading: query.isPending && enabled,
    isError: query.isError,
    refetch: query.refetch,
  };
}
