import { buildLyingDownWeek, buildLyingDownWeekly, type LyingDownState } from '@/charts/lying-down';
import { typicalWeek } from '@/charts/fixtures/lying-down';
import { BADGE } from '@/components/charts/lying-down-badge';
import { LyingDownWeekRow } from '@/components/charts/lying-down-week-row';
import { render, screen } from '@testing-library/react-native';
import { DateTime } from 'luxon';

const ZONE = 'America/Chicago';
const NOW = DateTime.fromISO('2026-08-19T18:20:00', { zone: ZONE });

function summary() {
  const week = buildLyingDownWeek({
    result: typicalWeek(NOW),
    selectedDate: NOW.toFormat('yyyy-MM-dd'),
    zone: ZONE,
    now: NOW,
  });
  return buildLyingDownWeekly(week, {
    usualSecondsByWeekday: Object.fromEntries(
      [1, 2, 3, 4, 5, 6, 7].map((weekday) => [weekday, 3.5 * 3600]),
    ),
  });
}

describe('LyingDownWeekRow', () => {
  it('renders the weekly summary through the shared adapter', async () => {
    await render(<LyingDownWeekRow horseName="Apollo" summary={summary()} width={340} />);

    expect(screen.getByText('Apollo')).toBeTruthy();
    expect(screen.getByText('Today')).toBeTruthy();
    expect(screen.getByTestId('lying-down-weekly-plot')).toBeTruthy();
  });

  it.each<{
    state: Exclude<LyingDownState, 'ready'>;
    message: string | RegExp;
    blocks: boolean;
  }>([
    { state: 'loading', message: 'Loading lying-down readings', blocks: true },
    { state: 'refreshing', message: 'Updating lying-down readings', blocks: false },
    { state: 'no-data', message: 'No lying-down readings for this period', blocks: true },
    {
      state: 'out-of-stall',
      message: 'The horse was not in the stall during this period',
      blocks: true,
    },
    { state: 'stale', message: /^Last reading .+ ago$/, blocks: false },
    { state: 'partial', message: 'Some readings are missing', blocks: false },
    {
      state: 'unavailable',
      message: 'Lying-down readings are temporarily unavailable',
      blocks: true,
    },
    {
      state: 'unsupported',
      message: 'This monitor does not support lying-down tracking',
      blocks: true,
    },
  ])('presents $state consistently on the weekly view', async ({ state, message, blocks }) => {
    const source = summary();
    const measuredBadge = BADGE[source.verdict].label;
    await render(
      <LyingDownWeekRow horseName="Apollo" summary={{ ...source, state }} width={340} />,
    );

    expect(screen.getByText(message)).toBeTruthy();
    if (blocks) {
      expect(screen.queryByTestId('lying-down-weekly-plot')).toBeNull();
      expect(screen.queryByText(measuredBadge)).toBeNull();
      expect(screen.getByText('—')).toBeTruthy();
    } else {
      expect(screen.getByTestId('lying-down-weekly-plot')).toBeTruthy();
      expect(screen.getByText(measuredBadge)).toBeTruthy();
    }
  });
});
