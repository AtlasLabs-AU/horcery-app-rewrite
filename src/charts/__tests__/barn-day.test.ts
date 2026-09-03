import { DateTime } from 'luxon';

import { barnDayAxisLabels } from '@/charts/barn-day';

const ZONE = 'America/Chicago';

function axisFor(startIso: string): string[] {
  const start = DateTime.fromISO(startIso, { zone: ZONE });
  const end = start.plus({ days: 1 });
  return barnDayAxisLabels(start.toSeconds(), end.toSeconds(), ZONE);
}

describe('barnDayAxisLabels', () => {
  it('prints the ordinary 24-hour barn day at quarter points', () => {
    expect(axisFor('2026-03-06T06:00:00')).toEqual([
      '6 AM',
      '12 PM',
      '6 PM',
      '12 AM',
      '6 AM',
    ]);
  });

  it('keeps labels aligned with a 23-hour spring-forward row', () => {
    expect(axisFor('2026-03-07T06:00:00')).toEqual([
      '6:00 AM',
      '11:45 AM',
      '5:30 PM',
      '11:15 PM',
      '6:00 AM',
    ]);
  });

  it('keeps labels aligned with a 25-hour fall-back row', () => {
    expect(axisFor('2026-10-31T06:00:00')).toEqual([
      '6:00 AM',
      '12:15 PM',
      '6:30 PM',
      '12:45 AM',
      '6:00 AM',
    ]);
  });

  it('refuses an invalid span instead of printing invented times', () => {
    expect(barnDayAxisLabels(10, 10, ZONE)).toEqual([]);
  });
});
