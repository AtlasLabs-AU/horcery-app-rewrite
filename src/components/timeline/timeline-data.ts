import { DateTime } from 'luxon';

/**
 * The arithmetic behind the scrubbing timeline (slice 4c, decision D2).
 *
 * Everything here is pure and frame-independent, so the parts that decide
 * *where a moment sits* can be tested without a renderer, a gesture or a
 * device. The component next door owns only gestures and drawing.
 *
 * ## What was ported, and what was not
 *
 * The current app's `horizontal-timeline-widget` is 1,060 lines across six
 * files. Its *rhythm* — six hours to a screen, and the tick ladder in
 * `getTickDuration` — is a genuine design decision made by someone watching
 * real footage, and it is ported here unchanged.
 *
 * Its *machinery* is not. That widget is a horizontal `ScrollView` holding
 * thirteen fixed six-hour segments, each rendering every tick in its six
 * hours whatever the zoom, with the time↔pixel conversion run on the JS
 * thread inside `onScroll`, and with programmatic `scrollTo` calls corrected
 * by three separate mutable flags (`isProgrammaticScroll`,
 * `isProgrammaticScrollWithCallback`, `isScrollingRef`). The repository still
 * carries the branches that fight it: `timeline-desyncing--issue`,
 * `timeline-ticking-background-state`, `zoom-timeline-test`,
 * `zoom-timeline-test-1`, `zoom-timeline-testing`.
 *
 * ## Zoom does not work in the shipping app
 *
 * This is worth stating plainly, because D2 chose "port the full zoomed
 * timeline" over a simpler first version. In `84-horcery-app-react-native`:
 *
 *   - the pinch gesture is commented out (`index.tsx` lines 577–593);
 *   - `ZoomProvider` is mounted with `initialZoom={1}`;
 *   - nothing anywhere in the app calls `setZoom` or `updateZoom` — verified
 *     by grep across `packages/` and `apps/expo/src`.
 *
 * So the shipping timeline runs at zoom 1 for its whole life, and six of the
 * seven branches of `getTickDuration` are unreachable. A faithful port would
 * have reproduced an inert feature. This slice ports the ladder AND makes
 * pinch work, which is what D2 was asking for.
 *
 * There is a structural reason the zoom was probably abandoned: with thirteen
 * fixed six-hour segments, zoom 100 asks for 6h ÷ 30s = 720 minor ticks per
 * segment, or ~9,400 views. The windowing here (`ticksIn`, over the visible
 * span only) keeps the count near-constant at every zoom instead — see
 * `tickStep`.
 */

/**
 * How much time one screen width shows at zoom 1.
 *
 * The current app's `SEGMENT_DURATION`: a segment is one screen wide and six
 * hours long, so this is the same scale, reached by a different road.
 */
export const SECONDS_PER_SCREEN_AT_ZOOM_1 = 6 * 60 * 60;

export const MIN_ZOOM = 1;
/** 100 screens to six hours — about three and a half minutes across. */
export const MAX_ZOOM = 100;

/**
 * The zoom levels a pinch can land on — one per rung of the tick ladder.
 *
 * Zoom is detented rather than continuous, and the reason is the tick ladder
 * itself. `tickStep` changes density in seven bands, so a continuous zoom
 * spends most of its range producing no visible change and then re-ladders
 * abruptly at a band edge — while forcing the JS thread to re-draw the ticks
 * many times a second throughout, which is the exact cost this component was
 * built to avoid.
 *
 * One detent per band means every pinch step visibly re-ladders, at most one
 * re-draw per step, and the timeline never settles at a scale where the ticks
 * sit at an awkward spacing. `MIN_ZOOM` and `MAX_ZOOM` are the ends of it.
 */
export const ZOOM_DETENTS = [1, 2, 4, 7, 15, 50, 100] as const;

/**
 * The detent nearest a continuous pinch scale.
 *
 * Marked `worklet` because the pinch handler runs on the UI thread and calls
 * it there; without the directive reanimated cannot carry it across and the
 * gesture throws on the first frame.
 */
export function nearestDetent(zoom: number): number {
  'worklet';
  let nearest: number = ZOOM_DETENTS[0];
  for (const detent of ZOOM_DETENTS) {
    if (Math.abs(detent - zoom) < Math.abs(nearest - zoom)) nearest = detent;
  }
  return nearest;
}

export function clampZoom(zoom: number): number {
  if (Number.isNaN(zoom)) return MIN_ZOOM;
  return Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, zoom));
}

/**
 * Pixels per second at a given width and zoom.
 *
 * The one conversion the whole component rests on: a position is a time, a
 * drag is a duration. Guarded against a zero width because `onLayout` has not
 * fired on the first render and a division by zero would poison every shared
 * value downstream with NaN.
 */
export function pixelsPerSecond(width: number, zoom: number): number {
  if (width <= 0) return 0;
  return (width * clampZoom(zoom)) / SECONDS_PER_SCREEN_AT_ZOOM_1;
}

