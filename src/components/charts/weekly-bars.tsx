import { createContext, useContext, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { LyingDownWeeklySummary } from '@/charts/lying-down';
import { useTokens } from '@/hooks/use-tokens';

import { VictoryLyingDownWeeklyPlot } from './victory-lying-down-adapter';
import { weeklyDayDetail, type StretchNoun } from './weekly-day-detail';

/**
 * The weekly plot, its weekday axis, and the tapped-day detail panel.
 *
 * Shared by Lying Down and People in Stall so the interaction is learned once
 * and cannot drift apart between them.
 *
 * WHY THE TAP EXISTS (chart engineering standard §6 — interaction is earned, not
 * automatic). Three marks on this chart cannot explain themselves: a hollow bar
 * for today, an empty dashed slot for a day nothing was recorded, and the small
 * average marker. Inakshi's observation, 2026-08-20: "the user won't really know
 * that the hollow chart is because there isn't data." The odd-looking bars are
 * also the ones a person reaches for, so the mystery leads the finger to the
 * answer. Everything a customer must know without touching anything is still in
 * the row's own figure, badge and subline.
 *
 * The tap targets are transparent views laid over the plot rather than handlers
 * on the Skia shapes: it keeps hit areas a full column wide — a 6 pt bar is not
 * a 44 pt target — and keeps the drawing layer free of interaction concerns.
 *
 * HAND-BUILT ON PURPOSE, and recorded as an exception in PRINCIPLES.md.
 * `@expo/ui` does ship tooltips, but only in the platform-specific trees — an
 * iOS `Popover` and an Android Material `TooltipBox` — and they disagree about
 * the things that matter here: Android triggers on long-press and auto-dismisses
 * on a timer, iOS is a presented panel with a system arrow, and neither takes
 * our palette. Using them would make the same chart behave and look differently
 * on the two phones. This is plain `View`/`Text`/`Pressable`, which is why one
 * implementation covers both.
 */

interface WeeklyDetailValue {
  openKey: string | null;
  setOpenKey: (key: string | null) => void;
}

const WeeklyDetailContext = createContext<WeeklyDetailValue | null>(null);

/**
 * Keeps one panel open across every row on the card.
 *
 * Without it each row owns its own state, so five stalls can have five panels
 * open at once and tapping a different row leaves the previous one behind —
 * which is the "why is it persistent" complaint in a different form.
 */
export function WeeklyDetailProvider({ children }: { children: React.ReactNode }) {
  const [openKey, setOpenKey] = useState<string | null>(null);
  const value = useMemo(() => ({ openKey, setOpenKey }), [openKey]);
  return (
    <WeeklyDetailContext.Provider value={value}>
      <Pressable
        testID="weekly-detail-dismiss"
        accessible={false}
        // Anything that is not a day closes the panel. The day targets sit above
        // this and handle their own touches, so they are unaffected.
        onPress={() => setOpenKey(null)}>
        {children}
      </Pressable>
    </WeeklyDetailContext.Provider>
  );
}

const PANEL_OFFSET = 6;
/** Apple's minimum comfortable target; a bar is far narrower than a finger. */
const MIN_TAP_HEIGHT = 44;

export interface WeeklyBarsProps {
  summary: LyingDownWeeklySummary;
  width: number;
  zone: string;
  noun: StretchNoun;
  /** Unique per row, so the card can keep exactly one panel open. */
  panelKey?: string;
  testID?: string;
}

export function WeeklyBars({
  summary,
  width,
  zone,
  noun,
  panelKey = 'weekly',
  testID,
}: WeeklyBarsProps) {
  const { colors, type, space, radius } = useTokens();
  const shared = useContext(WeeklyDetailContext);
  // Falls back to local state when rendered outside a provider, so the component
  // still works on its own — in a test, or on a screen with a single chart.
  const [localIndex, setLocalIndex] = useState<number | null>(null);
  const openIndex = shared
    ? shared.openKey?.startsWith(`${panelKey}:`)
      ? Number(shared.openKey.slice(panelKey.length + 1))
      : null
    : localIndex;
  const setOpenIndex = (index: number | null) =>
    shared ? shared.setOpenKey(index === null ? null : `${panelKey}:${index}`) : setLocalIndex(index);
  const columnWidth = width / summary.days.length;

  const open = openIndex === null ? null : summary.days[openIndex];
  const detail = open ? weeklyDayDetail(open, zone, noun) : null;

  // Anchored to the tapped column but kept inside the row, so a Sunday tap does
  // not push the panel off the screen edge.
  const panelWidth = Math.min(width, 240);
  const panelLeft = open
    ? Math.max(0, Math.min(width - panelWidth, columnWidth * (openIndex! + 0.5) - panelWidth / 2))
    : 0;

  return (
    <View testID={testID}>
      {detail ? (
        <View
          testID="weekly-day-detail"
          style={[
            styles.panel,
            {
              left: panelLeft,
              width: panelWidth,
              marginBottom: PANEL_OFFSET,
              padding: space.md,
              borderRadius: radius.sm,
              // The light grey bed, chosen by Inakshi 2026-08-20 over an ink
              // slab: PRINCIPLES.md puts depth in air and hairlines rather than
              // tinted containers, and a black panel was the one heavy object on
              // an otherwise light page.
              backgroundColor: colors.bed,
            },
          ]}>
          <Text style={[type.caption, styles.panelTitle, { color: colors.foreground }]}>
            {detail.title}
          </Text>
          {detail.detail ? (
            <Text style={[type.caption, { color: colors.secondary }]}>{detail.detail}</Text>
          ) : null}
        </View>
      ) : null}

      <View>
        <VictoryLyingDownWeeklyPlot
          summary={summary}
          width={width}
          colors={colors}
          selectedIndex={openIndex}
        />

        <View style={StyleSheet.absoluteFill}>
          <View style={styles.targets}>
            {summary.days.map((day, index) => (
              <Pressable
                key={day.key}
                testID={`weekly-day-${index}`}
                accessibilityRole="button"
                // The label carries the same facts as the panel, so a screen
                // reader never depends on a popover appearing.
                accessibilityLabel={[
                  weeklyDayDetail(day, zone, noun).title,
                  weeklyDayDetail(day, zone, noun).detail,
                ]
                  .filter(Boolean)
                  .join('. ')}
                accessibilityState={{ selected: openIndex === index }}
                onPress={() => setOpenIndex(openIndex === index ? null : index)}
                style={{ width: columnWidth, minHeight: MIN_TAP_HEIGHT, height: '100%' }}
              />
            ))}
          </View>
        </View>
      </View>

      <View style={[styles.axis, { marginTop: space.sm }]}>
        {summary.days.map((day, index) => (
          <Text
            key={day.key}
            style={[
              type.micro,
              styles.axisLabel,
              {
                width: columnWidth,
                color:
                  openIndex === index
                    ? colors.foreground
                    : day.totalSeconds === null
                      ? colors.dimmed
                      : colors.tertiary,
              },
            ]}
            numberOfLines={1}>
            {day.isToday ? 'Today' : day.weekday}
          </Text>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  panel: { position: 'relative' },
  panelTitle: { fontWeight: '600' },
  targets: { flexDirection: 'row', height: '100%' },
  axis: { flexDirection: 'row' },
  axisLabel: { textAlign: 'center' },
});
