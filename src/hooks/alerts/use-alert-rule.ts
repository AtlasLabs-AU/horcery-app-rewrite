import { useQuery, useQueryClient } from '@tanstack/react-query';
import type { QueryClient, QueryKey } from '@tanstack/react-query';
import { useCallback, useSyncExternalStore } from 'react';

import { queries } from '@acme/services';
import { useAuthStore } from '@acme/stores/authorization-states';
import type { ServerAlertRule } from '@/domain/alerts/types';

type AlertRulePages = { pages?: { data?: ServerAlertRule[] }[] };

/**
 * Query-key-factory nests the API key, filters and additional params inside
 * its own key. Walk that public query key rather than relying on one array
 * index, and only reuse a list that was requested for the active organization.
 */
function queryKeyHasOrganization(value: unknown, organizationID: string): boolean {
  if (Array.isArray(value)) {
    return value.some((part) => queryKeyHasOrganization(part, organizationID));
  }
  if (!value || typeof value !== 'object') return false;

  const candidate = value as { key?: unknown; value?: unknown };
  if (candidate.key === 'organization_id' && candidate.value === organizationID) {
    return true;
  }
  return Object.values(value).some((part) =>
    queryKeyHasOrganization(part, organizationID),
  );
}

export function findCachedAlertRule(
  queryClient: QueryClient,
  id: string | undefined,
  organizationID: string | undefined,
): ServerAlertRule | undefined {
  if (!id || !organizationID) return undefined;

  const lists = queryClient.getQueriesData<AlertRulePages>({
    queryKey: queries.alertRule.infiniteList._def,
  });
  for (const [queryKey, data] of lists) {
    if (!queryKeyHasOrganization(queryKey as QueryKey, organizationID)) continue;
    for (const page of data?.pages ?? []) {
      const hit = page.data?.find(
        (rule) =>
          rule.id === id &&
          (!rule.organization_id || rule.organization_id === organizationID),
      );
      if (hit) return hit;
    }
  }
  return undefined;
}

/**
 * One rule by id — from the Manage Alerts list cache when it is there (the
 * usual case: the user came from the list), else fetched. Rule ID in the
 * route, rule from the cache — never the rule squeezed into the URL
 * (Horcery_Manage_Alerts_Review.md §3.5).
 */
export function useAlertRule(id: string | undefined) {
  const queryClient = useQueryClient();
  const organizationID = useAuthStore((s) => s.organizationID);

  const subscribeToCache = useCallback(
    (notify: () => void) => queryClient.getQueryCache().subscribe(notify),
    [queryClient],
  );
  const readCachedRule = useCallback(
    () => findCachedAlertRule(queryClient, id, organizationID ?? undefined),
    [queryClient, id, organizationID],
  );
  // `getQueriesData` alone is only a snapshot. Subscribing makes edits and
  // invalidation/refetches visible to an already-open configure screen.
  const cached = useSyncExternalStore(
    subscribeToCache,
    readCachedRule,
    readCachedRule,
  );
  const waitingForOrganization = !!id && !organizationID;

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
    // A disabled query reports neither loading nor error. While session
    // restoration is still selecting the organization, keep the route in its
    // honest loading state rather than falling through to "Alert not found".
    isLoading: !cached && !!id && (waitingForOrganization || query.isPending),
    isError: !cached && !!organizationID && query.isError,
    refetch: query.refetch,
  };
}
