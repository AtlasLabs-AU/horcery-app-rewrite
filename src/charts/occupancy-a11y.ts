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
  intervalCount: number;
  /** Source stays renderer-independent; only the requested page is materialized. */
  timeline: OccupancyTimeline;
  seriesLabel: (seriesId: string) => string;
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
  const count = timeline.intervalCount;
  return {
    summary: `${chartLabel}. ${timeline.days.length} days, ${count} ${count === 1 ? 'interval' : 'intervals'}.`,
    intervalCount: count,
    timeline,
    seriesLabel,
  };
}

function materializeRange(
  model: OccupancyA11yModel,
  start: number,
  end: number,
): OccupancyA11yInterval[] {
  const result: OccupancyA11yInterval[] = [];
  let position = 0;

  for (const day of model.timeline.days) {
    const date = dayLabel(day, model.timeline.zone);
    const sources = model.timeline.series.map((series) => ({
      series,
      intervals: series.intervalsByDay[day.key] ?? [],
      index: 0,
    }));

    // Each series is already chronological. Merge their heads so paging keeps
    // the exact day/time/series order without allocating or sorting all 6,720
    // accessibility entries on the initial chart render.
    while (true) {
      let next: (typeof sources)[number] | undefined;
      for (const source of sources) {
        const candidate = source.intervals[source.index];
        if (!candidate) continue;
        const current = next?.intervals[next.index];
        if (
          !current ||
          candidate.enter < current.enter ||
          (candidate.enter === current.enter && source.series.id < next!.series.id)
        ) {
          next = source;
        }
      }
      if (!next) break;

      const interval = next.intervals[next.index++]!;
      if (position >= start && position < end) {
        const seriesName = model.seriesLabel(next.series.id);
        result.push({
          id: `${day.key}:${next.series.id}:${interval.enter}:${interval.exit}`,
          dayKey: day.key,
          dayLabel: date,
          seriesId: next.series.id,
          label: intervalLabel(seriesName, date, interval, model.timeline.zone),
          interval,
        });
      }
      position++;
      if (position >= end) return result;
    }
  }

  return result;
}

export function occupancyA11yPage(
  model: OccupancyA11yModel,
  requestedPage: number,
  pageSize = OCCUPANCY_A11Y_PAGE_SIZE,
): OccupancyA11yPage {
  if (!Number.isInteger(pageSize) || pageSize < 1) throw new Error('pageSize must be a positive integer');
  const pageCount = Math.max(1, Math.ceil(model.intervalCount / pageSize));
  const page = Math.min(Math.max(0, Math.trunc(requestedPage)), pageCount - 1);
  const start = page * pageSize;
  return {
    page,
    pageCount,
    pageLabel: `Interval page ${page + 1} of ${pageCount}`,
    intervals: materializeRange(model, start, start + pageSize),
  };
}
