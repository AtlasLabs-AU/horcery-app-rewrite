import { DateTime } from 'luxon';

import {
  buildOccupancyA11yModel,
  OCCUPANCY_A11Y_PAGE_SIZE,
  occupancyA11yPage,
} from '@/charts/occupancy-a11y';
import { FIXTURES, PEOPLE_IN_STALL } from '@/charts/fixtures/people-in-stall';
import { buildOccupancyTimeline } from '@/charts/occupancy-timeline';

function timeline(name: string) {
  const fixture = FIXTURES.find((candidate) => candidate.name === name);
  if (!fixture) throw new Error(`Missing fixture ${name}`);
  return buildOccupancyTimeline({
    result: fixture.result,
    selectedDate: fixture.selectedDate,
    zone: fixture.zone,
    threshold: PEOPLE_IN_STALL.threshold,
    now: DateTime.fromISO(fixture.now, { zone: fixture.zone }),
  });
}

const labels = (id: string) =>
  ({ Human_Interaction: 'With Horse', Human_Presence: 'Without Horse' })[id] ?? id;

describe('occupancy accessibility model', () => {
  it('announces exact interval meaning independently of a renderer', () => {
    const model = buildOccupancyA11yModel(timeline('normal-week'), {
      chartLabel: 'People In Stall chart',
      seriesLabel: labels,
    });

    expect(model.summary).toBe('People In Stall chart. 7 days, 38 intervals.');
    expect(occupancyA11yPage(model, 0).intervals[0]?.label).toMatch(
      /^(With Horse|Without Horse), Aug 08, \d{1,2}:\d{2} [AP]M to \d{1,2}:\d{2} [AP]M, \d+ (person|people)$/,
    );
  });

  it('sorts intervals by day and time rather than renderer series order', () => {
    const model = buildOccupancyA11yModel(timeline('normal-week'), { seriesLabel: labels });
    const order = occupancyA11yPage(model, 0, model.intervalCount).intervals.map(
      (item) => `${item.dayKey}:${item.interval.enter}`,
    );
    expect(order).toEqual([...order].sort());
  });

  it('pages the ceiling without creating thousands of accessibility nodes', () => {
    const model = buildOccupancyA11yModel(timeline('worst-case'), { seriesLabel: labels });
    const first = occupancyA11yPage(model, 0);
    const last = occupancyA11yPage(model, Number.MAX_SAFE_INTEGER);

    expect(model.intervalCount).toBe(6720);
    expect(first.intervals).toHaveLength(OCCUPANCY_A11Y_PAGE_SIZE);
    expect(first.pageLabel).toBe('Interval page 1 of 336');
    expect(last.page).toBe(335);
    expect(last.intervals).toHaveLength(OCCUPANCY_A11Y_PAGE_SIZE);
  });

  it('keeps an empty timeline understandable and pageable', () => {
    const model = buildOccupancyA11yModel(timeline('quiet-week'));
    expect(model.summary).toBe('Occupancy chart. 7 days, 0 intervals.');
    expect(occupancyA11yPage(model, 10)).toEqual({
      page: 0,
      pageCount: 1,
      pageLabel: 'Interval page 1 of 1',
      intervals: [],
    });
  });

  it('rejects invalid page sizes', () => {
    expect(() => occupancyA11yPage(buildOccupancyA11yModel(timeline('quiet-week')), 0, 0)).toThrow(
      'pageSize must be a positive integer',
    );
  });
});
