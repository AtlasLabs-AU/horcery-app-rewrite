import { render, screen } from '@testing-library/react-native';
import { DateTime } from 'luxon';

import { buildPeopleInStallWeek } from '@/charts/people-in-stall-behavior';
import {
  barelyVisited,
  busyDay,
  monitorGapMidday,
  noData,
  routineWeek,
} from '@/charts/fixtures/people-in-stall-behavior';
import { PeopleInStallRow } from '@/components/charts/people-in-stall-row';
import type { PrometheusRangeSeries } from '@/charts/occupancy-timeline';

const ZONE = 'America/Chicago';
const NOW = DateTime.fromISO('2026-08-19T22:00:00', { zone: ZONE });
const ESTABLISHED = NOW.minus({ months: 6 }).toISO();

/** Human presence clusters at feed times, so the usual curve steepens there. */
const usualCurve = [
  { fractionOfDay: 0, lowSeconds: 0, highSeconds: 0 },
  { fractionOfDay: 0.08, lowSeconds: 1200, highSeconds: 2000 },
  { fractionOfDay: 0.5, lowSeconds: 2600, highSeconds: 4400 },
  { fractionOfDay: 1, lowSeconds: 4300, highSeconds: 7100 },
];

function row(result: PrometheusRangeSeries[]) {
  const data = buildPeopleInStallWeek({
    result,
    selectedDate: NOW.minus({ hours: 6 }).toFormat('yyyy-MM-dd'),
    zone: ZONE,
    now: NOW,
    usualCurve,
    stallCreatedAt: ESTABLISHED,
  });
  return (
    <PeopleInStallRow
      stallName="Stall 4 · Apollo"
      data={data}
      averageSeconds={95 * 60}
      usualCurve={usualCurve}
      width={340}
    />
  );
}

describe('PeopleInStallRow', () => {
  it('names the stall first, because people visit a stall', async () => {
    await render(row(routineWeek(NOW)));
    // The horse in a stall can change; the visits belong to the stall.
    expect(screen.getByText('Stall 4 · Apollo')).toBeTruthy();
  });

  it('captions a normal day with real clock times, never dayparts', async () => {
    await render(row(routineWeek(NOW)));
    const caption = screen.getByText(/^3 visits · /);
    expect(caption).toBeTruthy();
    expect(caption.props.children).toMatch(/\d{1,2}:\d{2} (AM|PM)/);
    expect(screen.queryByText(/morning|midday|afternoon|evening/i)).toBeNull();
  });

  it('summarises a busy stall instead of listing every visit', async () => {
    // ~27 visits is the top of the measured real range; listing them all would
    // overflow the row on exactly the stalls that get the most attention.
    await render(row(busyDay(NOW)));
    expect(screen.getByText(/^\d+ visits · first .+, last .+$/)).toBeTruthy();
  });

  it('withholds the verdict on a barely-visited stall rather than judging it', async () => {
    // The row is plainly quiet and the caption says so, but "Low" rests on the
    // unowned 25% threshold, so it is not said (Inakshi, 2026-08-23).
    await render(row(barelyVisited(NOW)));
    expect(screen.queryByText('Low')).toBeNull();
    expect(screen.getByText(/visit/)).toBeTruthy();
  });

  it('says the monitor was offline rather than counting the gap as quiet', async () => {
    await render(row(monitorGapMidday(NOW)));
    // "Nobody visited" and "we were not watching" are different claims.
    expect(screen.getByText(/^Monitor offline .+ visits then are unknown$/)).toBeTruthy();
  });

  it('never renders an absent monitor as an empty stall', async () => {
    await render(row(noData));
    expect(screen.getByText('No data')).toBeTruthy();
    expect(screen.queryByText(/^0 visits/)).toBeNull();
    expect(screen.queryByText('No visits recorded')).toBeNull();
  });
});
