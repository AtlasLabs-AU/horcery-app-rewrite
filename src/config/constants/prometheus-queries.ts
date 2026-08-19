/**
 * The PromQL this app sends, ported verbatim from the current app's
 * `prom-utils.ts`. **Do not reword these**: a query is a measurement
 * definition, and an "improved" one silently changes what a customer is told
 * about their horse.
 *
 * ## Where these actually come from, and why it matters
 *
 * The current app reads each of these from **Firebase Remote Config first**
 * and falls back to the string below when the console value is empty — which
 * it is by default (`DEFAULT_FRC_VALUES.string` is `''`). So in practice the
 * code query runs unless someone has typed a replacement into a Firebase web
 * form, at which point every phone starts asking a different question within
 * five minutes, with no review and no history.
 *
 * The rewrite does not read Remote Config at all yet — that is the open
 * decision in requirements §6a-i (GitHub issue #1, task #13). Until it is
 * settled the app runs on exactly these, and says so on screen (Inakshi's
 * decision D7, 2026-08-17): a page quietly answering a stale question is the
 * failure mode we said we would not ship.
 *
 * Remote Config keys are noted beside each query so the wiring is obvious
 * whenever that decision lands.
 */

/** `IN_STALL_DETECTION_QUERY` — is the horse in its stall right now. */
export const ANIMAL_IN_STALL = 'avg_over_time(horse_in_stall[1m30s])';

/**
 * No Remote Config key: the current app always uses this one from code.
 * Returns temperature, humidity, noise and light in a single response, which
 * is why the stats strip costs one request rather than four.
 */
export const STATISTICS_CARD_DATA =
  '{__name__=~"external_temperature|average_volume|humidity|lux",handler="SENSOR_SERVICE"}';

/**
 * The current Activeness score-card measurement.
 *
 * Data Science supplied this replacement on 2026-07-28; Inakshi confirmed on
 * 2026-08-18 that it is the newest definition and supersedes both the legacy
 * app and the still-stale Mobile Queries sheet. Keep that provenance beside
 * the query so an older inventory cannot silently roll it back.
 */
export const ACTIVENESS_STATISTICS_DATA =
  'avg_over_time((horse_head_wither_abs_orientation_angle{animal_type="horse"} + horse_tail_wither_abs_orientation_angle{animal_type="horse"})[30s:5s])';

/** Metric names inside the statistics response. */
export const SENSOR_METRIC = {
  temperature: 'external_temperature',
  humidity: 'humidity',
  noise: 'average_volume',
  light: 'lux',
} as const;

/**
 * Thresholds, ported from the current app's `thresholds.ts`.
 *
 * `EXCLUDE_IN_STALL_LOWER/UPPER_THRESHOLD` are Remote-Config overridable
 * there; the rest are code-only.
 */
export const IN_STALL_THRESHOLDS = {
  /** Between these two the reading is too ambiguous to claim either way. */
  excludeLower: 0.3,
  excludeUpper: 0.7,
  /** At or above this, the horse is in its stall. */
  inStallCutOff: 0.5,
} as const;

export const NOISE_LEVELS = [
  { label: 'High', value: 60 },
  { label: 'Med', value: 40 },
  { label: 'Low', value: 20 },
] as const;

export const ACTIVENESS_LEVELS = [
  { label: 'High', value: 900 },
  { label: 'Normal', value: 100 },
  { label: 'Low', value: 0 },
] as const;
