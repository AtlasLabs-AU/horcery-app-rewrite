import { DateTime } from 'luxon';

import { sampleHistoryFor } from '@/config/sample/review-history-sample';

const REMOVED_MANUAL_EVENTS = [
  'Stall Cleaning',
  'Stall Check',
  'Water Check',
];

describe('Review History sample catalogue', () => {
  it('does not reintroduce removed Record/manual-entry events', () => {
    const events = sampleHistoryFor(DateTime.utc(2026, 8, 16));

    for (const title of REMOVED_MANUAL_EVENTS) {
      expect(events).not.toEqual(
        expect.arrayContaining([expect.objectContaining({ title })]),
      );
    }
    expect(events.every((event) => !('reporter' in event) && !('note' in event))).toBe(true);
  });
});
