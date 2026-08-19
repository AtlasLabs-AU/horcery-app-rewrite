import { DateTime } from 'luxon';

import {
  canGoBack,
  canGoForward,
  clampDay,
  cursorFor,
  dayLabel,
  isLiveInstant,
  isToday,
  latestSelectable,
  LIVE_EPSILON_SECONDS,
  timeOfDaySeconds,
} from '@/hooks/playhead-data';

const NOW = DateTime.fromISO('2026-08-17T14:32:00.000', { zone: 'Australia/Sydney' });
const CREATED = DateTime.fromISO('2026-08-10T09:00:00.000', { zone: 'Australia/Sydney' });

describe('clampDay', () => {
  it('leaves an in-range day untouched', () => {
    const middle = DateTime.fromISO('2026-08-14', { zone: 'Australia/Sydney' });
    expect(clampDay(middle, NOW, CREATED).toISODate()).toBe('2026-08-14');
  });

  it('never selects a day after today', () => {
    const future = NOW.plus({ days: 5 });
    expect(clampDay(future, NOW, CREATED).toISODate()).toBe(NOW.toISODate());
  });

  it('never selects a day before the horse existed', () => {
    const before = CREATED.minus({ days: 10 });
    expect(clampDay(before, NOW, CREATED).toISODate()).toBe(CREATED.toISODate());
  });

  it('has no floor when the horse has no known creation date', () => {
    const before = CREATED.minus({ days: 100 });
    expect(clampDay(before, NOW, undefined).toISODate()).toBe(before.toISODate());
  });
});

describe('cursorFor', () => {
  it('is live-now-minus-buffer on today, so a reading is current', () => {
    const cursor = cursorFor(NOW.startOf('day'), NOW);
    expect(cursor.toMillis()).toBe(latestSelectable(NOW).toMillis());
  });

  it('carries the time of day back to an earlier day', () => {
    // The behaviour the whole date bar exists for: stepping back from 2:32pm
    // today lands on 2:32pm three days ago, not on that day's midnight or its
    // last minute. An earlier version returned end-of-day and claimed in a
    // comment that this matched the current app — it did not.
    const earlier = NOW.minus({ days: 3 }).startOf('day');
    const cursor = cursorFor(earlier, NOW, timeOfDaySeconds(NOW));

    expect(cursor.toISODate()).toBe(earlier.toISODate());
    expect(cursor.hour).toBe(NOW.hour);
    expect(cursor.minute).toBe(NOW.minute);
  });

  it('never runs past live, even asking for a later time today', () => {
    const endOfToday = timeOfDaySeconds(NOW.endOf('day'));
    const cursor = cursorFor(NOW.startOf('day'), NOW, endOfToday);

    expect(cursor.toMillis()).toBe(latestSelectable(NOW).toMillis());
  });

  it('is stable for a past day when the time of day is held', () => {
    // What `usePlayhead` does: freeze the time of day on the first step away
    // from live, so the cursor stops chasing the clock and the footage window
    // stays put while you look at it.
    const day = NOW.minus({ days: 2 }).startOf('day');
    const held = timeOfDaySeconds(NOW);

    const early = cursorFor(day, NOW, held);
    const later = cursorFor(day, NOW.plus({ hours: 3 }), held);

    expect(early.toMillis()).toBe(later.toMillis());
  });
});

describe('isToday / canGoForward / canGoBack', () => {
  it('agrees with itself: today cannot go forward', () => {
    expect(isToday(NOW, NOW)).toBe(true);
    expect(canGoForward(NOW, NOW)).toBe(false);
  });

  it('an earlier day can go forward, a future-clamped day cannot exceed today', () => {
    expect(canGoForward(NOW.minus({ days: 1 }), NOW)).toBe(true);
  });

  it('cannot go back past the horse\'s first day, but can with no floor', () => {
    expect(canGoBack(CREATED, CREATED)).toBe(false);
    expect(canGoBack(CREATED.plus({ days: 1 }), CREATED)).toBe(true);
    expect(canGoBack(CREATED.minus({ days: 500 }), undefined)).toBe(true);
  });
});

describe('dayLabel', () => {
  it('names today and yesterday in words', () => {
    expect(dayLabel(NOW, NOW)).toBe('Today');
    expect(dayLabel(NOW.minus({ days: 1 }), NOW)).toBe('Yesterday');
  });

  it('falls back to a written date for anything else', () => {
    expect(dayLabel(NOW.minus({ days: 5 }), NOW)).toMatch(/^\w{3} \d+ \w{3}$/);
  });
});

describe('isLiveInstant', () => {
  const LATEST = latestSelectable(NOW);

  it('treats the live edge, and a breath either side of it, as live', () => {
    expect(isLiveInstant(LATEST.toSeconds(), LATEST.toSeconds())).toBe(true);
    expect(
      isLiveInstant(LATEST.minus({ seconds: LIVE_EPSILON_SECONDS }).toSeconds(), LATEST.toSeconds()),
    ).toBe(true);
  });

  it('does not call a moment in the past live', () => {
    // Scrubbing to the right-hand end must go back to FOLLOWING the barn, not
    // pin the cursor to the instant the finger lifted — which looks identical
    // to live for about a minute and is then simply wrong.
    expect(isLiveInstant(LATEST.minus({ minutes: 1 }).toSeconds(), LATEST.toSeconds())).toBe(false);
  });
});
