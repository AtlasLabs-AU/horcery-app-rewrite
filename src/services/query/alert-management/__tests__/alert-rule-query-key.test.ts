import { alertRule } from '@/services/query/alert-management/alert-rule';

describe('alert rule query keys', () => {
  it('keeps every paged rule list under the prefix used by cache-first editing', () => {
    const query = alertRule.infiniteList({ ordering: '-created_at' }, [
      { key: 'organization_id', value: 'org-qa' },
    ]);

    expect(alertRule.infiniteList._def).toEqual(['alertRule', 'infiniteList']);
    expect(query.queryKey).toEqual(
      expect.arrayContaining([
        'alertRule',
        'infiniteList',
        'alert-management',
        'fetchInfinite',
      ]),
    );
  });
});
