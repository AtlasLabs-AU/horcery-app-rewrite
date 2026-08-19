import { DateTime } from 'luxon';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { LayoutChangeEvent, StyleSheet, Text, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  runOnJS,
  useAnimatedReaction,
  useAnimatedStyle,
  useFrameCallback,
  useSharedValue,
  withDecay,
} from 'react-native-reanimated';

import { radius, space, type } from '@/constants/tokens';
import {
  clampInstantSeconds,
  nearestDetent,
  pixelsPerSecond,
  scrubLabel,
  tickStep,
  ticksIn,
  visibleSeconds,
  ZOOM_DETENTS,
} from '@/components/timeline/timeline-data';
import { useTokens } from '@/hooks/use-tokens';

/**
 * The scrubbing timeline under the hero — Horse Details slice 4c (D2).
 *
 * Drag it to move through the day; pinch to change how much of the day a
 * screen holds. The centre line is always "the moment you are looking at", and
 * the page's cursor follows it once you let go.
 *
 * The arithmetic lives next door in `timeline-data.ts`, which also records
 * what was ported from the current app's widget and what was deliberately left
 * behind — including the finding that its zoom has never worked.
 *
 * ## Why this is not a ScrollView
 *
 * The current app drives its timeline from a horizontal `ScrollView`'s
 * `onScroll`, converting pixels to time on the JS thread at 60Hz and issuing
 * corrective `scrollTo` calls guarded by three mutable flags. Every drag
 * competes with React for the same thread, and the corrections are what the
 * `timeline-desyncing--issue` branch is named after.
 *
 * Here the drag runs entirely on the UI thread: one shared value holds the
 * instant under the centre line, and a single transform moves the track. The
 * JS thread is asked for exactly two things — a new set of ticks when the view
 * has drifted half a screen from the last set, and the scrub label — so a
 * dropped JS frame costs a label, never the motion. That is the difference
 * that decides whether this is usable on the Redmi Note 12.
 *
 * ## How the track stays consistent while it is being re-drawn
 *
 * Ticks are windowed: only about three screens' worth exist at any moment,
 * around an anchor. When the anchor moves, the track's `left` and every tick's
 * `left` change **in the same React commit**, and they cancel exactly — so the
 * transform never has to be corrected to compensate, and there is no frame
 * where the UI thread and the JS thread disagree about where a tick belongs.
 * The transform depends only on the view instant and the scale, both of which
 * the worklet already owns. This is the whole reason the three flags the
 * current app needs are absent here.
 *
 * ## Shared values and the React Compiler
 *
 * `react-hooks/immutability` reports every `sharedValue.value = x` as
 * modifying something React considers immutable. It is wrong about Reanimated
 * — a shared value is a deliberately mutable UI-thread box, not React state —
 * and it cannot be taught otherwise, so the rule is off for this directory and
 * this directory only. `eslint.config.js` carries the reasoning.
 *
 * What that does NOT excuse: shared values are still never read or written
 * inside a `useEffect`. Reanimated's own hooks — `useAnimatedReaction`,
 * `useFrameCallback`, gesture callbacks — are where UI-thread state belongs,
 * and every one of them below could otherwise have been an effect that races
 * the render it was meant to follow.
 */

/** Screens of ticks kept mounted, centred on the anchor. */
const RENDER_SCREENS = 3;
/** Re-window once the view has drifted this fraction of a screen from the anchor. */
const REANCHOR_FRACTION = 0.5;

const TICK_BASELINE = 48;
const MAJOR_TICK_HEIGHT = 14;
const MINOR_TICK_HEIGHT = 7;
const LABEL_WIDTH = 64;
const DEFAULT_HEIGHT = 76;
/** A horse with no creation date still gets a floor rather than the epoch. */
const FALLBACK_HISTORY_SECONDS = 365 * 24 * 60 * 60;
/** How far the page's cursor must move before the track jumps to meet it. */
const CURSOR_FOLLOW_THRESHOLD_SECONDS = 5;

export interface ScrubTimelineProps {
  /** The instant the page is currently reading — the timeline follows it. */
  cursor: DateTime;
  /** The latest instant that may be selected (the play-head's live edge). */
  latest: DateTime;
  /** The horse's first day; nothing exists before it. */
  earliest?: DateTime;
  /**
   * The organization's zone — the clock the rest of the page runs on.
   * Undefined until the organization loads, when luxon falls back to the
   * device's own zone, exactly as the event lists on this page already do.
   */
  zone: string | undefined;
  /** True while the cursor is tracking live, so the track keeps moving. */
  isLive: boolean;
  /** Called when a drag settles, with the instant under the centre line. */
  onScrub: (at: DateTime) => void;
  /** Called as a drag starts and ends, so the hero can stop playing mid-drag. */
  onScrubbingChange?: (scrubbing: boolean) => void;
  height?: number;
}

