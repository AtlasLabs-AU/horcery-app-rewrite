import type { IEvent } from '@acme/services/api/event-management/event';
import { EVENT_TYPE_ID } from '@acme/config/constants/event-types';
import {
  formatDuration,
  formatEventTime,
  iconForEventType,
  toHistoryEvent,
} from '@/components/review-history/event-rows';

const event = (overrides: Partial<IEvent> = {}): IEvent => ({
  id: 'e1',
  title: 'Lying Down',
  start_time: '2026-08-15T22:32:00.000Z',
  event_type: 100,
  duration: '2520',
  ...overrides,
});

describe('formatEventTime', () => {
  it('renders in the organization timezone, not the device zone', () => {
    // 22:32 UTC on the 15th is 08:32 on the 16th in Sydney. A phone in Sydney
    // showing a Sydney barn's event must say the 16th; the same event for a
    // London barn must say the 15th. This is the bug caught on device
    // 2026-08-15 — the card must never re-parse the ISO string itself.
    expect(formatEventTime('2026-08-15T22:32:00.000Z', 'Australia/Sydney')).toBe(
      '16 Aug 2026 8:32 AM',
    );
    expect(formatEventTime('2026-08-15T22:32:00.000Z', 'Europe/London')).toBe(
      '15 Aug 2026 11:32 PM',
    );
  });

  it('returns an empty string when there is no timestamp', () => {
    expect(formatEventTime(undefined, 'UTC')).toBe('');
  });
});

describe('formatDuration', () => {
  it('steps from seconds to minutes to hours', () => {
    expect(formatDuration(18)).toBe('18s');
    expect(formatDuration(90)).toBe('2m');
    expect(formatDuration(2520)).toBe('42m');
    expect(formatDuration(4320)).toBe('1h 12m');
  });
});

describe('toHistoryEvent', () => {
  it('treats a zero-duration event as having no footage', () => {
    // The guard the current app added to History but never back-ported to For
    // You: without it a card offers a play badge for a clip that does not
    // exist.
    expect(toHistoryEvent(event({ duration: '0' })).hasClip).toBe(false);
    expect(toHistoryEvent(event({ duration: undefined })).hasClip).toBe(false);
    expect(toHistoryEvent(event()).hasClip).toBe(true);
    expect(toHistoryEvent(event()).durationLabel).toBe('42m');
  });

  it('builds the real still and recorded stream only from a streamable stall', () => {
    const mapped = toHistoryEvent(
      event({
        end_time: '2026-08-15T23:14:00.000Z',
        stall: {
          name: 'Stall 2',
          stall_url: 'https://monitor.example/live/sm-93/dash/manifest.mpd',
          UserMetaData: { audio_enable: true },
        } as never,
      }),
    );

    expect(mapped.posterUri).toMatch(
      /^https:\/\/monitor\.example\/live\/sm-93\/frames\/\d+\.jpeg$/,
    );
    expect(mapped.videoUri).toContain('/stream_management/audio_video/93/');
    expect(mapped.videoUri).toContain('?quality=low');

    const unstreamable = toHistoryEvent(
      event({
        stall: {
          name: 'Stall 2',
          stall_url: 'https://monitor.example/live/no-monitor/dash/manifest.mpd',
          UserMetaData: {},
        } as never,
      }),
    );
    expect(unstreamable.posterUri).toBeUndefined();
    expect(unstreamable.videoUri).toBeUndefined();
  });

  it('marks alerts and partial-rolling ids as alerts', () => {
    expect(toHistoryEvent(event({ event_type: EVENT_TYPE_ID.alert })).isAlert).toBe(true);
    [103, 104, 105].forEach((typeId) => {
      expect(toHistoryEvent(event({ event_type: typeId })).isAlert).toBe(true);
    });
    expect(toHistoryEvent(event({ event_type: 100 })).isAlert).toBe(false);
  });

  it('drops the horse name when the page is already about that horse', () => {
    const withAnimal = event({ animal: { animal_name: 'Storm' } });
    expect(toHistoryEvent(withAnimal).animalName).toBe('Storm');
    expect(toHistoryEvent(withAnimal, { omitAnimalName: true }).animalName).toBeUndefined();
  });

  it('reads the stall from either the expanded relation or the flat field', () => {
    expect(toHistoryEvent(event({ stall_id: { name: 'Stall 7' } as never })).stallName).toBe(
      'Stall 7',
    );
    expect(toHistoryEvent(event({ stall: { name: 'Stall 2' } as never })).stallName).toBe('Stall 2');
  });

  it('falls back to a generic icon rather than drawing nothing', () => {
    expect(iconForEventType(100)).toBe('lyingDown');
    expect(iconForEventType(EVENT_TYPE_ID.alert)).toBe('alerts');
    // Type 7 (Special Instructions) is part of the removed Record family and
    // is never requested; if one ever arrived it must still render.
    expect(iconForEventType(7)).toBe('info');
    expect(iconForEventType(9999)).toBe('info');
  });

  it('always produces a key, even for an event with no id', () => {
    expect(toHistoryEvent(event({ id: undefined })).id).toBe('2026-08-15T22:32:00.000Z-100');
  });
});
