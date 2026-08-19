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

export const BADGE: Record<Verdict, { label: string; tone: BadgeTone }> = {
  usual: { label: 'Usual', tone: 'quiet' },
  low: { label: 'Low', tone: 'deviation' },
  high: { label: 'High', tone: 'deviation' },
  // Far from normal, direction unavailable — see `lyingDownVerdict`.
  unusual: { label: 'Unusual', tone: 'deviation' },
  'no-data': { label: 'No data', tone: 'absent' },
  unknown: { label: 'No history', tone: 'absent' },
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
