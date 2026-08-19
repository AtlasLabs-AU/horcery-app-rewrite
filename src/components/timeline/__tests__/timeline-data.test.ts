import { DateTime } from 'luxon';

import {
  clampInstantSeconds,
  MAX_ZOOM,
  nearestDetent,
  pixelsPerSecond,
  SECONDS_PER_SCREEN_AT_ZOOM_1,
  tickStep,
  ticksIn,
  visibleSeconds,
  ZOOM_DETENTS,
} from '@/components/timeline/timeline-data';

const ZONE = 'Australia/Melbourne';
const PHONE_WIDTH = 390;

describe('scale', () => {
  it('shows six hours across one screen at zoom 1, and less as it zooms in', () => {
    expect(visibleSeconds(1)).toBe(SECONDS_PER_SCREEN_AT_ZOOM_1);
    expect(visibleSeconds(1)).toBe(6 * 60 * 60);
    expect(visibleSeconds(100)).toBeCloseTo(216); // ~3.6 minutes
  });

  it('round-trips: a screen width of pixels is a screen worth of seconds', () => {
    for (const zoom of ZOOM_DETENTS) {
      expect(pixelsPerSecond(PHONE_WIDTH, zoom) * visibleSeconds(zoom)).toBeCloseTo(PHONE_WIDTH);
    }
  });

  it('answers zero before onLayout rather than Infinity', () => {
    // A NaN or Infinity here poisons the shared value driving the transform,
    // and the track never appears again — with nothing on screen to say why.
    expect(pixelsPerSecond(0, 1)).toBe(0);
    expect(pixelsPerSecond(-5, 1)).toBe(0);
    expect(Number.isFinite(pixelsPerSecond(PHONE_WIDTH, Number.NaN))).toBe(true);
  });

  it('refuses to scale past the ends of the pinch range', () => {
    expect(visibleSeconds(0.1)).toBe(visibleSeconds(1));
    expect(visibleSeconds(10_000)).toBe(visibleSeconds(MAX_ZOOM));
  });
});

describe('the tick ladder', () => {
  it('divides an hour exactly at every rung', () => {
    // `ticksIn` anchors the ladder to a wall-clock hour and steps forward from
    // there. A step that does not divide 3600 would drift off the hour marks a
    // little further every hour, which is exactly the class of bug the current
    // app's offset arithmetic produces at a daylight-saving change.
    for (const zoom of [1, 1.4, 2, 4, 7, 15, 40, 75, 100]) {
      const { major, minor } = tickStep(zoom);
      expect(3600 % major).toBe(0);
      expect(3600 % minor).toBe(0);
      expect(major % minor).toBe(0);
    }
  });

  it('keeps a readable number of ticks on screen at every detent', () => {
    // The regression guard for the reason the current app's zoom was almost
    // certainly abandoned: its thirteen fixed six-hour segments ask for ~9,400
    // tick views at zoom 100. Windowed rendering keeps the count flat, and
    // this test fails if a future rung breaks that.
    for (const zoom of ZOOM_DETENTS) {
      const { major, minor } = tickStep(zoom);
      const perScreen = visibleSeconds(zoom) / minor;
      const labelsPerScreen = visibleSeconds(zoom) / major;
      expect(perScreen).toBeLessThanOrEqual(60);
      expect(labelsPerScreen).toBeGreaterThanOrEqual(1);
      expect(labelsPerScreen).toBeLessThanOrEqual(12);
    }
  });
});

