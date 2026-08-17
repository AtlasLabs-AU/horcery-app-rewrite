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
    icon: 'rolling',
    isAlert: true,
    hasClip: true,
    // Stands in for the stall's camera frame, so the tile reads as one.
    blurhash: 'LEHV6nWB2yk8pyo0adR*.7kCMdnj',
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
    // Stands in for the stall's camera frame, so the tile reads as one.
    blurhash: 'L6Pj0^~q00?b~qofIUj[00xu_3t7',
    durationLabel: '42m',
    animalName: 'Claire Murphy',
    stallName: 'Stall 4',
  },
  {
    hour: 3,
    minute: 26,
    title: 'Partial Rolling',
    icon: 'rolling',
    isAlert: false,
    hasClip: true,
    // Stands in for the stall's camera frame, so the tile reads as one.
    blurhash: 'L9AS#8%M00t7~qM{IUof00Rj_3WB',
    durationLabel: '21s',
    animalName: 'Golden Boy',
    stallName: 'Stall 2',
  },
  {
    hour: 2,
    minute: 5,
    title: 'People Present',
    icon: 'peopleInStall',
    isAlert: false,
    hasClip: true,
    // Stands in for the stall's camera frame, so the tile reads as one.
    blurhash: 'L7B|[M00?b~q00M{IUof~qRjM{of',
    durationLabel: '3m 10s',
    animalName: 'Golden Boy',
    stallName: 'Stall 2',
  },
  {
    hour: 1,
    minute: 52,
    title: 'People Interaction',
    icon: 'peopleInteraction',
    isAlert: false,
    hasClip: true,
    // Stands in for the stall's camera frame, so the tile reads as one.
    blurhash: 'LKO2?U%2Tw=w]~RBVZRi};RPxuwH',
    durationLabel: '1m 44s',
    animalName: 'Biscuit',
    stallName: 'Stall 3',
  },
  {
    hour: 0,
    minute: 41,
    title: 'Lying Down',
    icon: 'lyingDown',
    isAlert: false,
    hasClip: true,
    // Stands in for the stall's camera frame, so the tile reads as one.
    blurhash: 'L5H2EC=PM+yV0g-mq.wG9c010J}I',
    durationLabel: '1h 12m',
    animalName: 'Willow',
    stallName: 'Stall 5',
  },
  {
    hour: 23,
    minute: 2,
    title: 'Rolling',
    icon: 'rolling',
    isAlert: true,
    hasClip: true,
    // Stands in for the stall's camera frame, so the tile reads as one.
    blurhash: 'LNAdApj[00aymkj[t7j[4nkCMdnj',
    durationLabel: '52s',
    animalName: 'Storm',
    stallName: 'Stall 1',
  },
  {
    hour: 21,
    minute: 35,
    title: 'Exiting',
    icon: 'exiting',
    isAlert: false,
    hasClip: true,
    // Stands in for the stall's camera frame, so the tile reads as one.
    blurhash: 'L8C?xE00?b~q00M{IUof~qRjM{of',
    durationLabel: '9s',
    animalName: 'Juniper',
    stallName: 'Stall 6',
  },
  {
    hour: 20,
    minute: 8,
    title: 'Entering',
    icon: 'entering',
    isAlert: false,
    hasClip: true,
    // Stands in for the stall's camera frame, so the tile reads as one.
    blurhash: 'LEHV6nWB2yk8pyo0adR*.7kCMdnj',
    durationLabel: '11s',
    animalName: 'Juniper',
    stallName: 'Stall 6',
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
