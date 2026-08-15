/**
 * Event type ids, as the backend numbers them. Ported from the current app's
 * `event-types.ts` (ids only — the icons there are SVG assets we don't carry).
 */
export const EVENT_TYPE_ID = {
  stallCheck: 2,
  waterCheck: 3,
  stallCleaning: 4,
  alert: 9,
} as const;