export function ScrubTimeline({
  cursor,
  latest,
  earliest,
  zone,
  isLive,
  onScrub,
  onScrubbingChange,
  height = DEFAULT_HEIGHT,
}: ScrubTimelineProps) {
  const { colors } = useTokens();
  const [width, setWidth] = useState(0);
  const [zoom, setZoom] = useState<number>(ZOOM_DETENTS[0]);

  const cursorSeconds = cursor.toSeconds();
  const latestSeconds = latest.toSeconds();
  const earliestSeconds = earliest
    ? earliest.toSeconds()
    : latestSeconds - FALLBACK_HISTORY_SECONDS;

  /**
   * All pixel arithmetic is measured from this instant rather than from the
   * epoch.
   *
   * Epoch seconds times a scale gives transforms around 3×10⁷ pixels, a range
   * where a 32-bit float resolves about two pixels — the ticks would visibly
   * quantise as they moved. Measuring from the instant the page opened on
   * keeps every number small enough to be exact.
   */
  const [baseSeconds] = useState(cursorSeconds);

  const pps = pixelsPerSecond(width, zoom);
  const halfWidth = width / 2;
  const screenSeconds = visibleSeconds(zoom);
  const windowSeconds = (RENDER_SCREENS / 2) * screenSeconds;
  const windowPixels = windowSeconds * pps;

  /** The instant under the centre line. The single source of motion. */
  const view = useSharedValue(cursorSeconds);
  const held = useSharedValue(false);
  /** Guards the re-window request so one drift does not queue a frame's worth. */
  const anchorRequested = useSharedValue(cursorSeconds);
  const pinchStartZoom = useSharedValue<number>(ZOOM_DETENTS[0]);
  /**
   * The zoom the pinch worklet reads and writes.
   *
   * Mirrored rather than closed over so the gesture object does not have to be
   * rebuilt every time a detent is crossed — rebuilding a gesture the finger is
   * still holding is how a pinch dies half way through.
   */
  const zoomShared = useSharedValue<number>(ZOOM_DETENTS[0]);

  const [label, setLabel] = useState<string | null>(null);

  /**
   * Where the rendered window is centred. Moved by dragging, via the
   * re-windowing reaction below.
   */
  const [anchor, setAnchor] = useState(cursorSeconds);

  /**
   * Re-centre the window whenever the PAGE moves the cursor — a date-bar tap,
   * "back to today", later an event's "show me this moment".
   *
   * React's documented "adjust state when a prop changes" idiom, deliberately
   * during render rather than in an effect, so the ticks and the transform
   * change in the same commit and there is never a frame drawn around the
   * wrong instant.
   *
   * An earlier version derived this instead — "use the cursor when the anchor
   * is more than a screen away, unless a finger is down" — and it blanked the
   * track (found on device, 2026-08-19). Step to Yesterday and the anchor is
   * still on today, so the derivation quietly used the cursor; put a finger
   * down and the `!scrubbing` half stopped holding, the window snapped back to
   * today's anchor a whole day from the view, and every tick left the screen.
   * A window centre that depends on whether you are touching it is not a
   * centre.
   */
  const [anchoredTo, setAnchoredTo] = useState(cursorSeconds);
  if (anchoredTo !== cursorSeconds) {
    setAnchoredTo(cursorSeconds);
    setAnchor(cursorSeconds);
  }

  const ticks = useMemo(
    () =>
      width > 0 ? ticksIn(anchor - windowSeconds, anchor + windowSeconds, tickStep(zoom), zone) : [],
    [anchor, windowSeconds, zoom, zone, width],
  );

  // ---- Following the page ------------------------------------------------
  /**
   * The date bar, "back to today", and later an event's "show me this moment"
   * all move the page's cursor. The track follows unless a finger owns it.
   *
   * A reaction rather than an effect, and not for style: reading or writing a
   * shared value inside `useEffect` marks it immutable for the rest of the
   * file, after which every `.value =` in the gestures below is a compiler
   * error. Reanimated's own hooks are the way to touch shared values.
   *
   * Note how this one fires: its prepare returns a plain captured number, not
   * a shared value, so it has nothing on the UI thread to watch. What runs it
   * is the dependency array — reanimated re-registers the mapper when
   * `cursorSeconds` changes and runs it once on registration. That is exactly
   * the trigger wanted here, but it is worth naming: drop `cursorSeconds` from
   * the deps and this reaction would silently never run again.
   *
   * The five-second threshold is what stops the live clock fighting this.
   * While live the page's cursor advances a minute at a time as
   * `useOrganizationNow` ticks, and the frame callback below is already
   * carrying the track forward second by second — snapping to each new cursor
   * would show as a small jerk once a minute. Every move that genuinely needs
   * following is a day or more.
   */
  useAnimatedReaction(
    () => cursorSeconds,
    (next) => {
      if (held.value) return;
      if (Math.abs(view.value - next) < CURSOR_FOLLOW_THRESHOLD_SECONDS) return;
      view.value = next;
      anchorRequested.value = next;
    },
    [cursorSeconds],
  );

  // ---- Live ticking ------------------------------------------------------
  /**
   * While live the track keeps moving, at one second per second, on the UI
   * thread. Two additions and a comparison per frame, and the JS thread is
   * never involved — so the clock does not stutter when a list above it
   * re-renders.
   */
  const liveTick = useFrameCallback((frame) => {
    if (held.value) return;
    view.value += (frame.timeSincePreviousFrame ?? 0) / 1000;
  }, false);

  useEffect(() => {
    liveTick.setActive(isLive && width > 0);
  }, [liveTick, isLive, width]);

  // ---- Re-windowing ------------------------------------------------------
  const reanchorAt = screenSeconds * REANCHOR_FRACTION;
  useAnimatedReaction(
    () => view.value,
    (current) => {
      if (Math.abs(current - anchorRequested.value) <= reanchorAt) return;
      anchorRequested.value = current;
      runOnJS(setAnchor)(current);
    },
    [reanchorAt],
  );

  // ---- The scrub label ---------------------------------------------------
  // Quantised to the minor tick, so a slow drag updates a handful of times a
  // second rather than sixty. A fast fling still emits per frame, but it lasts
  // under a second and the text is unreadable at that speed anyway.
  const labelQuantum = tickStep(zoom).minor;
  const showLabel = useCallback((at: number) => setLabel(scrubLabel(at, zone)), [zone]);
  useAnimatedReaction(
    () => (held.value ? Math.round(view.value / labelQuantum) : null),
    (current, previous) => {
      if (current === null || current === previous) return;
      runOnJS(showLabel)(current * labelQuantum);
    },
    [labelQuantum, showLabel],
  );

  // ---- Committing back to the page ---------------------------------------
  const commit = useCallback(
    (at: number) => onScrub(DateTime.fromSeconds(at, { zone })),
    [onScrub, zone],
  );
  const setScrubbing = useCallback(
    (active: boolean) => {
      onScrubbingChange?.(active);
      if (!active) setLabel(null);
    },
    [onScrubbingChange],
  );

  // ---- Gestures ----------------------------------------------------------
  const pan = useMemo(
    () =>
      Gesture.Pan()
        // The timeline sits inside a vertically scrolling list. Claiming the
        // gesture only after 8px sideways, and failing on 12px vertical, means
        // a scroll that grazes the track still scrolls the page.
        .activeOffsetX([-8, 8])
        .failOffsetY([-12, 12])
        .enabled(pps > 0)
        .onStart(() => {
          held.value = true;
          runOnJS(setScrubbing)(true);
        })
        .onChange((event) => {
          view.value = clampInstantSeconds(
            view.value - event.changeX / pps,
            earliestSeconds,
            latestSeconds,
          );
        })
        .onEnd((event) => {
          view.value = withDecay(
            {
              velocity: -event.velocityX / pps,
              deceleration: 0.997,
              clamp: [earliestSeconds, latestSeconds],
            },
            (finished) => {
              if (!finished) return;
              held.value = false;
              runOnJS(setScrubbing)(false);
              runOnJS(commit)(view.value);
            },
          );
        })
        .onFinalize((_event, success) => {
          // A gesture cancelled by the system never reaches onEnd, so the decay
          // callback that releases the track never runs — it would stay held
          // and the hero would never come back. Only the failure path is
          // handled here; a successful end belongs to the decay.
          if (success || !held.value) return;
          held.value = false;
          runOnJS(setScrubbing)(false);
          runOnJS(commit)(view.value);
        }),
    [pps, earliestSeconds, latestSeconds, commit, setScrubbing, held, view],
  );

  /**
   * Pinch moves between fixed detents rather than scaling continuously.
   *
   * A continuous zoom has to re-ladder the ticks on the JS thread many times a
   * second to stay honest about density, which is the cost this component
   * exists to avoid. Detents give at most one re-ladder per rung, land on tick
   * densities someone chose, and never leave the timeline at a scale where the
   * ticks sit at an awkward spacing. The instant under the centre line does not
   * move, because the centre line *is* the view instant.
   */
  const pinch = useMemo(
    () =>
      Gesture.Pinch()
        .onStart(() => {
          pinchStartZoom.value = zoomShared.value;
        })
        .onChange((event) => {
          const nearest = nearestDetent(pinchStartZoom.value * event.scale);
          if (nearest === zoomShared.value) return;
          zoomShared.value = nearest;
          runOnJS(setZoom)(nearest);
        }),
    [pinchStartZoom, zoomShared],
  );

  const gesture = useMemo(() => Gesture.Simultaneous(pan, pinch), [pan, pinch]);

  /**
   * Depends only on the view instant and the scale — never on the anchor, which
   * is what lets the track be re-drawn underneath it without a compensating
   * jump.
   */
  const trackStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: halfWidth - (view.value - baseSeconds) * pps }],
  }));

  const onLayout = useCallback((event: LayoutChangeEvent) => {
    setWidth(event.nativeEvent.layout.width);
  }, []);

  // VoiceOver cannot drag. The adjustable role gives it the same journey in
  // one-major-tick steps, which is the difference between a control and a
  // decoration for anyone using it.
  const step = tickStep(zoom).major;
  const nudge = useCallback(
    (direction: 1 | -1) =>
      commit(
        clampInstantSeconds(cursorSeconds + direction * step, earliestSeconds, latestSeconds),
      ),
    [cursorSeconds, step, earliestSeconds, latestSeconds, commit],
  );

  return (
    <View
      style={[styles.frame, { height }]}
      onLayout={onLayout}
      testID="scrub-timeline"
      accessible
      accessibilityRole="adjustable"
      accessibilityLabel="Footage timeline"
      accessibilityValue={{ text: isLive ? 'Live' : scrubLabel(cursorSeconds, zone) }}
      accessibilityActions={ACCESSIBILITY_ACTIONS}
      onAccessibilityAction={(event) =>
        nudge(event.nativeEvent.actionName === 'increment' ? 1 : -1)
      }>
      {label ? (
        <View style={[styles.bubble, { backgroundColor: colors.accent }]} testID="scrub-bubble">
          <Text style={[type.caption, { color: colors.onAccent }]}>{label}</Text>
        </View>
      ) : null}

      <GestureDetector gesture={gesture}>
        <View style={styles.viewport} collapsable={false}>
          <View style={[styles.baseline, { backgroundColor: colors.divider }]} />

          <Animated.View
            style={[
              styles.track,
              trackStyle,
              { left: (anchor - baseSeconds - windowSeconds) * pps, width: windowPixels * 2 },
            ]}>
            {ticks.map((tick) => (
              <View
                key={tick.at}
                style={[
                  tick.major ? styles.majorTick : styles.minorTick,
                  {
                    left: (tick.at - anchor) * pps + windowPixels,
                    backgroundColor: tick.major ? colors.tertiary : colors.dimmed,
                  },
                ]}
              />
            ))}
            {ticks.map((tick) =>
              tick.label ? (
                <Text
                  key={`label-${tick.at}`}
                  style={[
                    type.caption,
                    styles.label,
                    {
                      left: (tick.at - anchor) * pps + windowPixels - LABEL_WIDTH / 2,
                      color: colors.tertiary,
                    },
                  ]}
                  numberOfLines={1}>
                  {tick.label}
                </Text>
              ) : null,
            )}
          </Animated.View>

          <View style={[styles.cursor, { backgroundColor: colors.accent }]} pointerEvents="none" />
        </View>
      </GestureDetector>
    </View>
  );
}

