import { readFileSync } from 'node:fs';
import { join } from 'node:path';

describe('For You real data wiring', () => {
  it('feeds Review from the event query and exposes all query states', () => {
    const screen = readFileSync(
      join(__dirname, '..', '..', '..', 'app', '(tabs)', 'index.tsx'),
      'utf8',
    );

    expect(screen).toContain('useReviewHistory({ day: now, pageSize: 10 })');
    expect(screen).toContain('events={visibleReviewEvents}');
    expect(screen).toContain('isLoading={reviewQuery.isLoading}');
    expect(screen).toContain('isError={reviewQuery.isError}');
    expect(screen).toContain('reviewQuery.refetch()');
  });
});
