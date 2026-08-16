import type { Snapshot } from '@/components/for-you/snapshots-card';
import type { ReviewPreviewEvent } from '@/components/for-you/review-card';

/**
 * Invented, development-only data for judging the complete For You layout.
 *
 * This module is only consumed behind `PREVIEWS.sampleForYouData`. It never
 * enters React Query, never mutates the API cache, and never replaces real
 * snapshot data. BlurHashes stand in for authenticated camera stills so the
 * preview remains deterministic and works offline in both simulators.
 */
export const SAMPLE_FOR_YOU = {
  conditions: {
    temperature: '18°C',
    humidity: '64%',
  },
  snapshots: [
    {
      id: 'sample-snapshot-storm',
      name: 'Storm',
      blurhash: 'L6Pj0^~q00?b~qofIUj[00xu_3t7',
    },
    {
      id: 'sample-snapshot-willow',
      name: 'Willow',
      blurhash: 'LEHV6nWB2yk8pyo0adR*.7kCMdnj',
    },
    {
      id: 'sample-snapshot-comet',
      name: 'Comet',
      blurhash: 'L9AS#8%M00t7~qM{IUof00Rj_3WB',
    },
    {
      id: 'sample-snapshot-juniper',
      name: 'Juniper',
      blurhash: 'L7B|[M00?b~q00M{IUof~qRjM{of',
    },
  ] satisfies Snapshot[],
  reviewEvents: [
    {
      id: 'sample-review-lying-down',
      title: 'Lying Down',
      horseName: 'Willow',
      stallName: 'Stall 4',
      timeLabel: '12 min ago',
      durationLabel: '42m',
      icon: 'lyingDown',
      blurhash: 'LEHV6nWB2yk8pyo0adR*.7kCMdnj',
    },
    {
      id: 'sample-review-people',
      title: 'People in Stall',
      horseName: 'Storm',
      stallName: 'Stall 1',
      timeLabel: '34 min ago',
      durationLabel: '3m',
      icon: 'peopleInStall',
      blurhash: 'L6Pj0^~q00?b~qofIUj[00xu_3t7',
    },
  ] satisfies ReviewPreviewEvent[],
  behaviorTrends: {
    'lying-down': {
      daily: [28, 34, 31, 42, 38, 47, 39],
      weekly: [210, 224, 198, 236, 229, 248, 241],
    },
    'people-in-stall': {
      daily: [12, 18, 9, 22, 14, 19, 16],
      weekly: [88, 94, 76, 102, 91, 110, 98],
    },
    'in-stall': {
      daily: [72, 68, 76, 81, 74, 79, 77],
      weekly: [512, 498, 526, 540, 519, 551, 536],
    },
    feed: {
      daily: [21, 24, 19, 27, 25, 29, 26],
      weekly: [148, 156, 143, 166, 159, 172, 164],
    },
  },
  chartLabels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
  waterSeries: [
    { label: 'Average', values: [42, 44, 43, 46, 45, 47, 46] },
    { label: 'Today', values: [40, 48, 41, 49, 44, 51, 47] },
  ],
  feedSeries: [
    { label: 'Average', values: [7.2, 7.4, 7.3, 7.5, 7.6, 7.5, 7.7] },
    { label: 'Today', values: [7.1, 7.7, 7.2, 7.8, 7.4, 7.9, 7.6] },
  ],
} as const;
