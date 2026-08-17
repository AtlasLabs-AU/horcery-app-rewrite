import { DateTime } from 'luxon';
import { useCallback, useMemo, useState } from 'react';

import { clampDay, cursorFor, isToday, timeOfDaySeconds } from '@/hooks/playhead-data';

export interface Playhead {
  /** The selected day, clamped to [horse's creation, today]. */
  day: DateTime;
  /** The instant metrics are read at and footage plays from. */
  cursor: DateTime;
  /** True when the cursor is tracking live rather than a fixed past moment. */
  isLive: boolean;
  setDay: (day: DateTime) => void;
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

  return { day, cursor, isLive: live, setDay, resetToToday };
}
