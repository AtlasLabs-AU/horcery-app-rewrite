import { act, renderHook } from '@testing-library/react-native';
import { DateTime } from 'luxon';

import { latestSelectable } from '@/hooks/playhead-data';
import { usePlayhead } from '@/hooks/use-playhead';

const ZONE = 'Australia/Melbourne';
const NOW = DateTime.fromISO('2026-08-18T14:32:00.000', { zone: ZONE });
const CREATED = DateTime.fromISO('2026-08-01T09:00:00.000', { zone: ZONE });

// RNTL v14: everything that touches the tree is async, renderHook included.
const setup = async () => renderHook(() => usePlayhead(NOW, CREATED));

describe('usePlayhead', () => {
  it('starts live on today', async () => {
    const { result } = await setup();

    expect(result.current.isLive).toBe(true);
    expect(result.current.day.toISODate()).toBe('2026-08-18');
    expect(result.current.cursor.toSeconds()).toBeCloseTo(latestSelectable(NOW).toSeconds(), 0);
  });

  it('carries the time of day back a day, and holds it across further steps', async () => {
    const { result } = await setup();

    await act(async () => result.current.setDay(NOW.minus({ days: 1 })));
    expect(result.current.day.toISODate()).toBe('2026-08-17');
    expect(result.current.cursor.toFormat('HH:mm')).toBe(latestSelectable(NOW).toFormat('HH:mm'));

    await act(async () => result.current.setDay(NOW.minus({ days: 2 })));
    expect(result.current.day.toISODate()).toBe('2026-08-16');
    // The same clock position, not a second's drift per step.
    expect(result.current.cursor.toFormat('HH:mm')).toBe(latestSelectable(NOW).toFormat('HH:mm'));
    expect(result.current.isLive).toBe(false);
  });
});

describe('setCursor — what the scrubbing timeline commits', () => {
  it('moves the day and the time of day together', async () => {
    const { result } = await setup();
    const at = DateTime.fromISO('2026-08-16T03:34:00.000', { zone: ZONE });

    await act(async () => result.current.setCursor(at));

    // One position, two controls: the date bar reads the same day the track
    // was dragged to, rather than the two disagreeing.
    expect(result.current.day.toISODate()).toBe('2026-08-16');
    expect(result.current.cursor.toFormat('h:mm a')).toBe('3:34 AM');
    expect(result.current.isLive).toBe(false);
  });

  it('returns to live when the scrub lands at the live edge', async () => {
    const { result } = await setup();

    await act(async () => result.current.setCursor(NOW.minus({ days: 1 })));
    expect(result.current.isLive).toBe(false);

    await act(async () => result.current.setCursor(latestSelectable(NOW)));

    // Not "a fixed instant that happens to equal now" — actually following the
    // barn again, so the page keeps up instead of quietly freezing.
    expect(result.current.isLive).toBe(true);
    expect(result.current.day.toISODate()).toBe('2026-08-18');
  });

  it('will not scrub into the future or past the horse’s first day', async () => {
    const { result } = await setup();

    await act(async () => result.current.setCursor(NOW.plus({ days: 3 })));
    expect(result.current.day.toISODate()).toBe('2026-08-18');
    expect(result.current.cursor.toSeconds()).toBeLessThanOrEqual(
      latestSelectable(NOW).toSeconds(),
    );

    await act(async () => result.current.setCursor(CREATED.minus({ days: 30 })));
    expect(result.current.day.toISODate()).toBe(CREATED.toISODate());
  });

  it('goes back to live on “back to today”', async () => {
    const { result } = await setup();

    await act(async () => result.current.setCursor(DateTime.fromISO('2026-08-16T03:34:00.000', { zone: ZONE })));
    await act(async () => result.current.resetToToday());

    expect(result.current.isLive).toBe(true);
    expect(result.current.day.toISODate()).toBe('2026-08-18');
  });
});