describe('ticksIn', () => {
  const at = (iso: string) => DateTime.fromISO(iso, { zone: ZONE }).toSeconds();

  it('lands every tick on a wall-clock boundary in the organization’s zone', () => {
    const from = at('2026-08-18T09:07:33');
    const ticks = ticksIn(from, from + 6 * 3600, tickStep(1), ZONE);

    expect(ticks.length).toBeGreaterThan(0);
    for (const tick of ticks) {
      const local = DateTime.fromSeconds(tick.at, { zone: ZONE });
      expect(local.second).toBe(0);
      expect(local.minute % 10).toBe(0);
    }
  });

  it('labels the major ticks with their own instant, and leaves the rest bare', () => {
    const from = at('2026-08-18T09:00:00');
    const ticks = ticksIn(from, from + 3 * 3600, tickStep(1), ZONE);
    const majors = ticks.filter((tick) => tick.major);

    expect(majors.length).toBeGreaterThanOrEqual(3);
    for (const tick of majors) {
      expect(tick.label).toBe(DateTime.fromSeconds(tick.at, { zone: ZONE }).toFormat('h:mm a'));
      expect(DateTime.fromSeconds(tick.at, { zone: ZONE }).minute).toBe(0);
    }
    for (const tick of ticks.filter((candidate) => !candidate.major)) {
      expect(tick.label).toBeUndefined();
    }
  });

  it('stays on the hour across a daylight-saving change', () => {
    // Melbourne moves 2:00am → 3:00am on the first Sunday of October. The
    // current app adds a fixed `offset * 60` to align its grid, so on this
    // morning its ticks sit an hour off the labels beside them. Asking luxon
    // for the boundary in the zone is what makes this pass.
    const from = at('2026-10-04T00:30:00');
    const ticks = ticksIn(from, from + 5 * 3600, tickStep(1), ZONE);

    for (const tick of ticks) {
      const local = DateTime.fromSeconds(tick.at, { zone: ZONE });
      expect(local.minute % 10).toBe(0);
      expect(local.second).toBe(0);
    }
    // The clock skipped 2am, so no label claims it.
    expect(ticks.filter((tick) => tick.label === '2:00 AM')).toHaveLength(0);
    expect(ticks.some((tick) => tick.label === '1:00 AM')).toBe(true);
    expect(ticks.some((tick) => tick.label === '3:00 AM')).toBe(true);
  });

  it('reads barn time, not phone time', () => {
    const from = at('2026-08-18T09:00:00');
    const melbourne = ticksIn(from, from + 2 * 3600, tickStep(1), ZONE);
    const london = ticksIn(from, from + 2 * 3600, tickStep(1), 'Europe/London');

    expect(melbourne[0].at).toBe(london[0].at);
    expect(melbourne.find((t) => t.major)?.label).not.toBe(london.find((t) => t.major)?.label);
  });

  it('returns nothing rather than a million views for a nonsense span', () => {
    const from = at('2026-08-18T09:00:00');
    expect(ticksIn(from, from, tickStep(1), ZONE)).toEqual([]);
    expect(ticksIn(from, from - 3600, tickStep(1), ZONE)).toEqual([]);
    // A year at 15-second ticks: a bad width or zoom must not be able to ask
    // React for six million elements.
    expect(ticksIn(from, from + 365 * 24 * 3600, { major: 120, minor: 15 }, ZONE)).toEqual([]);
  });

  it('falls back to the device zone before the organization has loaded', () => {
    const from = at('2026-08-18T09:00:00');
    expect(ticksIn(from, from + 2 * 3600, tickStep(1), undefined).length).toBeGreaterThan(0);
  });
});

describe('clamping and detents', () => {
  it('keeps an instant inside the range the page can answer for', () => {
    expect(clampInstantSeconds(50, 0, 100)).toBe(50);
    expect(clampInstantSeconds(-10, 0, 100)).toBe(0);
    expect(clampInstantSeconds(999, 0, 100)).toBe(100);
    // A NaN reaching the transform freezes the track; the live edge is the
    // safest place to put it back.
    expect(clampInstantSeconds(Number.NaN, 0, 100)).toBe(100);
  });

  it('snaps a pinch to the nearest detent and never outside them', () => {
    expect(nearestDetent(1)).toBe(1);
    expect(nearestDetent(1.4)).toBe(1);
    expect(nearestDetent(1.7)).toBe(2);
    expect(nearestDetent(0.01)).toBe(1);
    expect(nearestDetent(10_000)).toBe(MAX_ZOOM);
    for (const detent of ZOOM_DETENTS) expect(nearestDetent(detent)).toBe(detent);
  });

  it('gives every detent its own tick density', () => {
    // The point of detenting: a pinch step you cannot see is a pinch step that
    // makes the control feel broken.
    const densities = ZOOM_DETENTS.map((zoom) => JSON.stringify(tickStep(zoom)));
    expect(new Set(densities).size).toBe(ZOOM_DETENTS.length);
  });
});
