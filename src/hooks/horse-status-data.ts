import { DateTime } from 'luxon';

import type { IStall } from '@acme/services/api/stall-monitor-management/stall';
import {
  ACTIVENESS_LEVELS,
  IN_STALL_THRESHOLDS,
  NOISE_LEVELS,
} from '@/config/constants/prometheus-queries';

/**
 * Pure rules for the horse's live readings, outside the hook so they can be
 * characterized without a network or a clock.
 */

/**
 * What we can honestly say about where the horse is.
 *
 * The current app renders a pill for `true`, a pill for `false`, and **nothing
 * at all** for everything else — so "no camera", "still loading" and "the
 * reading was too ambiguous to call" are indistinguishable from each other and
 * from a horse that is simply fine. Five named states instead of two-and-a-gap
 * (parity gap A1; requirements §6b honest states).
 */
export type InStallStatus =
  | 'in-stall'
  | 'out-of-stall'
  | 'unsure'
  | 'no-camera'
  | 'loading'
  | 'unavailable';

export interface InStallInput {
  /** Raw Prometheus value, or undefined when the query returned nothing. */
  value: number | undefined;
  /** Is a stall monitor fitted at all? */
  hasMonitor: boolean;
  /**
   * Can that monitor's metrics actually be queried?
   *
   * Separate from `hasMonitor` deliberately. A stall can have a monitor and no
   * `prometheus_url`, and calling that "No camera" contradicted the tile above
   * it, which reads a different field (review, 2026-08-17). A monitor we
   * cannot reach is unavailable, not absent.
   */
  canQuery: boolean;
  isLoading: boolean;
  isError: boolean;
}

export function deriveInStallStatus({
  value,
  hasMonitor,
  canQuery,
  isLoading,
  isError,
}: InStallInput): InStallStatus {
  if (!hasMonitor) return 'no-camera';
  if (!canQuery) return 'unavailable';
  if (isError) return 'unavailable';
  if (isLoading) return 'loading';
  if (value == null || Number.isNaN(value)) return 'unavailable';

  // The exclusion band: the current app returns `undefined` here and then
  // draws nothing, which reads as "out of stall" to anyone looking. Saying
  // "not sure" is the only honest answer for a reading this ambiguous.
  if (value >= IN_STALL_THRESHOLDS.excludeLower && value <= IN_STALL_THRESHOLDS.excludeUpper) {
    return 'unsure';
  }

  return value >= IN_STALL_THRESHOLDS.inStallCutOff ? 'in-stall' : 'out-of-stall';
}

export const IN_STALL_LABELS: Record<InStallStatus, string> = {
  'in-stall': 'In stall',
  'out-of-stall': 'Out of stall',
  unsure: 'Not sure',
  'no-camera': 'No camera',
  loading: 'Checking…',
  unavailable: 'Unavailable',
};

/** Longer line, so the state explains itself rather than needing a legend. */
export const IN_STALL_DETAIL: Record<InStallStatus, string> = {
  'in-stall': 'The camera can see the horse in its stall.',
  'out-of-stall': 'The camera cannot see the horse in its stall.',
  unsure: 'The reading is between in and out — too close to call.',
  'no-camera': 'This horse has no stall monitor, so there is nothing to read.',
  loading: 'Reading the stall monitor.',
  unavailable: 'The stall monitor did not answer.',
};

function categorise(
  value: number | undefined,
  levels: readonly { label: string; value: number }[],
): string | undefined {
  if (value == null || Number.isNaN(value)) return undefined;
  return levels.find((level) => value >= level.value)?.label ?? levels[levels.length - 1]?.label;
}

export const noiseCategory = (value: number | undefined) => categorise(value, NOISE_LEVELS);

/**
 * Data Science's score-card bands are not all inclusive in the same
 * direction: 100 and 900 are Normal; only a value strictly above 900 is High.
 * Keeping this explicit prevents a generic `>=` threshold helper from turning
 * the boundary value 900 into High.
 */
export function activenessCategory(value: number | undefined): string | undefined {
  if (value == null || Number.isNaN(value)) return undefined;
  if (value > ACTIVENESS_LEVELS[0].value) return 'High';
  if (value >= ACTIVENESS_LEVELS[1].value) return 'Normal';
  return 'Low';
}

/** Celsius in, the user's unit out. */
export function formatTemperature(celsius: number | undefined, isMetric: boolean) {
  if (celsius == null || Number.isNaN(celsius)) return undefined;
  return isMetric ? `${Math.round(celsius)}°C` : `${Math.round(celsius * 1.8 + 32)}°F`;
}

