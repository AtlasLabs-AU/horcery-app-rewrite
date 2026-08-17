import { DateTime } from 'luxon';
import { useCallback, useMemo, useState } from 'react';

import { clampDay, cursorFor } from '@/hooks/playhead-data';

export interface Playhead {
  /** The selected day, clamped to [horse's creation, today]. */
  day: DateTime;
  /** The instant to read metrics at — live now on today, end-of-day otherwise. */
  cursor: DateTime;
  setDay: (day: DateTime) => void;
  /** Jumps back to the organization's today. */
  resetToToday: () => void;
}

/**
 * Which day the horse's page is looking at, and the instant that implies.
 *
 * Page-scoped — see `useHorseDetail`'s note on why this is not the current
 * app's shared `useAnimalDetailStore`. `now` and `earliest` are arguments
 * rather than read internally, so this hook has no opinion about where the
 * clock or the horse's creation date come from and cannot go stale on its own.
 */
export function usePlayhead(now: DateTime, earliest?: DateTime): Playhead {
  const [selected, setSelected] = useState<DateTime | null>(null);

  const day = useMemo(
    () => clampDay(selected ?? now, now, earliest),
    [selected, now, earliest],
  );
  const cursor = useMemo(() => cursorFor(day, now), [day, now]);

  const setDay = useCallback((next: DateTime) => setSelected(next), []);
  const resetToToday = useCallback(() => setSelected(null), []);

  return { day, cursor, setDay, resetToToday };
}
