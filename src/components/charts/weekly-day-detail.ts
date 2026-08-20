import { DateTime } from 'luxon';

import { absencesFrom, MAX_LISTED_ABSENCES } from '@/charts/horse-in-stall-behavior';
import { formatDuration, type LyingDownWeeklyDay } from '@/charts/lying-down';

/**
 * What a tapped bar on the weekly view says.
 *
 * Wording agreed with Inakshi, 2026-08-20, line by line. It is kept here rather
 * than in the components because it is the same set of sentences for every
 * behaviour and because the distinctions it draws are the ones this chart has
 * repeatedly got wrong — a pure function can be tested against all seven cases
 * at once.
 *
 * The distinction that matters most is the first two rows of the table below.
 * "No data" and "0 min" look almost the same on a chart and mean opposite
 * things: one is the monitor being absent, the other is a full day of watching
 * during which nobody came. Collapsing them is the single most damaging mistake
 * these charts can make, so they get different words, not different shades.
 *
 * | Case                  | Title                    | Detail                                |
 * |-----------------------|--------------------------|---------------------------------------|
 * | Nothing observed      | `Saturday · No data`     | —                                     |
 * | Observed, none seen   | `Monday · 0 min`         | `No visits`                           |
 * | Ordinary day          | `Monday · 1 h 44 min`    | `3 visits · 7:02 AM, 12:00 PM, …`     |
 * | Busy day              | `Monday · 2 h 40 min`    | `27 visits · first 6:30 AM, last …`   |
 * | Partly recorded       | `Monday · 1 h 5 min`     | —                                     |
 * | Today                 | `Today · Ongoing`        | `1 h 12 min so far`                   |
 *
 * Two of those detail lines were deliberately removed by Inakshi: "The monitor
 * wasn't reporting" (No data already says it) and "still counting" (Ongoing
 * already says it). Both were me explaining a word with the same word again.
 */

export interface WeeklyDayDetail {
  title: string;
  /** Absent when the title already says everything true about the day. */
  detail?: string;
}

/** Above this many stretches the detail summarises instead of listing. */
export const MAX_LISTED_STRETCHES = 3;

/**
 * The noun for one stretch of the behaviour: a stall gets *visits*, a horse
 * gets *rests*. Passed in rather than inferred, so a new behaviour has to state
 * what its stretches are called instead of inheriting someone else's word.
 */
export interface StretchNoun {
  singular: string;
  plural: string;
  /**
   * Which side of the data the detail line describes.
   *
   * `presence` (the default) lists the stretches themselves — right when the
   * stretch is the event, as a person entering a stall is.
   *
   * `absence` lists the GAPS between them, for a behaviour whose stretches are
   * the resting state. A horse is in its stall nearly all day; saying so is not
   * news, and the question a short day provokes is when it was out (Inakshi,
   * 2026-08-20).
   */
  frame?: 'presence' | 'absence';
}

export const VISITS: StretchNoun = { singular: 'visit', plural: 'visits' };
export const RESTS: StretchNoun = { singular: 'rest', plural: 'rests' };
/** Horse in Stall: the stretches are in-stall time, so the detail names the gaps. */
export const IN_STALL: StretchNoun = {
  singular: 'time out',
  plural: 'times out',
  frame: 'absence',
};

export function weeklyDayDetail(
  day: LyingDownWeeklyDay,
  zone: string,
  noun: StretchNoun,
): WeeklyDayDetail {
  const label = day.isToday
    ? 'Today'
    : DateTime.fromISO(day.key, { zone }).toFormat('cccc');

  // Today is unfinished, so it is never given a total that invites comparison
  // with a complete day — it reports progress instead.
  if (day.isToday) {
    return {
      title: `${label} · Ongoing`,
      detail: `${formatDuration(day.totalSeconds ?? 0)} so far`,
    };
  }

  // Nothing was observed. Not zero — we do not know.
  if (day.totalSeconds === null) return { title: `${label} · No data` };

  const total = formatDuration(day.totalSeconds);

  // Watched all day and nobody came. The opposite claim to the one above, and
  // the reason both need words rather than a shared empty bar.
  if (day.bouts.length === 0) {
    return {
      title: `${label} · ${total}`,
      detail: noun.frame === 'absence' ? 'Out all day' : `No ${noun.plural}`,
    };
  }

  // Part of the day is missing, so the figure is real but not comparable with a
  // whole day. No detail line: listing the stretches we did see would imply the
  // list is complete.
  if (day.coverage === 'partial') return { title: `${label} · ${total}` };

  const at = (seconds: number) => DateTime.fromSeconds(seconds, { zone }).toFormat('h:mm a');

  // A behaviour whose stretches are the resting state describes the gaps.
  if (noun.frame === 'absence') {
    const absences = absencesFrom(day.bouts, day.start, day.end);
    if (absences.length === 0) return { title: `${label} · ${total}`, detail: 'In all day' };

    const detail =
      absences.length <= MAX_LISTED_ABSENCES
        ? `Out ${absences
            .map((absence) =>
              absence.back === null ? `from ${at(absence.out)}` : `${at(absence.out)} – ${at(absence.back)}`,
            )
            .join(' and ')}`
        : `Out ${absences.length} times · first ${at(absences[0]!.out)}, last ${at(
            absences.at(-1)!.out,
          )}`;
    return { title: `${label} · ${total}`, detail };
  }

  const count = day.bouts.length;
  const word = count === 1 ? noun.singular : noun.plural;

  // Same rule as the daily caption: a real stall can log ~27 visits, and a
  // detail line that grows with the data would overflow the panel on exactly
  // the busiest days.
  const detail =
    count <= MAX_LISTED_STRETCHES
      ? `${count} ${word} · ${day.bouts.map((bout) => at(bout.enter)).join(', ')}`
      : `${count} ${word} · first ${at(day.bouts[0]!.enter)}, last ${at(
          day.bouts.at(-1)!.enter,
        )}`;

  return { title: `${label} · ${total}`, detail };
}