/** How many seconds are visible across `width` at this zoom. */
export function visibleSeconds(zoom: number): number {
  return SECONDS_PER_SCREEN_AT_ZOOM_1 / clampZoom(zoom);
}

export interface TickStep {
  /** Seconds between labelled ticks. */
  major: number;
  /** Seconds between unlabelled ticks. */
  minor: number;
}

/**
 * The tick ladder, ported verbatim from the current app's `getTickDuration`.
 *
 * Its shape is the point: every rung keeps roughly six labelled ticks and
 * thirty-odd small ones on screen, whatever the zoom. That is why windowed
 * rendering stays cheap at zoom 100 — the tick *count* barely moves, only the
 * span they cover.
 *
 * Every step divides an hour exactly (3600 / 150 = 24, 3600 / 75 = 48, and so
 * on), which is what lets `ticksIn` anchor the ladder to a wall-clock hour and
 * step forward without the ticks drifting off the hour marks.
 */
export function tickStep(zoom: number): TickStep {
  const z = clampZoom(zoom);
  switch (true) {
    case z < 1.5:
      return { major: 60 * 60, minor: 60 * 10 }; // 1hr : 10min
    case z < 3:
      return { major: 30 * 60, minor: 30 * 10 }; // 30min : 5min
    case z < 5:
      return { major: 20 * 60, minor: 15 * 10 }; // 20min : 2.5min
    case z < 10:
      return { major: 10 * 60, minor: 15 * 5 }; // 10min : 1.25min
    case z < 30:
      return { major: 5 * 60, minor: 15 * 5 }; // 5min : 1.25min
    case z <= 75:
      return { major: 2 * 60, minor: 15 }; // 2min : 15sec
    default:
      return { major: 60, minor: 30 }; // 1min : 30sec
  }
}

export interface Tick {
  /** Epoch seconds. */
  at: number;
  major: boolean;
  /** Only on major ticks — the wall-clock label, in the organization's zone. */
  label?: string;
}

/**
 * Every tick between `from` and `to`, anchored to wall-clock hours in `zone`.
 *
 * Anchoring is done with luxon rather than the current app's offset
 * arithmetic (`time.offset * 60`, applied in four places and reversed in two).
 * That arithmetic is correct only while the offset is constant; on the two
 * days a year a zone changes, the ladder there slides by an hour relative to
 * the labels it is drawing. Asking luxon for the hour boundary in the
 * organization's zone is both shorter and right on those days.
 *
 * It is also the organization's zone, not the phone's — the same clock the
 * rest of the page runs on (`useOrganizationNow`). A manager in Sydney
 * checking a Victorian barn should read barn hours here, as they do
 * everywhere else on this page.
 */
export function ticksIn(
  from: number,
  to: number,
  step: TickStep,
  zone: string | undefined,
): Tick[] {
  if (!(to > from) || step.minor <= 0) return [];

  // Cheap guard against a pathological span (a bad width, a NaN zoom) asking
  // for a million views. At every rung of the ladder a screen holds ~40 ticks,
  // and the component renders about three screens.
  const MAX_TICKS = 600;
  if ((to - from) / step.minor > MAX_TICKS) return [];

  const start = DateTime.fromSeconds(from, { zone }).startOf('hour');
  const ticks: Tick[] = [];

  let hour = start;
  // `plus({ hours: 1 })` walks wall-clock hours, so a zone change moves the
  // ladder with the clock instead of leaving it an hour out for the rest of
  // the day.
  while (hour.toSeconds() < to) {
    const hourStart = hour.toSeconds();
    for (let offset = 0; offset < 3600; offset += step.minor) {
      const at = hourStart + offset;
      if (at < from) continue;
      if (at > to) break;
      const major = offset % step.major === 0;
      ticks.push(
        major
          ? { at, major: true, label: DateTime.fromSeconds(at, { zone }).toFormat('h:mm a') }
          : { at, major: false },
      );
    }
    hour = hour.plus({ hours: 1 });
  }

  return ticks;
}

/**
 * Keep an instant inside the range the page will actually answer for.
 *
 * `worklet` for the same reason as `nearestDetent`: the pan handler clamps on
 * the UI thread, once per frame.
 */
export function clampInstantSeconds(at: number, earliest: number, latest: number): number {
  'worklet';
  if (Number.isNaN(at)) return latest;
  if (at > latest) return latest;
  if (at < earliest) return earliest;
  return at;
}

/**
 * The label on the scrubbing bubble.
 *
 * Seconds are shown because at high zoom a tick *is* fifteen seconds, and a
 * bubble reading "3:14 AM" while you move across four ticks would look broken.
 */
export function scrubLabel(at: number, zone: string | undefined): string {
  return DateTime.fromSeconds(at, { zone }).toFormat('h:mm:ss a');
}
