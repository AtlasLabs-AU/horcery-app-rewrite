import { DateTime } from 'luxon';

import { buildLyingDownWeek } from '@/charts/lying-down';
import { sm1272LyingDownSegment } from '@/services/prometheus/__fixtures__/sm-1272-lying-down-segment';
import {
  buildMonitorRangeUrl,
  decodePrometheusRangeResponse,
  HORSE_IN_STALL_QUERY,
  liveMonitorRangeWindow,
  LYING_DOWN_DETECTION_QUERY,
  RANGE_STEP_SECONDS,
} from '@/services/prometheus/monitor-range';

const ZONE = 'America/New_York';

describe('live monitor range adapter', () => {
  it('builds both exact, bounded query URLs and pins the lowercase animal label', () => {
    const now = DateTime.fromISO('2026-08-20T12:00:00', { zone: ZONE });
    const window = liveMonitorRangeWindow({ zone: ZONE, now });
    const detection = new URL(
      buildMonitorRangeUrl({
        baseUrl: 'https://n1.dat.use.wg0.horcery.com/sm-1272',
        query: LYING_DOWN_DETECTION_QUERY,
        window,
      }),
    );
    const coverage = new URL(
      buildMonitorRangeUrl({
        baseUrl: 'https://n1.dat.use.wg0.horcery.com/sm-1272',
        query: HORSE_IN_STALL_QUERY,
        window,
      }),
    );

    expect(window.selectedDate).toBe('2026-08-20');
    expect(window.dayStartHour).toBe(6);
    expect(detection.pathname).toBe('/sm-1272/api/v1/query_range');
    expect(detection.searchParams.get('query')).toBe(LYING_DOWN_DETECTION_QUERY);
    expect(detection.searchParams.get('query')).toContain('animal_type="horse"');
    expect(detection.searchParams.get('start')).toBe(String(Math.floor(window.start)));
    expect(detection.searchParams.get('end')).toBe(String(Math.floor(window.end)));
    expect(detection.searchParams.get('step')).toBe(String(RANGE_STEP_SECONDS));
    expect(coverage.searchParams.get('query')).toBe(HORSE_IN_STALL_QUERY);
  });

  it('decodes a captured real response and preserves the chart-domain total', () => {
    const result = decodePrometheusRangeResponse(sm1272LyingDownSegment);
    const now = DateTime.fromISO('2026-08-14T02:00:00', { zone: ZONE });
    const week = buildLyingDownWeek({
      result,
      selectedDate: '2026-08-13',
      zone: ZONE,
      dayStartHour: 6,
      days: 1,
      now,
    });

    expect(week.today?.coverage).toBe('partial');
    expect(week.today?.totalSeconds).toBe(23 * 60);
    expect(week.boutCount).toBe(1);
  });

  it('keeps an empty production result as no observations, never a zero total', () => {
    const now = DateTime.fromISO('2026-08-20T12:00:00', { zone: ZONE });
    const week = buildLyingDownWeek({
      result: [],
      inStallResult: [],
      selectedDate: '2026-08-20',
      zone: ZONE,
      dayStartHour: 6,
      now,
    });

    expect(week.today?.coverage).toBe('no-observations');
    expect(week.today?.totalSeconds).toBeNull();
    expect(week.state).toBe('no-data');
  });
});
