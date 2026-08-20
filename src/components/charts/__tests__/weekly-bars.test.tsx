import { fireEvent, render, screen } from '@testing-library/react-native';
import { DateTime } from 'luxon';

import { buildLyingDownWeek, buildLyingDownWeekly } from '@/charts/lying-down';
import { routineWeek } from '@/charts/fixtures/people-in-stall-behavior';
import { WeeklyBars } from '@/components/charts/weekly-bars';
import { VISITS } from '@/components/charts/weekly-day-detail';

const ZONE = 'America/Chicago';
const NOW = DateTime.fromISO('2026-08-19T22:00:00', { zone: ZONE });

function bars() {
  const week = buildLyingDownWeek({
    result: routineWeek(NOW),
    selectedDate: NOW.minus({ hours: 6 }).toFormat('yyyy-MM-dd'),
    zone: ZONE,
    now: NOW,
  });
  const summary = buildLyingDownWeekly(week, {
    usualSecondsByWeekday: Object.fromEntries([1, 2, 3, 4, 5, 6, 7].map((d) => [d, 5700])),
  });
  return <WeeklyBars summary={summary} width={340} zone={ZONE} noun={VISITS} />;
}

/**
 * The tap exists because three marks cannot explain themselves — the hollow
 * today bar, an empty slot, and the average marker (Inakshi, 2026-08-20: "the
 * user won't really know that the hollow chart is because there isn't data").
 * These pin that it opens, closes, and never appears uninvited.
 */
describe('WeeklyBars', () => {
  it('says nothing until a day is tapped', async () => {
    await render(bars());
    expect(screen.queryByTestId('weekly-day-detail')).toBeNull();
  });

  it('opens a day on tap and closes it on a second tap', async () => {
    await render(bars());

    await fireEvent.press(screen.getByTestId('weekly-day-0'));
    expect(screen.getByTestId('weekly-day-detail')).toBeTruthy();

    await fireEvent.press(screen.getByTestId('weekly-day-0'));
    expect(screen.queryByTestId('weekly-day-detail')).toBeNull();
  });

  it('switches to another day rather than stacking panels', async () => {
    await render(bars());
    await fireEvent.press(screen.getByTestId('weekly-day-0'));
    await fireEvent.press(screen.getByTestId('weekly-day-2'));
    expect(screen.getAllByTestId('weekly-day-detail')).toHaveLength(1);
  });

  it('reports today as ongoing, not as a finished total', async () => {
    await render(bars());
    // The last column is always today, and today is never comparable.
    await fireEvent.press(screen.getByTestId('weekly-day-6'));
    expect(screen.getByText(/^Today · Ongoing$/)).toBeTruthy();
  });

  it('carries the same facts in the accessibility label, so the popover is never the only source', async () => {
    await render(bars());
    // A screen-reader user cannot see a panel appear; the button must say it.
    expect(screen.getByTestId('weekly-day-0').props.accessibilityLabel).toMatch(/·/);
  });
});
