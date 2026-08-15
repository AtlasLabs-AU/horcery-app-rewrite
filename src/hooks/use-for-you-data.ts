import { useIsFetching, useQuery, useQueryClient } from '@tanstack/react-query';
import { DateTime } from 'luxon';
import { useCallback, useMemo } from 'react';

import { deviceSubTypeMap } from '@acme/config/constants/device-sub-types';
import { deviceTypeMap } from '@acme/config/constants/device-type';
import { queries } from '@acme/services';
import { useAuthStore } from '@acme/stores/authorization-states';
import { useOrganizationNow } from '@/hooks/use-organization-now';

/**
 * Everything the For You page reads, in one place.
 *
 * Three fixes to the current app's version live here:
 *
 * **B2 — no requests before we know the organization.** The current screen
 * guards its `location` query with `enabled: !!organizationID` but not the
 * three `deviceInstance` queries beside it, so every cold open fires three
 * requests with `organization_id: ''` and caches the answers under a
 * meaningless key. All queries here share one guard.
 *
 * **Three device queries collapse into one.** The current app asks the same
 * endpoint three times to learn whether the org has stall monitors, feed
 * scales and water scales. One request returns the devices; the three answers
 * are derived from it.
 *
 * **B1 — a refresh indicator that actually appears.** The current app computes
 * `isRefreshing` by comparing each cached query's full key against a `._def`
 * prefix with `JSON.stringify` equality. A full key always carries extra
 * segments, so the comparison is never true and the spinner never shows — the
 * refresh silently works while the user pulls again. `useIsFetching` with real
 * key prefixes does what that code intended.
 */
export function useForYouData() {
  const queryClient = useQueryClient();
  const organizationID = useAuthStore((s) => s.organizationID);
  const organizationName = useAuthStore((s) => s.organizationName);
  const enabled = !!organizationID;

  const { data: organization } = useQuery({
    ...queries.organization.detail(organizationID ?? ''),
    enabled,
  });

  /**
   * Every organization the user belongs to, for the Switch menu.
   *
   * `useSession` picks the newest one at sign-in, which is not necessarily the
   * one the customer works in — a fresh session landed on an empty "Org 150"
   * rather than "Mobile Dev Testing". The current app persists the chosen
   * organization; so does this, through the same auth store.
   */
  const { data: organizationList } = useQuery({
    ...queries.organization.list({ ordering: '-created_at' }),
  });

  const setOrganization = useAuthStore((s) => s.setOrganization);

  const organizations = useMemo(
    () => organizationList?.data ?? [],
    [organizationList],
  );

  const selectOrganization = useCallback(
    (id: string) => {
      const next = organizations.find((org) => org.id === id);
      if (next) setOrganization(next.id, next.name ?? null);
    },
    [organizations, setOrganization],
  );

  const { data: locationData } = useQuery({
    ...queries.location.list(undefined, [
      { key: 'organization', value: organizationID ?? '' },
    ]),
    enabled,
  });

  /**
   * The org's devices, in full; the three "has X" answers are derived from it.
   *
   * `listComplete` rather than `list` because these answers decide whether a
   * whole card renders. `list` returns one server page, so an organization
   * whose only feed scale sorts onto page 2 loses its Feed Intake card
   * entirely — a wrong answer, not a partial one. For an org that fits in one
   * page (most of them) this is still exactly one request; larger orgs page
   * until `meta.page_count` is satisfied.
   */
  const { data: deviceData } = useQuery({
    ...queries.deviceInstance.listComplete({
      organization_id: organizationID ?? '',
      deleted_at__isnull: true,
    }),
    enabled,
  });

  const devices = useMemo(() => {
    const list = deviceData ?? [];
    const hasType = (type?: number, subType?: number) =>
      list.some(
        (device) =>
          device.device_type === type &&
          (subType === undefined || device.device_sub_type === subType),
      );

    return {
      hasStallDevices: hasType(deviceTypeMap.smd?.type),
      hasFeedDevices: hasType(
        deviceTypeMap.intScale?.type,
        deviceSubTypeMap.feed?.type,
      ),
      hasWaterDevices: hasType(
        deviceTypeMap.intScale?.type,
        deviceSubTypeMap.water?.type,
      ),
      hasLocations: (locationData?.meta?.count ?? 0) > 0,
    };
  }, [deviceData, locationData]);

  /**
   * Local time in the organization's timezone. Ticks on the minute — it used
   * to be `useMemo`'d and froze at whatever time the page mounted, so a barn's
   * clock stopped (review, 2026-08-15).
   */
  const timezone = organization?.data?.timezone;
  const now = useOrganizationNow(timezone);
  const localTime = useMemo(() => now.toFormat('h:mm a').toLowerCase(), [now]);

  /**
   * The prefixes a refresh invalidates. These are real key prefixes, so React
   * Query's own prefix matching applies — both for invalidation and for the
   * fetching check below.
   */
  const refreshKeys = useMemo(
    () => [
      queries.organization.detail._def,
      queries.location.list._def,
      queries.deviceInstance.listComplete._def,
      queries.stall.list._def,
      queries.animal.list._def,
      queries.event.list._def,
      queries.alertRule.list._def,
      queries.animalStall.list._def,
    ],
    [],
  );

  /**
   * One hook call with a predicate — a `useIsFetching` per key would be a
   * hooks-rules violation, and the predicate expresses "is any For You query
   * in flight" directly.
   */
  const isRefreshing =
    useIsFetching({
      predicate: (query) =>
        refreshKeys.some((prefix) =>
          prefix.every((segment, index) => query.queryKey[index] === segment),
        ),
    }) > 0;

  const refresh = useCallback(() => {
    refreshKeys.forEach((queryKey) => {
      queryClient.invalidateQueries({ queryKey, refetchType: 'active' });
    });
  }, [queryClient, refreshKeys]);

  return {
    organizationID,
    organizationName: organizationName ?? organization?.data?.name ?? '',
    timezone,
    localTime,
    devices,
    organizations,
    selectOrganization,
    isRefreshing,
    refresh,
  };
}
