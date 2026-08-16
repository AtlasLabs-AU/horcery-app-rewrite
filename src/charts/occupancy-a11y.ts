import { DateTime } from 'luxon';

import { dayLabel, type OccupancyInterval, type OccupancyTimeline } from '@/charts/occupancy-timeline';

export const OCCUPANCY_A11Y_PAGE_SIZE = 20;

export interface OccupancyA11yInterval {
  id: string;
  dayKey: string;
  dayLabel: string;
  seriesId: string;
  label: string;
  interval: OccupancyInterval;
}

export interface OccupancyA11yModel {
  summary: string;
  intervals: OccupancyA11yInterval[];
}

export interface OccupancyA11yPage {
  page: number;
  pageCount: number;
  pageLabel: string;
  intervals: OccupancyA11yInterval[];
}

export interface OccupancyA11yOptions {
  chartLabel?: string;
  seriesLabel?: (seriesId: string) => string;
}

function peopleLabel(count: number): string {
  return `${count} ${count === 1 ? 'person' : 'people'}`;
}

function intervalLabel(
  series: string,
  date: string,
  interval: OccupancyInterval,
  zone: string,
): string {
  const enter = DateTime.fromSeconds(interval.enter, { zone }).toFormat('h:mm a');
  const exit = DateTime.fromSeconds(interval.exit, { zone }).toFormat('h:mm a');
  return `${series}, ${date}, ${enter} to ${exit}, ${peopleLabel(interval.count)}`;
}

/**
 * Native, renderer-independent meaning for a canvas occupancy chart.
 *
 * The complete interval list stays in this plain model. The UI pages it so a
 * worst-case timeline never creates thousands of native accessibility nodes.
 */
export function buildOccupancyA11yModel(
  timeline: OccupancyTimeline,
  options: OccupancyA11yOptions = {},
): OccupancyA11yModel {
  const chartLabel = options.chartLabel ?? 'Occupancy chart';
  const seriesLabel = options.seriesLabel ?? ((id: string) => id);
  const intervals: OccupancyA11yInterval[] = [];

  for (const day of timeline.days) {
    const date = dayLabel(day, timeline.zone);
    for (const series of timeline.series) {
      const label = seriesLabel(series.id);
      for (const interval of series.intervalsByDay[day.key] ?? []) {
        intervals.push({
          id: `${day.key}:${series.id}:${interval.enter}:${interval.exit}`,
          dayKey: day.key,
          dayLabel: date,
          seriesId: series.id,
          label: intervalLabel(label, date, interval, timeline.zone),
          interval,
        });
      }
    }
  }

  intervals.sort((a, b) =>
    a.dayKey.localeCompare(b.dayKey) ||
    a.interval.enter - b.interval.enter ||
    a.seriesId.localeCompare(b.seriesId),
  );

  const count = intervals.length;
  return {
    summary: `${chartLabel}. ${timeline.days.length} days, ${count} ${count === 1 ? 'interval' : 'intervals'}.`,
    intervals,
  };
}

export function occupancyA11yPage(
  model: OccupancyA11yModel,
  requestedPage: number,
  pageSize = OCCUPANCY_A11Y_PAGE_SIZE,
): OccupancyA11yPage {
  if (!Number.isInteger(pageSize) || pageSize < 1) throw new Error('pageSize must be a positive integer');
  const pageCount = Math.max(1, Math.ceil(model.intervals.length / pageSize));
  const page = Math.min(Math.max(0, Math.trunc(requestedPage)), pageCount - 1);
  const start = page * pageSize;
  return {
    page,
    pageCount,
    pageLabel: `Interval page ${page + 1} of ${pageCount}`,
    intervals: model.intervals.slice(start, start + pageSize),
  };
}
