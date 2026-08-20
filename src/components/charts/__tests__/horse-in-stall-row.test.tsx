import { render, screen } from '@testing-library/react-native';
import { DateTime } from 'luxon';

import { buildHorseInStallWeek } from '@/charts/horse-in-stall-behavior';
import {
  fragmentedDay,
  inAllDay,
  longTurnout,
  monitorGapMidday,
  noData,
  routineTurnout,
} from '@/charts/fixtures/horse-in-stall-behavior';
import { HorseInStallRow } from '@/components/charts/horse-in-stall-row';
import type { PrometheusRangeSeries } from '@/charts/occupancy-timeline';

const ZONE = 'America/Chicago';
const NOW = DateTime.fromISO('2026-08-19T22:00:00', { zone: ZONE });
const ESTABLISHED = NOW.minus({ months: 6 }).toISO();
const HOUR = 3600;

/** In-stall time accrues steadily and flattens across the turnout window. */
const usualCurve = [
  { fractionOfDay: 0, lowSeconds: 0, highSeconds: 0 },
  { fractionOfDay: 0.35, lowSeconds: 5.8 * HOUR, highSeconds: 7.9 * HOUR },
  { fractionOfDay: 0.5, lowSeconds: 6.5 * HOUR, highSeconds: 8.8 * HOUR },
  { fractionOfDay: 1, lowSeconds: 16.2 * HOUR, highSeconds: 21.9 * HOUR },
];

function row(result: PrometheusRangeSeries[]) {
  const data = buildHorseInStallWeek({
    result,
    selectedDate: NOW.minus({ hours: 6 }).toFormat('yyyy-MM-dd'),
    zone: ZONE,
    now: NOW,
    usualCurve,
    entityCreatedAt: ESTABLISHED,
  });
  return (
    <HorseInStallRow
      entityName="Stall 4 · Apollo"
      data={data}
      averageSeconds={19 * HOUR}
      usualCurve={usualCurve}
      width={340}
    />
  );
}

/**
 * The caption is the whole point of this row: the total says how long, and
 * without the caption a short day reads as a worry rather than as turnout.
 */
describe('HorseInStallRow', () => {
  it('names the turnout window rather than listing when the horse was in', async () => {
    await render(row(routineTurnout(NOW)));
    expect(screen.getByText(/^Out \d/)).toBeTruthy();
    // Never the inverse phrasing — "in from 1 PM" is what the customer assumed.
    expect(screen.queryByText(/^In \d/)).toBeNull();
  });

  it('says the horse never left when it never left', async () => {
    await render(row(inAllDay(NOW)));
    expect(screen.getByText('In all day')).toBeTruthy();
  });

  it('counts the absences once there are too many to read', async () => {
    await render(row(fragmentedDay(NOW)));
    expect(screen.getByText(/^Out \d+ times · first .+, last .+$/)).toBeTruthy();
  });

  it('draws the strip and the plot for an observed day', async () => {
    await render(row(longTurnout(NOW)));
    expect(screen.getByTestId('horse-in-stall-strip')).toBeTruthy();
  });

  /**
   * The two that matter. A four-hour hole in the data looks exactly like four
   * hours of turnout, and an empty response looks like a horse that stayed out
   * — presenting either as fact is the shipping app's bug in a new place.
   */
  it('refuses to call a monitor outage turnout', async () => {
    await render(row(monitorGapMidday(NOW)));
    expect(screen.getByText('Partly recorded — time out is unknown')).toBeTruthy();
    expect(screen.queryByText(/^Out \d/)).toBeNull();
  });

  it('never claims to know where the horse was when nothing came back', async () => {
    await render(row(noData()));
    expect(screen.queryByText(/^Out /)).toBeNull();
    expect(screen.queryByText('In all day')).toBeNull();
  });
});
