import { animal } from '@/services/query/animal-management/animal';

describe('animal query keys', () => {
  it('keeps infinite horses under the animal namespace', () => {
    const query = animal.infiniteList({ organization_id: 'org-1' });
    expect(query.queryKey).toEqual(
      expect.arrayContaining(['animal-management', 'animal', 'fetchInfinite']),
    );
    expect(query.queryKey).not.toEqual(expect.arrayContaining(['user-management', 'user']));
  });
});
