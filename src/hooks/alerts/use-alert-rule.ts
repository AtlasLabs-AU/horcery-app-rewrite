import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo } from 'react';

import { queries } from '@acme/services';
import { useAuthStore } from '@acme/stores/authorization-states';
import type { ServerAlertRule } from '@/domain/alerts/types';

/**
 * One rule by id — from the Manage Alerts list cache when it is there (the
 * usual case: the user came from the list), else fetched. Rule ID in the
 * route, rule from the cache — never the rule squeezed into the URL
 * (Horcery_Manage_Alerts_Review.md §3.5).
 */
export function useAlertRule(id: string | undefined) {
  const queryClient = useQueryClient();
  const organizationID = useAuthStore((s) => s.organizationID);

  const cached = useMemo<ServerAlertRule | undefined>(() => {
    if (!id) return undefined;
    const lists = queryClient.getQueriesData<{ pages?: { data?: ServerAlertRule[] }[] }>({
      queryKey: ['alert-management', 'alertRule'],
    });
    for (const [, data] of lists) {
      for (const page of data?.pages ?? []) {
        const hit = page.data?.find((r) => r.id === id);
        if (hit) return hit;
      }
    }
    return undefined;
  }, [queryClient, id]);

  const query = useQuery({
    ...queries.alertRule.detail(id ?? '', undefined, [
      { key: 'organization_id', value: organizationID ?? '' },
      { key: 'include', value: 'alert_application_rules,alert_notification_rules' },
    ]),
    enabled: !!id && !cached && !!organizationID,
    select: (response) => response.data as unknown as ServerAlertRule,
  });

  return {
    rule: cached ?? query.data,
    isLoading: !cached && !!id && query.isLoading,
    isError: !cached && query.isError,
    refetch: query.refetch,
  };
}
