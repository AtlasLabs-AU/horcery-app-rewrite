import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook } from '@testing-library/react-native';
import type { PropsWithChildren } from 'react';

import { queries } from '@acme/services';
import type { ServerAlertRule } from '@/domain/alerts/types';
import {
  findCachedAlertRule,
  useAlertRule,
} from '@/hooks/alerts/use-alert-rule';

let mockOrganizationID: string | undefined;

jest.mock('@acme/services', () => {
  const infiniteList = Object.assign(
    (filters: unknown, additionalParams: unknown, query?: unknown) => ({
      queryKey: [
        'alertRule',
        'infiniteList',
        'alert-management',
        'alertRule',
        'fetchInfinite',
        filters,
        additionalParams,
        query,
      ],
      queryFn: jest.fn(),
    }),
    { _def: ['alertRule', 'infiniteList'] },
  );

  return {
    queries: {
      alertRule: {
        infiniteList,
        detail: (id: string, filters: unknown, additionalParams: unknown) => ({
          queryKey: ['alertRule', 'detail', id, filters, additionalParams],
          queryFn: jest.fn(),
        }),
      },
    },
  };
});

jest.mock('@acme/stores/authorization-states', () => ({
  useAuthStore: (
    selector: (state: { organizationID: string | undefined }) => unknown,
  ) => selector({ organizationID: mockOrganizationID }),
}));

const listKey = (organizationID: string) =>
  queries.alertRule.infiniteList({ ordering: '-created_at' }, [
    { key: 'organization_id', value: organizationID },
    { key: 'deleted_at__isnull', value: 'true' },
    {
      key: 'include',
      value: 'alert_application_rules,alert_notification_rules',
    },
  ]).queryKey;

const rule = (
  threshold: number,
  organizationID = 'org-qa',
): ServerAlertRule => ({
  id: 'rule-1',
  alert_type: 'temperature',
  organization_id: organizationID,
  threshold_value: threshold,
});

function putRule(
  queryClient: QueryClient,
  value: ServerAlertRule,
  organizationID = value.organization_id ?? 'org-qa',
) {
  queryClient.setQueryData(listKey(organizationID), {
    pages: [{ data: [value] }],
    pageParams: ['1'],
  });
}

function makeClient() {
  return new QueryClient({
    // No GC timers: the unit test owns this short-lived in-memory cache and
    // should leave Jest with no handles after the provider unmounts.
    defaultOptions: { queries: { retry: false, gcTime: Infinity } },
  });
}

describe('findCachedAlertRule', () => {
  it('only reuses a list cached for the active organization', () => {
    const queryClient = makeClient();
    putRule(queryClient, rule(10, 'org-other'), 'org-other');

    expect(findCachedAlertRule(queryClient, 'rule-1', 'org-qa')).toBeUndefined();
    expect(findCachedAlertRule(queryClient, 'rule-1', 'org-other')).toMatchObject({
      threshold_value: 10,
    });
  });
});

describe('useAlertRule', () => {
  it('stays loading while session restoration has not selected an organization', async () => {
    mockOrganizationID = undefined;
    const queryClient = makeClient();
    const wrapper = ({ children }: PropsWithChildren) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );

    const { result } = await renderHook(() => useAlertRule('rule-1'), { wrapper });

    expect(result.current).toMatchObject({
      rule: undefined,
      isLoading: true,
      isError: false,
    });
  });

  it('reacts when an already-open rule changes in the list cache', async () => {
    mockOrganizationID = 'org-qa';
    const queryClient = makeClient();
    putRule(queryClient, rule(10));
    const wrapper = ({ children }: PropsWithChildren) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );

    const { result } = await renderHook(() => useAlertRule('rule-1'), { wrapper });
    expect(result.current.rule?.threshold_value).toBe(10);

    await act(async () => {
      putRule(queryClient, rule(20));
    });

    expect(result.current.rule?.threshold_value).toBe(20);
  });
});
