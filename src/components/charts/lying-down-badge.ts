import { StyleSheet, type TextStyle, type ViewStyle } from 'react-native';

import type { Verdict } from '@/charts/lying-down';
import type { TokenColors } from '@/constants/tokens';

/**
 * The verdict badge, shared by the daily and weekly rows.
 *
 * Extracted when the weekly view arrived: two copies of a colour rule is how a
 * rule quietly becomes two rules.
 *
 * Deviation — and only deviation — is coloured. "Usual" is the default state and
 * so is the quiet one: five green pills on a normal morning would spend the
 * app's only positive colour on the case that needs no attention. "No data" is
 * hollow, because visually absent is what it means. Ochre is never red; see
 * PRINCIPLES.md, deviation may be coloured, severity may not.
 */
export type BadgeTone = 'quiet' | 'deviation' | 'absent';

/**
 * Whether the app may tell a customer their horse's day was Usual, Low, High
 * or Unusual.
 *
 * **False, by decision (Inakshi, 2026-08-23: "maybe we keep it hidden for
 * now").** All four of those verdicts come from comparing today against an
 * average and applying a 25% threshold. Measured against 45 days from three
 * production monitors, that threshold flags a quarter to two-thirds of
 * ordinary days, the right figure differs enormously per horse, and nobody
 * owns the number — no meeting decided it, no sheet records it, no comment
 * explains it. The shipping app reaches the same conclusion in its own way:
 * it renders this pill inside `{false && (...)}`, so no customer has ever
 * seen it.
 *
 * What is NOT suppressed: `no-data`, `no-history` and `incomplete`. Those are
 * statements about the data itself, which we can prove. The line here is
 * between describing what we observed and judging what it means — we keep the
 * first and withhold the second until Data Science approves a comparison.
 *
 * Deliberately a constant rather than a runtime flag: flipping it is a code
 * change with a test run and a review, which is what changing the meaning of a
 * welfare badge should cost.
 */
export const DEVIATION_VERDICTS_APPROVED = false;

/** The four verdicts that rest on the unapproved threshold. */
const THRESHOLD_VERDICTS: ReadonlySet<Verdict> = new Set<Verdict>([
  'usual',
  'low',
  'high',
  'unusual',
]);

/** Whether this verdict may be shown at all, in words or in colour. */
export function verdictIsShowable(verdict: Verdict): boolean {
  return DEVIATION_VERDICTS_APPROVED || !THRESHOLD_VERDICTS.has(verdict);
}

export const BADGE: Record<Verdict, { label: string; tone: BadgeTone }> = {
  usual: { label: 'Usual', tone: 'quiet' },
  low: { label: 'Low', tone: 'deviation' },
  high: { label: 'High', tone: 'deviation' },
  // Far from normal, direction unavailable — see `lyingDownVerdict`.
  unusual: { label: 'Unusual', tone: 'deviation' },
  'no-data': { label: 'No data', tone: 'absent' },
  unknown: { label: 'No history', tone: 'absent' },
  // Readings have holes, so the total is an undercount. A different reason from
  // "No history", and the customer is owed the right one.
  incomplete: { label: 'Incomplete', tone: 'absent' },
};

export function badgeStyleFor(tone: BadgeTone, colors: TokenColors): ViewStyle {
  if (tone === 'deviation') return { backgroundColor: colors.chartDeviationBed };
  if (tone === 'quiet') return { backgroundColor: colors.bed };
  return { borderWidth: StyleSheet.hairlineWidth, borderColor: colors.divider };
}

export function badgeInkFor(tone: BadgeTone, colors: TokenColors): TextStyle['color'] {
  if (tone === 'deviation') return colors.chartDeviationInk;
  if (tone === 'quiet') return colors.secondary;
  return colors.tertiary;
}

/**
 * One colour rule for every lying-down renderer. Severity never changes it.
 *
 * Also honours `DEVIATION_VERDICTS_APPROVED`: an ochre line says "this reading
 * is outside normal" just as plainly as the badge does, so withholding the
 * words while keeping the colour would only move the unapproved claim
 * somewhere harder to argue with.
 */
export function lyingDownSeriesColor(verdict: Verdict, colors: TokenColors): string {
  const deviates = verdict === 'low' || verdict === 'high' || verdict === 'unusual';
  return deviates && verdictIsShowable(verdict) ? colors.chartDeviation : colors.chartData;
}
