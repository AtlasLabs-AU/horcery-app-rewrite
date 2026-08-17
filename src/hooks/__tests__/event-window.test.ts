import { DateTime } from 'luxon';

import { DEFAULT_EVENT_TYPES, eventWindow } from '@/hooks/review-history-data';

const day = DateTime.fromISO('2026-08-17T14:32:41.512', { zone: 'Australia/Sydney' });

describe('eventWindow', () => {
  it('defaults to exactly one day', () => {
    // Review History asks for a single day. If this ever quietly became two,
    // the screen would show yesterday's events under today's heading.
    const { startISO, endISO } = eventWindow(day);
    expect(startISO).toContain('2026-08-17T00:00:00.000');
    expect(endISO).toContain('2026-08-17T23:59:00.000');
  });

  it('spans N days ending on the given day', () => {
    // The horse's page asks for 10, matching the current app's per-horse feed:
    // the 8th through the 17th inclusive, not the 7th.
    const { startISO, endISO } = eventWindow(day, 10);
    expect(startISO).toContain('2026-08-08T00:00:00.000');
    expect(endISO).toContain('2026-08-17T23:59:00.000');
  });

  it('keeps the organization offset rather than converting to the device zone', () => {
    expect(eventWindow(day).startISO).toContain('+10:00');
  });

  it('rounds the end to the minute so the query key is stable across renders', () => {
    const later = day.set({ second: 59, millisecond: 999 });
    expect(eventWindow(later).endISO).toBe(eventWindow(day).endISO);
  });

  it('treats a zero or negative window as a single day', () => {
    expect(eventWindow(day, 0).startISO).toBe(eventWindow(day, 1).startISO);
    expect(eventWindow(day, -5).startISO).toBe(eventWindow(day, 1).startISO);
  });
});

describe('DEFAULT_EVENT_TYPES', () => {
  it('does not request Special Instructions', () => {
    // Type 7 is customer-typed text and therefore part of the removed Record
    // family (requirements §2, Inakshi 2026-08-17). The current app requests
    // it by default; restoring it here would put Record back in the product
    // through the back door.
    expect(DEFAULT_EVENT_TYPES).not.toContain(7);
  });

  it('includes Lying Down and all three partial-rolling ids', () => {
    // Two live bugs in the current screen: it asks for 570 where it means 100,
    // and sends 105 alone where For You expands to 103/104/105.
    expect(DEFAULT_EVENT_TYPES).toContain(100);
    [103, 104, 105].forEach((id) => expect(DEFAULT_EVENT_TYPES).toContain(id));
    expect(DEFAULT_EVENT_TYPES).not.toContain(570);
  });
});