const ACCESSIBILITY_ACTIONS = [
  { name: 'increment', label: 'Later' },
  { name: 'decrement', label: 'Earlier' },
];

const styles = StyleSheet.create({
  frame: { overflow: 'hidden' },
  viewport: { flex: 1, overflow: 'hidden' },
  baseline: { position: 'absolute', left: 0, right: 0, top: TICK_BASELINE, height: 1 },
  track: { position: 'absolute', top: 0, bottom: 0 },
  majorTick: {
    position: 'absolute',
    top: TICK_BASELINE - MAJOR_TICK_HEIGHT,
    width: 2,
    height: MAJOR_TICK_HEIGHT,
  },
  minorTick: {
    position: 'absolute',
    top: TICK_BASELINE - MINOR_TICK_HEIGHT,
    width: 1,
    height: MINOR_TICK_HEIGHT,
  },
  label: { position: 'absolute', top: TICK_BASELINE + 6, width: LABEL_WIDTH, textAlign: 'center' },
  cursor: {
    position: 'absolute',
    left: '50%',
    marginLeft: -1,
    top: TICK_BASELINE - MAJOR_TICK_HEIGHT - 6,
    width: 2,
    height: MAJOR_TICK_HEIGHT + 12,
    borderRadius: radius.full,
  },
  bubble: {
    position: 'absolute',
    top: 0,
    alignSelf: 'center',
    zIndex: 2,
    paddingHorizontal: space.sm,
    paddingVertical: space.xxs,
    borderRadius: radius.xs,
    borderCurve: 'continuous',
  },
});
