import { DateTime } from 'luxon';

import type { IEvent } from '@acme/services/api/event-management/event';
import { EVENT_TYPE_ID } from '@acme/config/constants/event-types';
import type { HistoryEvent } from '@/components/review-history/event-card';
import type { IconName } from '@/components/ui/icon-names';

/**
 * The one place an API event becomes a drawable row.
 *
 * Extracted from `review-history.tsx` on 2026-08-17 when the Horse Details
 * page needed the same rows (its Events and Alerts tabs are Review History
 * scoped to one horse). Two screens formatting the same event two ways is how
 * "42m" becomes "42 min" on one of them; there is one mapping and both use it.
 *
 * Type 7 (Special Instructions) has no entry: it is part of the removed Record
 * family (requirements §2) and the app never asks for it. Anything unmapped
 * falls back to `info` rather than drawing nothing.
 */
const ICON_FOR_TYPE: Record<number, IconName> = {
  80: 'entering',
  81: 'exiting',
  100: 'lyingDown',
  102: 'rolling',
  103: 'rolling',
  104: 'rolling',
  105: 'rolling',
  200: 'peopleInStall',
  204: 'peopleInStall',
  205: 'peopleInteraction',
  [EVENT_TYPE_ID.alert]: 'alerts',
};

/** Partial-rolling ids read as alerts in the current app, and still do here. */
const ALERT_LIKE_TYPES = [103, 104, 105];

export function iconForEventType(typeId: number): IconName {
  return ICON_FOR_TYPE[typeId] ?? 'info';
}

/**
 * Timestamps are shown in the ORGANIZATION's zone, never the phone's.
 *
 * `DateTime.fromISO` resolves to the device zone; a phone 10.5 hours ahead of
 * the barn showed a 15 Aug event as "16 Aug 09:32" (caught on device
 * 2026-08-15). Pass the organization timezone and the card gets a string it
 * must not re-parse.
 */
export function formatEventTime(iso: string | undefined, timezone?: string | null) {
  if (!iso) return '';
  const time = DateTime.fromISO(iso);
  return (timezone ? time.setZone(timezone) : time).toFormat('dd LLL yyyy h:mm a');
}

export function formatDuration(seconds: number) {
  if (seconds < 60) return `${Math.round(seconds)}s`;
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes}m`;
  return `${Math.floor(minutes / 60)}h ${minutes % 60}m`;
}

export interface EventRowOptions {
  timezone?: string | null;
  /**
   * Drop the horse's name from the caption. On the Horses list every card
   * needs to say which horse it is; on one horse's own page the name is the
   * page title, and repeating it on every frame is noise.
   */
  omitAnimalName?: boolean;
}

/** Pure map, kept outside the screens so its behaviour is cheap to test. */
export function toHistoryEvent(event: IEvent, options: EventRowOptions = {}): HistoryEvent {
  const { timezone, omitAnimalName } = options;
  const typeId = event.event_type ?? 0;
  const isAlert = typeId === EVENT_TYPE_ID.alert || ALERT_LIKE_TYPES.includes(typeId);
  const stall = typeof event.stall_id === 'object' ? event.stall_id : event.stall;
  const durationSeconds = Number(event.duration ?? 0);
  const animalName = event.animal?.animal_name ?? event.animal?.registered_name;

  return {
    id: event.id ?? `${event.start_time}-${typeId}`,
    title: event.title,
    startTime: event.start_time ?? '',
    timeLabel: formatEventTime(event.start_time, timezone),
    // Only behaviour events with real duration have footage — the guard the
    // current app added to History but never back-ported to For You.
    hasClip: durationSeconds > 0,
    durationLabel: durationSeconds > 0 ? formatDuration(durationSeconds) : undefined,
    blurhash: event.event_blur_hash,
    animalName: omitAnimalName ? undefined : animalName,
    stallName: stall?.name,
    isAlert,
    icon: iconForEventType(typeId),
  };
}

export function toHistoryEvents(events: IEvent[], options: EventRowOptions = {}) {
  return events.map((event) => toHistoryEvent(event, options));
}
