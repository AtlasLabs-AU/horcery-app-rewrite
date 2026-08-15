import type { DateTime } from 'luxon';

import type { HistoryEvent } from '@/components/review-history/event-card';

/**
 * Invented events so Review History can be judged populated.
 *
 * The QA organization has no events on any recent day, so without this a
 * design review is a review of the empty state. Used ONLY when
 * `PREVIEWS.sampleHistoryData` is on (a dev build that opted in) AND the real
 * query came back empty — real events always win, and the screen says on its
 * face that what you are looking at is sample data.
 *
 * Times are generated relative to the selected day so every day looks
 * plausible, including days you navigate back to.
 */
type Template = Omit<HistoryEvent, 'id' | 'startTime' | 'timeLabel'> & {
  /** Hour and minute within the selected day. */
  hour: number;
  minute: number;
};

const TEMPLATES: Template[] = [
  {
    hour: 5,
    minute: 12,
    title: 'Rolling',
    icon: 'alerts',
    isAlert: true,
    hasClip: true,
    durationLabel: '38s',
    animalName: 'Storm',
    stallName: 'Stall 1',
  },
  {
    hour: 4,
    minute: 48,
    title: 'Lying Down',
    icon: 'lyingDown',
    isAlert: false,
    hasClip: true,
    durationLabel: '42m',
    animalName: 'Claire Murphy',
    stallName: 'Stall 4',
  },
  {
    hour: 2,
    minute: 5,
    title: 'People in Stall',
    icon: 'peopleInStall',
    isAlert: false,
    hasClip: true,
    durationLabel: '3m 10s',
    animalName: 'Golden Boy',
    stallName: 'Stall 2',
  },
  {
    hour: 1,
    minute: 20,
    title: 'Stall Check',
    icon: 'info',
    isAlert: false,
    hasClip: false,
    animalName: 'Biscuit',
    stallName: 'Stall 3',
    reporter: 'Sithmi Perera',
    note: 'Water topped up, bedding turned. Nothing unusual.',
  },
  {
    hour: 0,
    minute: 41,
    title: 'Lying Down',
    icon: 'lyingDown',
    isAlert: false,
    hasClip: true,
    durationLabel: '1h 12m',
    animalName: 'Willow',
    stallName: 'Stall 5',
  },
  {
    hour: 23,
    minute: 2,
    title: 'Rolling',
    icon: 'alerts',
    isAlert: true,
    hasClip: true,
    durationLabel: '52s',
    animalName: 'Storm',
    stallName: 'Stall 1',
  },
  {
    hour: 21,
    minute: 35,
    title: 'Feed',
    icon: 'feed',
    isAlert: false,
    hasClip: true,
    durationLabel: '14m',
    animalName: 'Juniper',
    stallName: 'Stall 6',
  },
  {
    hour: 19,
    minute: 15,
    title: 'Stall Cleaning',
    icon: 'info',
    isAlert: false,
    hasClip: false,
    animalName: 'Comet',
    stallName: 'Stall 8',
    reporter: 'Vikum Silva',
    note: 'Full muck out, fresh shavings.',
  },
];

/** Sample events for a given day, newest first. */
export function sampleHistoryFor(day: DateTime): HistoryEvent[] {
  const key = day.toISODate() ?? 'sample';
  return TEMPLATES.map((template, index) => {
    const { hour, minute, ...event } = template;
    return {
      ...event,
      id: `sample-${key}-${index}`,
      startTime: day.set({ hour, minute, second: 0 }).toISO() ?? '',
      // The screen formats this in the organization's zone.
      timeLabel: '',
    };
  }).sort((a, b) => b.startTime.localeCompare(a.startTime));
}