export type ScoreCardState =
  | 'available'
  | 'cached'
  | 'loading'
  | 'out-of-stall'
  | 'unavailable';

export interface ScoreCardDisplay {
  value: string;
  state: ScoreCardState;
  detail?: string;
}

/** The live cache is intentionally short: an old barn reading must not look current. */
export const LIVE_SCORE_CACHE_MS = 15 * 60 * 1000;

export function deriveScoreCardDisplay({
  value,
  canQuery,
  isLoading,
  isError,
  isLive,
  isOnline,
  cacheAgeMs,
  horseIsOut = false,
}: {
  value: string | undefined;
  canQuery: boolean;
  isLoading: boolean;
  isError: boolean;
  isLive: boolean;
  isOnline: boolean;
  cacheAgeMs: number | undefined;
  horseIsOut?: boolean;
}): ScoreCardDisplay {
  if (horseIsOut) return { value: 'Out of stall', state: 'out-of-stall' };
  if (!canQuery) return { value: 'Unavailable', state: 'unavailable' };

  const hasValue = value != null;
  if (isLoading && !hasValue) return { value: 'Checking…', state: 'loading' };
  if (!hasValue) return { value: 'Unavailable', state: 'unavailable' };

  if (isLive && cacheAgeMs != null && (!isOnline || isError)) {
    if (cacheAgeMs > LIVE_SCORE_CACHE_MS) {
      return { value: 'Unavailable', state: 'unavailable' };
    }
    const minutes = Math.max(1, Math.floor(cacheAgeMs / 60_000));
    return { value, state: 'cached', detail: `Updated ${minutes} min ago` };
  }

  return { value, state: 'available' };
}

/**
 * Whether the monitor is still in its settling-in window.
 *
 * `now` is an argument rather than a `DateTime.now()` inside, because the
 * current app captures it once with `useState(DateTime.now())` at mount — so a
 * page left open keeps saying "still gathering data" long after the window has
 * passed, and the same frozen clock decides the In/Out pill. Taking a live
 * clock from the caller designs the whole class of bug out (parity C7).
 */
export function isMetricsHidden(hideUntilISO: string | undefined, now: DateTime): boolean {
  if (!hideUntilISO) return false;
  const hideUntil = DateTime.fromISO(hideUntilISO);
  return hideUntil.isValid && now < hideUntil;
}

/** The page-wide "we cannot show readings" message, if any applies. */
export type DetailOverlay =
  | 'none'
  | 'no-stall'
  | 'metrics-hidden'
  | 'unsupported'
  | 'details-unavailable';

export interface OverlayInput {
  stall: IStall | undefined;
  /**
   * True only when the horse's details actually LOADED. An errored request is
   * not a resolved one: treating it as such made a failed fetch render
   * "No stall monitor" as a statement of fact about a horse that may well have
   * one (review, 2026-08-17).
   */
  hasResolvedStall: boolean;
  /** The details request failed. We do not know, and must not guess. */
  detailsFailed?: boolean;
  now: DateTime;
}

export function deriveOverlay({
  stall,
  hasResolvedStall,
  detailsFailed,
  now,
}: OverlayInput): DetailOverlay {
  // Checked first: everything below reads fields we do not have.
  if (detailsFailed) return 'details-unavailable';
  if (!hasResolvedStall) return 'none';

  // Checked before "no stall": an unsupported monitor is a more specific and
  // more useful thing to say than "no monitor".
  const compatibility = stall?.AppMetaData?.model_compatibility as
    | { is_supported?: boolean }
    | undefined;
  if (compatibility?.is_supported === false) return 'unsupported';

  if (!stall) return 'no-stall';
  if (isMetricsHidden(stall.hide_metrics_till, now)) return 'metrics-hidden';
  return 'none';
}

export const OVERLAY_COPY: Record<
  Exclude<DetailOverlay, 'none'>,
  { title: string; detail: string }
> = {
  'no-stall': {
    title: 'No stall monitor',
    detail:
      'Live readings, events and charts appear once this horse is in a stall with a monitor.',
  },
  'metrics-hidden': {
    title: 'Getting to know your horse',
    detail:
      'The monitor is gathering enough data to be accurate. Readings appear automatically once it has.',
  },
  unsupported: {
    title: 'This view is not supported',
    detail:
      'The monitor in this stall cannot produce these readings. Support can tell you what it does cover.',
  },
  'details-unavailable': {
    title: 'Readings unavailable',
    detail:
      "We couldn't load this horse's details, so we can't say what its monitor is reporting. Pull down to try again.",
  },
};
