import { DateTime } from 'luxon';

import { FIXTURES, PEOPLE_IN_STALL, type Fixture } from '@/charts/fixtures/people-in-stall';
import { buildOccupancyTimeline, type OccupancyTimeline } from '@/charts/occupancy-timeline';

/**
 * The scenarios both renderers draw. Each is a fixture from the app's chart
 * domain layer, already turned into an OccupancyTimeline — so the renderers
 * receive identical, pre-computed input and the comparison is on drawing alone.
 *
 * `noData` maps to `timeline: null`: the renderer must show the overlay, not
 * seven empty rows (that is `quiet-week`, which arrives as a real timeline).
 */
export interface Scenario {
  name: string;
  purpose: string;
  status: 'data' | 'no-data' | 'loading' | 'error';
  timeline: OccupancyTimeline | null;
  intervalCount: number;
  /** How long the domain layer took to build it — renderer-independent cost. */
  buildMs: number;
}

/** Legacy series presentation, from human-in-stall-prometheus-chart-widget. */
export const SERIES = {
  Human_Interaction: { label: 'With Horse', color: '#0369A1' },
  Human_Presence: { label: 'Without Horse', color: '#7DD3FC' },
} as const;

export const seriesLabel = (id: string) => (SERIES as Record<string, { label: string }>)[id]?.label ?? id;
export const seriesColor = (id: string) => (SERIES as Record<string, { color: string }>)[id]?.color ?? '#3c84f4';

/** Legacy geometry and palette from compound-bar-chart.ts / the v3 widget. */
export const GEOMETRY = {
  chartHeight: 300,
  barHeight: 16,
  barRadius: 4,
  barMinWidth: 1,
  axisText: '#64748B',
  rowGuide: '#f8fafc',
  legendText: '#64748B',
  legendSwatch: 8,
  tooltipHideMs: 2000,
  zoomMinSpan: 0.1,
} as const;

function build(fixture: Fixture): Scenario {
  const t0 = performance.now();
  const timeline =
    fixture.result.length === 0
      ? null
      : buildOccupancyTimeline({
          result: fixture.result,
          selectedDate: fixture.selectedDate,
          zone: fixture.zone,
          threshold: PEOPLE_IN_STALL.threshold,
          now: DateTime.fromISO(fixture.now, { zone: fixture.zone }),
        });
  return {
    name: fixture.name,
    purpose: fixture.purpose,
    status: fixture.name === 'no-data' ? 'no-data' : 'data',
    timeline,
    intervalCount: timeline?.intervalCount ?? 0,
    buildMs: Math.round((performance.now() - t0) * 10) / 10,
  };
}

let cache: Scenario[] | undefined;
export function loadScenarios(): Scenario[] {
  cache ??= [
    ...FIXTURES.map(build),
    {
      name: 'loading',
      purpose: 'The query is in flight. No stale bars or legend may remain visible.',
      status: 'loading',
      timeline: null,
      intervalCount: 0,
      buildMs: 0,
    },
    {
      name: 'error',
      purpose: 'The query failed. The retry-safe error copy replaces the chart and clears stale state.',
      status: 'error',
      timeline: null,
      intervalCount: 0,
      buildMs: 0,
    },
  ];
  return cache;
}
