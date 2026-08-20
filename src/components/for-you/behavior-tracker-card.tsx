import { DateTime } from "luxon";
import { useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { SectionCard, SectionHeader } from "@/components/for-you/card";
import { SplitRow } from "@/components/ui/split-row";
import { ChartPlaceholder } from "@/components/for-you/chart-placeholder";
import { LyingDownRow } from "@/components/charts/lying-down-row";
import { LyingDownWeekRow } from "@/components/charts/lying-down-week-row";
import { PeopleInStallRow } from "@/components/charts/people-in-stall-row";
import { PeopleInStallWeekRow } from "@/components/charts/people-in-stall-week-row";
import { WeeklyDetailProvider } from "@/components/charts/weekly-bars";
import {
  buildPeopleInStallWeek,
  buildPeopleInStallWeekly,
} from "@/charts/people-in-stall-behavior";
import { HorseInStallRow } from "@/components/charts/horse-in-stall-row";
import { HorseInStallWeekRow } from "@/components/charts/horse-in-stall-week-row";
import {
  buildHorseInStallWeek,
  buildHorseInStallWeekly,
} from "@/charts/horse-in-stall-behavior";
import { sortRowsByAttention } from "@/charts/row-order";
import {
  fragmentedDay,
  inAllDay,
  longTurnout,
  monitorGapMidday as inStallMonitorGap,
  noData as inStallNoData,
  routineTurnout,
} from "@/charts/fixtures/horse-in-stall-behavior";
import {
  barelyVisited,
  busyDay,
  monitorGapMidday,
  noData as peopleNoData,
  routineWeek,
} from "@/charts/fixtures/people-in-stall-behavior";
import {
  buildLyingDownWeek,
  buildLyingDownWeekly,
  dayStartHourFrom,
  deviationPercentOf,
  hasEnoughHistory,
  lyingDownVerdict,
  usualByNow,
} from "@/charts/lying-down";
import {
  inStallOvernight,
  inStallWithTurnout,
  monitorWentOffline,
  lowToday,
  outMostOfDay,
  settledSleeper,
  typicalWeek,
} from "@/charts/fixtures/lying-down";
import { PREVIEWS } from "@/config/previews";
import { Icon, type IconName } from "@/components/ui/icon";
import { Menu } from "@/components/ui/menu";
import { TextTabs } from "@/components/ui/text-tabs";
import { useSession } from "@/hooks/use-session";
import { useTextScale } from "@/hooks/use-text-scale";
import { useTokens } from "@/hooks/use-tokens";
import { radius, space, type } from "@/constants/tokens";

export type TrackerPeriod = "daily" | "weekly";

/**
 * Fallback zone, used only until the organization record arrives. The zone and
 * the barn-day start both belong to the organization (`timezone` and
 * `chart_start_time`), which is where the shipping app reads them from too.
 */
const FALLBACK_ZONE = "America/Chicago";
/**
 * Fallback only, used for the single frame before the container reports its
 * real width. It used to be the actual value passed to every row, which pinned
 * each row ~48 pt short of the card on a large phone: the hairline between
 * horses is drawn on the full-width wrapper, so the chart beside it looked cut
 * off on the right. Measure, never assume.
 */
const CARD_WIDTH_FALLBACK = 320;

/** One stable stall per sample horse, shared by all three behaviours. */
const SAMPLE_STALL_OF: Record<string, string> = {
  Apollo: "Stall 4",
  Bubbles: "Stall 5",
  Juniper: "Stall 7",
  Willow: "Stall 8",
  Pepper: "Stall 9",
  Storm: "Stall 2",
};

const PERIOD_OPTIONS: { label: string; value: TrackerPeriod }[] = [
  { label: "Daily", value: "daily" },
  { label: "Weekly", value: "weekly" },
];

const TRACKER_MENU_STATIC = [
  {
    id: "customize",
    label: "Customize",
    icon: "customize" as const,
    disabled: true,
  },
  {
    id: "history",
    label: "See History",
    icon: "clock" as const,
    disabled: true,
  },
];

export interface Behavior {
  id: string;
  label: string;
  /** Surface-layer icon standing in for the current app's custom artwork. */
  icon: IconName;
}

const DEFAULT_BEHAVIORS: Behavior[] = [
  { id: "lying-down", label: "Lying Down", icon: "lyingDown" },
  { id: "people-in-stall", label: "People in Stall", icon: "peopleInStall" },
  { id: "in-stall", label: "Horse in Stall", icon: "inStall" },
  { id: "feed", label: "Feed", icon: "feed" },
];

/**
 * Behavior Tracker — period tabs, behaviour selector, and the chart for the
 * selected behaviour. Chart stubbed pending the charting decision.
 *
 * Editorial pass (Inakshi, 2026-08-17 — "the white slab is the biggest
 * issue"): selection is shown by TONE and WEIGHT, never by an inverted
 * block. The chosen behaviour sits in a light well with an ink icon and a
 * headline-weight label; the others are bare icons in grey. Daily / Weekly
 * are text tabs rather than a filled segmented control, so the card has one
 * selection idiom. The ⋮ sits flush right after the tabs, on the title line.
 */
export function BehaviorTrackerCard({
  behaviors = DEFAULT_BEHAVIORS,
  previewTrends,
  previewLabels,
}: {
  behaviors?: Behavior[];
  previewTrends?: Readonly<
    Record<string, Partial<Record<TrackerPeriod, readonly number[]>>>
  >;
  previewLabels?: readonly string[];
}) {
  const { colors } = useTokens();
  const { stack: stackBehaviorSelector } = useTextScale();
  const [period, setPeriod] = useState<TrackerPeriod>("daily");
  /**
   * Stall-first is the default (Inakshi, 2026-08-20): every camera appears
   * even when nobody remembered to assign a horse, and it is the familiar
   * pattern from other camera systems. The horse view exists for following one
   * horse across stall moves. The switch lives in the three-dots sheet, not on
   * the card face — a quiet preference, not a routine control.
   */
  const [viewMode, setViewMode] = useState<"stall" | "horse">("stall");
  const [selectedId, setSelectedId] = useState(behaviors[0]?.id);
  const [rowWidth, setRowWidth] = useState(CARD_WIDTH_FALLBACK);
  const { organization } = useSession();
  const zone = organization?.timezone || FALLBACK_ZONE;
  // The customer owns the barn day. 6 AM is only what we fall back to.
  const dayStartHour = dayStartHourFrom(organization?.chart_start_time);
  const selected = behaviors.find((b) => b.id === selectedId) ?? behaviors[0];

  // Fixture-backed until the observation API exists. Gated so it can never
  // reach a customer, and labelled so it cannot be mistaken for this horse's
  // real data even on Inakshi's own device.
  const sampleHorses = useMemo(() => {
    if (!PREVIEWS.lyingDownSampleData) return null;
    /**
     * The sample clock is pinned to 05:00 — late in the barn day, after the
     * night's rest — so the preview always shows a complete day.
     *
     * Tied to the real clock it showed four zeros for the whole hour after the
     * 06:00 rollover, which is correct behaviour and useless as a preview: you
     * cannot judge a chart with nothing in it. Pinning also makes the preview
     * deterministic, so two screenshots taken hours apart are comparable.
     *
     * The live chart uses the real clock. The empty-early-morning state this
     * hides is a genuine open question — a horse an hour into the barn day is
     * badged "Usual" on the strength of no observations at all — and it is
     * logged for Data Science alongside the thresholds, not papered over here.
     */
    const now = DateTime.now()
      .setZone(zone)
      .startOf("day")
      .plus({ hours: dayStartHour === 0 ? 23 : dayStartHour - 1 });
    const build = (
      result: ReturnType<typeof typicalWeek>,
      inStall?: ReturnType<typeof typicalWeek>,
    ) =>
      buildLyingDownWeek({
        result,
        inStallResult: inStall,
        // The BARN day containing `now`, not the calendar date. Before the day
        // start we are still in yesterday's barn day, so the calendar date named
        // a day that has not begun — the daily view hid this (it looks `today`
        // up by key) but the weekly view put an empty future column last.
        selectedDate: now.minus({ hours: dayStartHour }).toFormat("yyyy-MM-dd"),
        zone,
        dayStartHour,
        now,
      });
    // Verdict and average come from the backend in production. These are
    // stand-ins so the layout can be judged, including the states that matter:
    // a low day, and a monitor that went offline.
    // Typical cumulative progress through the barn day. Horses take most of
    // their rest overnight, so the curve is nearly flat through the afternoon
    // and steepens after dark — which is why a flat band would be wrong.
    // In production these points come from `dailyLyingDownAvg`, which already
    // returns cumulative averages at six-hour checkpoints.
    const curve = (avg: number) =>
      [
        [0, 0],
        [0.25, 0.06],
        [0.5, 0.16],
        [0.7, 0.38],
        [0.85, 0.72],
        [1, 1],
      ].map(([fractionOfDay, share]) => ({
        fractionOfDay: fractionOfDay!,
        lowSeconds: avg * share! * 0.72,
        highSeconds: avg * share! * 1.28,
      }));
    /**
     * Each horse's normal is stated, not measured from the week on screen.
     *
     * Measuring it from the same seven days was circular: the week was compared
     * against its own average, so the weekly badge read "Usual" for every horse
     * by construction. In production the reference is `weeklyLyingDownAvg` — a
     * FOUR-week average, independent of the week being judged — so the preview
     * has to supply something independent too.
     *
     * These are chosen to match what each fixture actually produces (the guard
     * against them drifting apart lives in the card's test), except Willow,
     * whose normal is deliberately well above its week so a genuinely low WEEK
     * is visible and not only a low day.
     */
    const horse = (
      horseName: string,
      week: ReturnType<typeof build>,
      usualDailySeconds: number | null,
      withRange: boolean,
    ) => {
      const avg = usualDailySeconds;
      const todaySeconds = week.today?.totalSeconds ?? null;
      const range = withRange && avg !== null ? curve(avg) : undefined;
      /**
       * Compared against the normal for HOW MUCH OF THE DAY HAS PASSED, not the
       * whole-day normal. Judging a part-day against a full day badged every
       * horse "Low" all morning — a clock, not a welfare signal.
       */
      const usualSoFar = usualByNow(week, range);
      // The verdict is derived, never hardcoded — so the badge cannot drift out
      // of step with the numbers printed beside it, which it twice did while
      // these were literals.
      // No verdict without the history to back one (Inakshi, 2026-08-19).
      const verdict = enoughDailyHistory
        ? lyingDownVerdict({
            deviationPercent: deviationPercentOf(todaySeconds, usualSoFar),
            valueSeconds: todaySeconds,
            usualSeconds: usualSoFar,
          })
        : todaySeconds === null
          ? ("no-data" as const)
          : ("unknown" as const);
      return {
        horseName,
        // The stall the sample horse lives in — stall-first is the default
        // view, and a camera with no horse would appear as its stall alone.
        stallName: `${SAMPLE_STALL_OF[horseName] ?? "Stall ?"} · ${horseName}`,
        verdict,
        avg,
        week,
        range,
        /**
         * Weekly normals per weekday come from `weeklyLyingDownAvg` in
         * production. The preview has no such history, so every weekday gets
         * this horse's own measured average rather than an invented
         * weekend/weekday pattern — a flat reference is honest, a made-up
         * rhythm would be the phone asserting something nobody measured.
         */
        weekly: buildLyingDownWeeklyGated(week, {
          usualSecondsByWeekday:
            avg === null
              ? undefined
              : Object.fromEntries([1, 2, 3, 4, 5, 6, 7].map((d) => [d, avg])),
        }),
      };
    };

    /**
     * The stall's age, which decides whether "normal for this horse" means
     * anything yet. Comes from the stall record in production; the preview
     * states a long-established stall so the sample horses show their intended
     * states. A brand-new stall is therefore NOT exercised on screen — it is
     * covered by `hasEnoughHistory`'s own tests.
     */
    const stallCreatedAt = now.minus({ months: 6 }).toISO();
    const enoughDailyHistory = hasEnoughHistory(stallCreatedAt, "daily", now);
    const enoughWeeklyHistory = hasEnoughHistory(stallCreatedAt, "weekly", now);

    const buildLyingDownWeeklyGated = (
      week: ReturnType<typeof build>,
      options: Parameters<typeof buildLyingDownWeekly>[1],
    ) => {
      const summary = buildLyingDownWeekly(week, options);
      if (enoughWeeklyHistory) return summary;
      // Four weeks is the shipping app's own window for a weekly average.
      return { ...summary, verdict: "unknown" as const };
    };

    const MIN = 60;
    return [
      // A steady horse: today matches its normal, and so does its week.
      horse(
        "Apollo",
        build(typicalWeek(now), inStallWithTurnout(now)),
        100 * MIN,
        true,
      ),
      horse(
        "Bubbles",
        build(settledSleeper(now), inStallOvernight(now)),
        118 * MIN,
        true,
      ),
      // A normal WEEK with a bad DAY — so Daily says Low and Weekly says Usual.
      // That difference between the two tabs is real, and worth showing.
      horse(
        "Juniper",
        build(lowToday(now), inStallWithTurnout(now)),
        100 * MIN,
        true,
      ),
      // A genuinely low WEEK: short every day against a much higher normal.
      horse(
        "Willow",
        build(outMostOfDay(now), inStallWithTurnout(now)),
        100 * MIN,
        true,
      ),
      // The monitor went offline: no reading at all, and never a zero.
      horse("Pepper", build(monitorWentOffline(now)), 100 * MIN, false),
    ];
  }, [zone, dayStartHour]);

  /**
   * Sample stalls for People in Stall. Same construction and the same rules as
   * the sample horses: a stated normal that does not come from the week being
   * judged, an established stall so the history gates do not fire, and one
   * fixture per state worth seeing — routine, high traffic, barely visited, a
   * mid-day monitor outage, and nothing at all.
   */
  const sampleStalls = useMemo(() => {
    if (!PREVIEWS.peopleInStallSampleData) return null;
    const now = DateTime.now()
      .setZone(zone)
      .startOf("day")
      .plus({ hours: dayStartHour === 0 ? 23 : dayStartHour - 1 });
    const stallCreatedAt = now.minus({ months: 6 }).toISO();
    const selectedDate = now
      .minus({ hours: dayStartHour })
      .toFormat("yyyy-MM-dd");

    // Human presence clusters at feed times, so the usual curve steepens there
    // rather than rising evenly. In production this comes from Data Science.
    const curve = (avg: number) =>
      [
        [0, 0],
        [0.08, 0.3],
        [0.3, 0.42],
        [0.5, 0.62],
        [0.55, 0.78],
        [1, 1],
      ].map(([fractionOfDay, share]) => ({
        fractionOfDay: fractionOfDay!,
        lowSeconds: avg * share! * 0.75,
        highSeconds: avg * share! * 1.25,
      }));

    const MIN = 60;
    const stall = (
      stallName: string,
      horseName: string,
      result: ReturnType<typeof routineWeek>,
      usualDailySeconds: number,
    ) => {
      const range = curve(usualDailySeconds);
      const data = buildPeopleInStallWeek({
        result,
        selectedDate,
        zone,
        dayStartHour,
        now,
        usualCurve: range,
        stallCreatedAt,
      });
      return {
        stallName: `${stallName} · ${horseName}`,
        horseName,
        data,
        avg: usualDailySeconds,
        range,
        weekly: buildPeopleInStallWeekly(data.week, {
          usualSecondsByWeekday: Object.fromEntries(
            [1, 2, 3, 4, 5, 6, 7].map((d) => [d, usualDailySeconds]),
          ),
          stallCreatedAt,
          now,
        }),
      };
    };

    return [
      // The barn routine: morning feed, midday check, evening feed.
      stall("Stall 4", "Apollo", routineWeek(now), 95 * MIN),
      // A stall under close attention — the case the caption must not overflow.
      stall("Stall 2", "Storm", busyDay(now), 95 * MIN),
      // One short visit and nothing since, against a normal 95 minutes.
      stall("Stall 7", "Juniper", barelyVisited(now), 95 * MIN),
      // The monitor dropped out over lunch and came back mid-afternoon.
      stall("Stall 5", "Bubbles", monitorGapMidday(now), 95 * MIN),
      // Nothing came back at all — never drawn as an empty stall.
      stall("Stall 9", "Pepper", peopleNoData, 95 * MIN),
    ];
  }, [zone, dayStartHour]);

  /**
   * Horse in Stall sample rows.
   *
   * Named stall-first, because the stall is the primary entity (Inakshi,
   * 2026-08-20): a camera with no horse assigned must still appear, or a
   * customer who forgot to assign one silently loses that stall's data.
   *
   * One fixture per state worth seeing: routine turnout, a horse out most of the
   * day, one that never left, a fragmented in-and-out day, and the case that
   * matters most — a mid-day monitor outage, which looks exactly like turnout
   * unless the chart refuses to name it.
   */
  const sampleInStall = useMemo(() => {
    if (!PREVIEWS.horseInStallSampleData) return null;
    const now = DateTime.now()
      .setZone(zone)
      .startOf("day")
      .plus({ hours: dayStartHour === 0 ? 23 : dayStartHour - 1 });
    const entityCreatedAt = now.minus({ months: 6 }).toISO();
    const selectedDate = now
      .minus({ hours: dayStartHour })
      .toFormat("yyyy-MM-dd");

    // In-stall time accrues almost evenly: the horse is in overnight, out for a
    // block in the middle of the day, in again by evening. So the usual curve
    // rises steadily and flattens across the turnout window rather than
    // clustering at feed times the way human presence does.
    const curve = (avg: number) =>
      [
        [0, 0],
        [0.1, 0.13],
        [0.35, 0.36],
        [0.5, 0.4],
        [0.65, 0.55],
        [1, 1],
      ].map(([fractionOfDay, share]) => ({
        fractionOfDay: fractionOfDay!,
        lowSeconds: avg * share! * 0.85,
        highSeconds: avg * share! * 1.15,
      }));

    const HOUR = 3600;
    const entity = (
      stallName: string,
      horseName: string,
      result: ReturnType<typeof routineTurnout>,
      usualDailySeconds: number,
    ) => {
      const range = curve(usualDailySeconds);
      const data = buildHorseInStallWeek({
        result,
        selectedDate,
        zone,
        dayStartHour,
        now,
        usualCurve: range,
        entityCreatedAt,
      });
      return {
        stallName: `${stallName} · ${horseName}`,
        horseName,
        data,
        avg: usualDailySeconds,
        range,
        weekly: buildHorseInStallWeekly(data.week, {
          usualSecondsByWeekday: Object.fromEntries(
            [1, 2, 3, 4, 5, 6, 7].map((d) => [d, usualDailySeconds]),
          ),
          entityCreatedAt,
          now,
        }),
      };
    };

    // ~19 h is the measured routine, so it is the normal every row is judged on.
    const USUAL = 19 * HOUR;
    return [
      // Out after morning feed, back before evening feed.
      entity("Stall 4", "Apollo", routineTurnout(now), USUAL),
      // Out twelve hours a day — at grass, and well below the normal.
      entity("Stall 2", "Storm", longTurnout(now), USUAL),
      // Never left: box rest, or a week of weather.
      entity("Stall 7", "Juniper", inAllDay(now), USUAL),
      // Four separate absences — past the point where the caption lists them.
      entity("Stall 5", "Bubbles", fragmentedDay(now), USUAL),
      // The monitor went down over lunch: must NOT be read as turnout.
      entity("Stall 8", "Willow", inStallMonitorGap(now), USUAL),
      // Nothing at all — never drawn as a horse that stayed out.
      entity("Stall 9", "Pepper", inStallNoData(), USUAL),
    ];
  }, [zone, dayStartHour]);

  /**
   * Rows ordered so the ones needing attention are the ones you see first
   * (Inakshi, 2026-08-20). Sorted per PERIOD, because the two tabs can disagree
   * — a horse with one bad day inside a normal week is Low on Daily and Usual on
   * Weekly, and each tab should float the row its own badge justifies.
   */
  const orderedHorses = useMemo(
    () =>
      sampleHorses &&
      sortRowsByAttention(
        sampleHorses,
        (horse) => (period === "weekly" ? horse.weekly.verdict : horse.verdict),
        (horse) => (viewMode === "horse" ? horse.horseName : horse.stallName),
      ),
    [sampleHorses, period, viewMode],
  );

  const orderedStalls = useMemo(
    () =>
      sampleStalls &&
      sortRowsByAttention(
        sampleStalls,
        (entry) => (period === "weekly" ? entry.weekly.verdict : entry.data.verdict),
        (entry) => (viewMode === "horse" ? entry.horseName : entry.stallName),
      ),
    [sampleStalls, period, viewMode],
  );

  const orderedInStall = useMemo(
    () =>
      sampleInStall &&
      sortRowsByAttention(
        sampleInStall,
        (entry) => (period === "weekly" ? entry.weekly.verdict : entry.data.verdict),
        (entry) => (viewMode === "horse" ? entry.horseName : entry.stallName),
      ),
    [sampleInStall, period, viewMode],
  );

  return (
    <SectionCard testID="for-you-behavior-tracker">
      <SectionHeader
        title="Behavior Tracker"
        action={
          <View style={styles.headerActions}>
            <TextTabs
              options={PERIOD_OPTIONS}
              value={period}
              onChange={setPeriod}
              testID="for-you-tracker-period"
            />
            <Menu
              icon="overflow"
              accessibilityLabel="Behavior tracker options"
              testID="for-you-tracker-menu"
              actions={[
                ...TRACKER_MENU_STATIC,
                // The horse/stall switch, moved off the card face into this
                // sheet (Inakshi, 2026-08-20): a preference set once, not a
                // control used routinely — the old app's prominent "Switch to
                // Stalls" button is not the pattern to copy.
                {
                  id: "group-stalls",
                  label: "Group by Stalls",
                  description: "Every camera appears, even without a horse assigned",
                  icon: "inStall" as const,
                  selected: viewMode === "stall",
                  onPress: () => setViewMode("stall"),
                },
                {
                  id: "group-horses",
                  label: "Group by Horses",
                  description: "Follow a horse across stall moves",
                  icon: "horse" as const,
                  selected: viewMode === "horse",
                  onPress: () => setViewMode("horse"),
                },
              ]}
            />
          </View>
        }
      />

      <View
        style={[
          styles.behaviorRow,
          stackBehaviorSelector && styles.behaviorGrid,
        ]}
        testID="for-you-behavior-selector"
      >
        {behaviors.map((behavior) => {
          const isSelected = behavior.id === selected?.id;
          const displayLabel =
            !stackBehaviorSelector && behavior.label.endsWith(" in Stall")
              ? behavior.label.replace(" in Stall", " in\nStall")
              : behavior.label;
          return (
            <Pressable
              key={behavior.id}
              onPress={() => setSelectedId(behavior.id)}
              accessibilityRole="button"
              accessibilityLabel={behavior.label}
              accessibilityState={{ selected: isSelected }}
              testID={`for-you-behavior-${behavior.id}`}
              style={[
                styles.behaviorTile,
                stackBehaviorSelector && styles.behaviorTileStacked,
                isSelected && { backgroundColor: colors.bed },
              ]}
            >
              <Icon
                name={behavior.icon}
                size={22}
                color={isSelected ? colors.foreground : colors.tertiary}
              />
              {/*
                Every tile reserves the same two-line label space. Without it,
                a wrapped label moves its icon upwards while a one-line label
                stays vertically centred, making the selector look uneven.
                The space is a floor rather than a fixed height, so larger
                accessibility text can still grow the whole row.
              */}
              <Text
                style={[
                  type.caption,
                  styles.behaviorLabel,
                  isSelected && styles.selectedCaption,
                  { color: isSelected ? colors.foreground : colors.tertiary },
                ]}
                numberOfLines={2}
              >
                {displayLabel}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <SplitRow
        style={styles.selectedRow}
        leading={
          <Text
            style={[
              type.title3,
              styles.selectedLabel,
              { color: colors.foreground },
            ]}
          >
            {selected?.label}
          </Text>
        }
      />

      {selected?.id === "in-stall" && orderedInStall ? (
        <WeeklyDetailProvider>
          <View
            testID="for-you-tracker-chart"
            onLayout={(event) => setRowWidth(event.nativeEvent.layout.width)}
          >
            {orderedInStall.map((entry, index) => (
              <View
                key={entry.horseName}
                style={
                  index > 0
                    ? {
                        borderTopWidth: StyleSheet.hairlineWidth,
                        borderTopColor: colors.divider,
                      }
                    : undefined
                }
              >
                {period === "weekly" ? (
                  <HorseInStallWeekRow
                    entityName={viewMode === "horse" ? entry.horseName : entry.stallName}
                    summary={entry.weekly}
                    width={rowWidth}
                  />
                ) : (
                  <HorseInStallRow
                    entityName={viewMode === "horse" ? entry.horseName : entry.stallName}
                    data={entry.data}
                    averageSeconds={entry.avg}
                    usualCurve={entry.range}
                    width={rowWidth}
                  />
                )}
              </View>
            ))}
            <Text
              style={[
                type.footnote,
                styles.sampleNotice,
                { color: colors.tertiary },
              ]}
            >
              Sample data — not this stall
            </Text>
          </View>
        </WeeklyDetailProvider>
      ) : selected?.id === "people-in-stall" && orderedStalls ? (
        <WeeklyDetailProvider>
          <View
            testID="for-you-tracker-chart"
            onLayout={(event) => setRowWidth(event.nativeEvent.layout.width)}
          >
            {orderedStalls.map((entry, index) => (
              <View
                key={entry.horseName}
                style={
                  index > 0
                    ? {
                        borderTopWidth: StyleSheet.hairlineWidth,
                        borderTopColor: colors.divider,
                      }
                    : undefined
                }
              >
                {period === "weekly" ? (
                  <PeopleInStallWeekRow
                    stallName={viewMode === "horse" ? entry.horseName : entry.stallName}
                    summary={entry.weekly}
                    width={rowWidth}
                  />
                ) : (
                  <PeopleInStallRow
                    stallName={viewMode === "horse" ? entry.horseName : entry.stallName}
                    data={entry.data}
                    averageSeconds={entry.avg}
                    usualCurve={entry.range}
                    width={rowWidth}
                  />
                )}
              </View>
            ))}
            <Text
              style={[
                type.footnote,
                styles.sampleNotice,
                { color: colors.tertiary },
              ]}
            >
              Sample data — not this stall
            </Text>
          </View>
        </WeeklyDetailProvider>
      ) : selected?.id === "lying-down" && orderedHorses ? (
        <WeeklyDetailProvider>
          <View
            testID="for-you-tracker-chart"
            onLayout={(event) => setRowWidth(event.nativeEvent.layout.width)}
          >
            {orderedHorses.map((horse, index) => (
              <View
                key={horse.horseName}
                style={
                  index > 0
                    ? {
                        borderTopWidth: StyleSheet.hairlineWidth,
                        borderTopColor: colors.divider,
                      }
                    : undefined
                }
              >
                {period === "weekly" ? (
                  <LyingDownWeekRow
                    horseName={viewMode === "horse" ? horse.horseName : horse.stallName}
                    summary={horse.weekly}
                    width={rowWidth}
                  />
                ) : (
                  <LyingDownRow
                    horseName={viewMode === "horse" ? horse.horseName : horse.stallName}
                    week={horse.week}
                    verdict={horse.verdict}
                    averageSeconds={horse.avg}
                    usualCurve={horse.range}
                    width={rowWidth}
                  />
                )}
              </View>
            ))}
            <Text
              style={[
                type.footnote,
                styles.sampleNotice,
                { color: colors.tertiary },
              ]}
            >
              Sample data — not this horse
            </Text>
          </View>
        </WeeklyDetailProvider>
      ) : (
        <ChartPlaceholder
          height={168}
          previewSeries={
            selected
              ? [
                  {
                    label: selected.label,
                    color: colors.accent,
                    values: previewTrends?.[selected.id]?.[period] ?? [],
                  },
                ]
              : undefined
          }
          xLabels={previewLabels}
          testID="for-you-tracker-chart"
        />
      )}
    </SectionCard>
  );
}

const styles = StyleSheet.create({
  headerActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.sm,
  },
  behaviorRow: {
    flexDirection: "row",
    alignItems: "stretch",
    gap: space.sm,
    marginTop: space.edge,
  },
  behaviorGrid: {
    flexWrap: "wrap",
  },
  behaviorTile: {
    flex: 1,
    paddingVertical: space.sm,
    paddingHorizontal: space.xs,
    gap: space.xs,
    borderRadius: radius.sm,
    borderCurve: "continuous",
    alignItems: "center",
    justifyContent: "flex-start",
  },
  behaviorTileStacked: {
    // Two per row at accessibility sizes. A percentage basis keeps the layout
    // responsive while flexGrow shares any remaining width evenly.
    flexBasis: "45%",
  },
  behaviorLabel: {
    width: "100%",
    minHeight: space.xl,
    textAlign: "center",
  },
  selectedCaption: { fontWeight: "600" },
  sampleNotice: { marginTop: 8, textAlign: "center" },
  selectedRow: {
    marginTop: space.edge,
  },
  selectedLabel: {
    flexShrink: 1,
  },
});
