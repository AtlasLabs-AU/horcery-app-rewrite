import { DateTime } from 'luxon';

import type { HistoryEvent } from '@/components/review-history/event-card';
import type { PassportField } from '@/hooks/horse-detail-data';
import { SAMPLE_HORSES, SAMPLE_HORSE_GROUPS } from '@/config/sample/horses-sample';

/**
 * Development-only detail for the sample horses, so the page can be judged
 * whole in design review. A real QA organization rarely has one horse with a
 * breed, a birth date, a stall, groups, a monitor AND a week of events — which
 * is exactly the horse you need to look at to know whether the page works.
 *
 * Behind `PREVIEWS.sampleHorsesData`, and only ever for `sample-*` ids, so it
 * cannot stand in for a real horse that is genuinely missing data.
 */

const PASSPORTS: Record<string, Partial<Record<string, string>>> = {
  'sample-storm': {
    registeredName: 'Storm Over Ashford',
    gender: 'Gelding',
    dob: '14 March 2019',
    breed: 'Thoroughbred',
    height: '163.00 cm',
    weight: '520.00 kg',
    device: 'SM-4417',
  },
  'sample-willow': {
    registeredName: 'Willow of the Glen',
    gender: 'Mare',
    dob: '02 May 2017',
    breed: 'Warmblood',
    height: '158.00 cm',
    weight: '486.00 kg',
    device: 'SM-2205',
  },
  'sample-juniper': {
    registeredName: 'Juniper Hill',
    gender: 'Mare',
    dob: '21 September 2021',
    breed: 'Connemara',
    height: '148.00 cm',
    weight: '390.00 kg',
  },
  'sample-comet': {
    registeredName: 'Comet Rising',
    gender: 'Colt',
    dob: '08 April 2023',
    breed: 'Thoroughbred',
    height: '141.00 cm',
    weight: '310.00 kg',
    device: 'SM-8890',
  },
};

/** Mirrors `buildPassport`'s row order so sample and real look identical. */
export function samplePassportFor(id: string): PassportField[] {
  const horse = SAMPLE_HORSES.find((row) => row.id === id);
  const facts = PASSPORTS[id] ?? {};
  const groupNames = (horse?.groupIds ?? [])
    .map((groupId) => SAMPLE_HORSE_GROUPS.find((group) => group.id === groupId)?.name)
    .filter((name): name is string => !!name);

  return [
    { id: 'registeredName', label: 'Registered name', value: facts.registeredName ?? 'Not recorded' },
    { id: 'gender', label: 'Gender', value: facts.gender ?? 'Not recorded' },
    { id: 'dob', label: 'Date of birth', value: facts.dob ?? 'Not recorded' },
    { id: 'breed', label: 'Breed', value: facts.breed ?? 'Not recorded' },
    { id: 'height', label: 'Height', value: facts.height ?? 'Not recorded' },
    { id: 'weight', label: 'Weight', value: facts.weight ?? 'Not recorded' },
    { id: 'stall', label: 'Assigned stall', value: horse?.stallName ?? 'No stall assigned' },
    {
      id: 'groups',
      label: groupNames.length === 1 ? 'Group' : 'Groups',
      value: groupNames.length ? groupNames.join(', ') : 'No groups',
    },
    { id: 'device', label: 'Stall monitor', value: facts.device ?? 'None assigned' },
  ];
}

interface SampleEventSeed {
  hoursAgo: number;
  title: string;
  icon: HistoryEvent['icon'];
  durationLabel?: string;
  blurhash?: string;
  isAlert?: boolean;
}

const EVENT_SEEDS: SampleEventSeed[] = [
  { hoursAgo: 3, title: 'Lying Down', icon: 'lyingDown', durationLabel: '42m', blurhash: 'LKO2?U%2Tw=w]~RBVZRi};RPxuwH' },
  { hoursAgo: 9, title: 'People Present', icon: 'peopleInStall', durationLabel: '6m', blurhash: 'LEHV6nWB2yk8pyo0adR*.7kCMdnj' },
  { hoursAgo: 21, title: 'Rolling', icon: 'rolling', durationLabel: '18s', blurhash: 'L6PZfSi_.AyE_3t7t7R**0o#DgR4' },
  { hoursAgo: 30, title: 'Exiting', icon: 'exiting', durationLabel: '12s', blurhash: 'LGF5]+Yk^6#M@-5c,1J5@[or[Q6.' },
  { hoursAgo: 54, title: 'Entering', icon: 'entering', durationLabel: '9s', blurhash: 'L9ASgx00~q00M{IUxv%M00%MRjxu' },
];

const ALERT_SEEDS: SampleEventSeed[] = [
  { hoursAgo: 5, title: 'Extended lying down', icon: 'alerts', durationLabel: '1h 12m', blurhash: 'LKO2?U%2Tw=w]~RBVZRi};RPxuwH', isAlert: true },
  { hoursAgo: 40, title: 'No motion detected', icon: 'alerts', isAlert: true },
];

function build(id: string, seeds: SampleEventSeed[], now: DateTime): HistoryEvent[] {
  return seeds.map((seed, index) => {
    const start = now.minus({ hours: seed.hoursAgo });
    return {
      id: `${id}-sample-event-${index}`,
      title: seed.title,
      startTime: start.toISO() ?? '',
      timeLabel: start.toFormat('dd LLL yyyy h:mm a'),
      hasClip: !!seed.durationLabel,
      durationLabel: seed.durationLabel,
      blurhash: seed.blurhash,
      stallName: SAMPLE_HORSES.find((row) => row.id === id)?.stallName,
      isAlert: !!seed.isAlert,
      icon: seed.icon,
    };
  });
}

export function sampleEventsFor(id: string, now: DateTime): HistoryEvent[] {
  return build(id, EVENT_SEEDS, now);
}

export function sampleAlertsFor(id: string, now: DateTime): HistoryEvent[] {
  return build(id, ALERT_SEEDS, now);
}
