import { useInfiniteQuery } from '@tanstack/react-query';
import { useCallback, useMemo, useState } from 'react';

import { queries } from '@acme/services';
import type { IAlertRule } from '@/services/api/alert-management/alert-rule';
import type { IGenericResponse } from '@/services/base/generic-interfaces';
import { useAuthStore } from '@acme/stores/authorization-states';
import type { ServerAlertRule } from '@/domain/alerts/types';

/**
 * The organization's alert rules, newest first, with the application and
 * notification relations embedded (the flat id arrays are never returned —
 * A0 §2.3). Gated on an organization id (the empty-org-id class of bug).
 *
 * `refresh()` is pull-to-refresh with its OWN flag; `refetch()` is a retry.
 */
export function useAlertRules() {
  const organizationID = useAuthStore((s) => s.organizationID);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const query = useInfiniteQuery({
    ...queries.alertRule.infiniteList({ ordering: '-created_at' }, [
      { key: 'organization_id', value: organizationID ?? '' },
      { key: 'deleted_at__isnull', value: 'true' },
      { key: 'include', value: 'alert_application_rules,alert_notification_rules' },
    ]),
    initialPageParam: '1',
    getNextPageParam: (lastPage: IGenericResponse<IAlertRule>) =>
      lastPage.meta?.has_next ? lastPage.meta.next : undefined,
    enabled: !!organizationID,
  });

  const rules = useMemo<ServerAlertRule[]>(
    () =>
      (query.data?.pages ?? []).flatMap((page) =>
        Array.isArray(page.data) ? (page.data as unknown as ServerAlertRule[]) : [],
      ),
    [query.data],
  );

  const refresh = useCallback(async () => {
    setIsRefreshing(true);
    try {
      await query.refetch();
    } finally {
      setIsRefreshing(false);
    }
  }, [query]);

  return {
    rules,
    isLoading: query.isLoading,
    isError: query.isError,
    isFetchingNextPage: query.isFetchingNextPage,
    hasNextPage: query.hasNextPage,
    fetchNextPage: query.fetchNextPage,
    refetch: query.refetch,
    refresh,
    isRefreshing,
    organizationID,
  };
}
