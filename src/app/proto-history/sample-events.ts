/**
 * Sample events for the Review History design prototype.
 *
 * The QA organization has no events on recent days, so a design review would
 * otherwise be a review of the empty state. These stand in for real ones and
 * exist ONLY on the R&D branch — the real screen reads the event API
 * (requirements §6c). Names, stalls and times are invented.
 */
export type EventCategory = 'behavior' | 'people' | 'alert';

export interface SampleEvent {
  id: string;
  /** ISO in the barn's local time — the prototype treats it as already zoned. */
  at: string;
  title: string;
  category: EventCategory;
  horse: string;
  stall: string;
  /** Behaviour events carry footage; reported events carry a note instead. */
  clip?: string;
  note?: string;
  durationLabel?: string;
}

const CLIPS = [
  'https://test-videos.co.uk/vids/bigbuckbunny/mp4/h264/720/Big_Buck_Bunny_720_10s_1MB.mp4',
  'https://test-videos.co.uk/vids/sintel/mp4/h264/720/Sintel_720_10s_1MB.mp4',
  'https://test-videos.co.uk/vids/jellyfish/mp4/h264/720/Jellyfish_720_10s_1MB.mp4',
];

export const SAMPLE_EVENTS: SampleEvent[] = [
  {
    id: 'e1',
    at: '2026-08-15T05:12:00',
    title: 'Rolling',
    category: 'alert',
    horse: 'Storm',
    stall: 'Stall 1',
    clip: CLIPS[0],
    durationLabel: '38s',
  },
  {
    id: 'e2',
    at: '2026-08-15T04:48:00',
    title: 'Lying Down',
    category: 'behavior',
    horse: 'Claire Murphy',
    stall: 'Stall 4',
    clip: CLIPS[1],
    durationLabel: '42m',
  },
  {
    id: 'e3',
    at: '2026-08-15T02:05:00',
    title: 'People in Stall',
    category: 'people',
    horse: 'Golden Boy',
    stall: 'Stall 2',
    clip: CLIPS[2],
    durationLabel: '3m 10s',
  },
  {
    id: 'e4',
    at: '2026-08-15T00:20:00',
    title: 'Stall Check',
    category: 'people',
    horse: 'Biscuit',
    stall: 'Stall 3',
    note: 'Water topped up, bedding turned. Nothing unusual.',
  },
  {
    id: 'e5',
    at: '2026-08-14T23:41:00',
    title: 'Lying Down',
    category: 'behavior',
    horse: 'Willow',
    stall: 'Stall 5',
    clip: CLIPS[0],
    durationLabel: '1h 12m',
  },
  {
    id: 'e6',
    at: '2026-08-14T21:02:00',
    title: 'Rolling',
    category: 'alert',
    horse: 'Storm',
    stall: 'Stall 1',
    clip: CLIPS[1],
    durationLabel: '52s',
  },
  {
    id: 'e7',
    at: '2026-08-14T18:35:00',
    title: 'Feed',
    category: 'behavior',
    horse: 'Juniper',
    stall: 'Stall 6',
    clip: CLIPS[2],
    durationLabel: '14m',
  },
  {
    id: 'e8',
    at: '2026-08-14T07:15:00',
    title: 'Stall Cleaning',
    category: 'people',
    horse: 'Comet',
    stall: 'Stall 8',
    note: 'Full muck out. Reported by Sithmi.',
  },
  {
    id: 'e9',
    at: '2026-08-13T22:58:00',
    title: 'Lying Down',
    category: 'behavior',
    horse: 'Clover',
    stall: 'Stall 9',
    clip: CLIPS[0],
    durationLabel: '2h 04m',
  },
  {
    id: 'e10',
    at: '2026-08-13T19:30:00',
    title: 'People in Stall',
    category: 'people',
    horse: 'Midnight',
    stall: 'Stall 7',
    clip: CLIPS[1],
    durationLabel: '6m 22s',
  },
];
