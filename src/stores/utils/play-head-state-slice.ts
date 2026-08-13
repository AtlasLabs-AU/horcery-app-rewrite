import type { Duration } from 'luxon';
import { DateTime } from 'luxon';
import { compute } from 'zustand-computed-state';

import { BUFFER_OFFSET_SECONDS } from '@acme/config/constants/date-constants';

export function getQueryBound(cursor: DateTime, bound: 'start' | 'end') {
  const now = DateTime.now();
  const cursorDay = cursor.startOf('day');
  const today = now.startOf('day');
  const isLast24 = cursorDay >= today;

  if (bound === 'start') {
    return isLast24 ? now.minus({ days: 1 }) : cursorDay;
  }
  return isLast24 ? now : cursorDay.endOf('day');
}

export interface PlayHeadStateSlice {
  date: DateTime;
  setDate: (date: DateTime) => void;

  timeOfDay: Duration;
  setTimeOfDay: (timeOfDay: Duration) => void;
  setCursor: (dateTime: DateTime) => void;
  scrubTo: (time: DateTime) => void;

  // Computed state
  queryStartTime: DateTime;
  queryEndTime: DateTime;
  // isDayQueryMode: boolean; // true if queryStartTime and queryEndTime are the same day, false if they are different days
  cursor: DateTime;
}

export const createPlayHeadStateSlice = (
  set: (fn: (state: PlayHeadStateSlice) => Partial<PlayHeadStateSlice>) => void,
  get: () => PlayHeadStateSlice,
): PlayHeadStateSlice => ({
  date: DateTime.now().startOf('day'),
  timeOfDay: DateTime.now().diff(DateTime.now().startOf('day')),

  setDate: (date: DateTime) =>
    set((state) => {
      const now = DateTime.now().minus({ seconds: BUFFER_OFFSET_SECONDS });
      const clampedDate =
        date.startOf('day') > now.startOf('day')
          ? now.startOf('day')
          : date.startOf('day');
      const proposedCursor = clampedDate.plus(state.timeOfDay);
      if (proposedCursor > now) {
        const correctedTime = now;
        return {
          date: clampedDate,
          timeOfDay: correctedTime.diff(now.startOf('day')),
        };
      }
      return { date: clampedDate };
    }),

  setTimeOfDay: (td: Duration) => {
    const now = DateTime.now().minus({ seconds: BUFFER_OFFSET_SECONDS });

    set((state: PlayHeadStateSlice) => {
      const clampedTimeOfDay =
        state.date.plus(td) > now ? now.diff(now.startOf('day')) : td;
      // debug('setTime', clampedTimeOfDay.toISO());
      return {
        timeOfDay: clampedTimeOfDay,
        // cursor: state.date.startOf('day').plus(clampedTimeOfDay),
      };
    });
  },
  setCursor: (dt: DateTime) => {
    const cursor =
      DateTime.now().minus({ seconds: BUFFER_OFFSET_SECONDS }) < dt
        ? DateTime.now().minus({ seconds: BUFFER_OFFSET_SECONDS })
        : dt;
    set(() => {
      return {
        date: cursor.startOf('day'),
        timeOfDay: cursor.diff(cursor.startOf('day')),
      };
    });
  },

  scrubTo: (time: DateTime) => {
    const currentDate = get().date;
    if (time.startOf('day').toUnixInteger() === currentDate.toUnixInteger()) {
      get().setTimeOfDay(time.diff(time.startOf('day')));
    } else {
      get().setCursor(time);
    }
  },

  ...compute('play_head_state_slice', get, (state: PlayHeadStateSlice) => ({
    queryStartTime: getQueryBound(state.date, 'start'), // default to start of today
    queryEndTime: getQueryBound(state.date, 'end'), // default to end of today
    queryStartOfDay: state.date.startOf('day'),
    cursor: state.date.plus(state.timeOfDay),
    // isDayQueryMode: state.date.startOf('day').valueOf() !== DateTime.now().startOf('day').valueOf(),
  })),
});
