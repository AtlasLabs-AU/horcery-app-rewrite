import { DateTime } from 'luxon';
import { useCallback, useMemo, useState } from 'react';

import {
  clampDay,
  cursorFor,
  isLiveInstant,
  isToday,
  latestSelectable,
  timeOfDaySeconds,
} from '@/hooks/playhead-data';

export interface Playhead {
  /** The selected day, clamped to [horse's creation, today]. */
  day: DateTime;
  /** The instant metrics are read at and footage plays from. */
  cursor: DateTime;
  /** True when the cursor is tracking live rather than a fixed past moment. */
  isLive: boolean;
  setDay: (day: DateTime) => void;
  /**
   * Moves to an arbitrary instant — what the scrubbing timeline commits.
   *
   * Sets the day and the time of day together, so the date bar and the
   * timeline are two controls over one position rather than two positions.
   */
  setCursor: (at: DateTime) => void;
  /** Jumps back to the organization's today. */
  resetToToday: () => void;
}

/**
 * Which day the horse's page is looking at, and the instant that implies.
 *
 * **Time of day is carried across a day change.** Move back from 2:32pm today
 * and you land on 2:32pm yesterday — the question a barn manager actually asks
 * is "what was happening at this time yesterday", not "what happened at
 * yesterday's midnight". The current app does this by keeping `timeOfDay`
 * separate from `date`; this keeps the same split, purely.
 *
 * Page-scoped — see `useHorseDetail`'s note on why this is not the current
 * app's shared `useAnimalDetailStore`. `now` and `earliest` are arguments
 * rather than read internally, so this hook has no opinion about where the
 * clock or the horse's creation date come from and cannot go stale on its own.
 */
export function usePlayhead(now: DateTime, earliest?: DateTime): Playhead {
  const [selected, setSelected] = useState<DateTime | null>(null);
  /**
   * Frozen at the moment you first left today, so the cursor stops chasing the
   * clock. Null means "follow live", which is what today should do.
   */
  const [heldTimeOfDay, setHeldTimeOfDay] = useState<number | null>(null);

  const day = useMemo(
    () => clampDay(selected ?? now, now, earliest),
    [selected, now, earliest],
  );

  const live = isToday(day, now) && heldTimeOfDay === null;
  const cursor = useMemo(
    () => cursorFor(day, now, heldTimeOfDay ?? undefined),
    [day, now, heldTimeOfDay],
  );

  const setDay = useCallback(
    (next: DateTime) => {
      setSelected(next);
      // Capture the time of day ONCE, on the first step away from live, so
      // repeated steps keep the same clock position instead of drifting.
      setHeldTimeOfDay((current) => current ?? timeOfDaySeconds(cursorFor(day, now)));
    },
    [day, now],
  );

  const resetToToday = useCallback(() => {
    setSelected(null);
    setHeldTimeOfDay(null);
  }, []);

  /**
   * Scrubbing to the live edge returns to live rather than freezing one second
   * behind it.
   *
   * Without this, dragging the timeline all the way right would pin the cursor
   * to the instant the finger lifted — the page would say "3:41:12 PM" and
   * quietly stop following the barn, which looks identical to live for about a
   * minute and then is simply wrong. Same tolerance the current app uses to
   * decide the timeline is live.
   */
  const setCursor = useCallback(
    (at: DateTime) => {
      if (isLiveInstant(at.toSeconds(), latestSelectable(now).toSeconds())) {
        setSelected(null);
        setHeldTimeOfDay(null);
        return;
      }
      setSelected(at);
      setHeldTimeOfDay(timeOfDaySeconds(at));
    },
    [now],
  );

  return { day, cursor, isLive: live, setDay, setCursor, resetToToday };
}
