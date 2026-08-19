import type { ReactNode } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { space } from '@/constants/tokens';
import { useTextScale } from '@/hooks/use-text-scale';

/**
 * A label on the left, its action flush right — until the text is too large for
 * both, at which point the action moves to its own line beneath.
 *
 * ## Why this exists
 *
 * Every card in this app has one of these rows: a title beside "See History", a
 * name beside "Switch", a heading beside Daily/Weekly and a ⋮. Written the
 * obvious way — `flexDirection: 'row'`, `justifyContent: 'space-between'`, the
 * label allowed to shrink and the action not — they all fail the same way when
 * someone turns their text size up: the label is the only thing that can give,
 * so it gives. "Behavior Tracker" becomes "Behavior Trac…", the organization
 * name becomes "Mobile D…", and "Switch" becomes "S…".
 *
 * That is not a hypothetical. It is what the shipping app is being patched for
 * in `bugfix/HC84-35986` (PR 2174, "fix the behavior tracker text cutting off in
 * smaller phones"), and our version reproduced it at ONE notch above the default
 * text size on the largest iPhone we have — a worse failure than theirs, which
 * needs a small phone (verified on device, 2026-08-19).
 *
 * ## Why stacking rather than capping the font
 *
 * The shipping app's other defence is a ceiling on how far text may grow
 * (`BEHAVIOR_TRACKER_MAX_FONT_SIZE_MULTIPLIER`). That keeps the layout intact by
 * ignoring some of what the reader asked for, and it is the wrong trade for a
 * barn app: the people using it at 6am in poor light are exactly the ones who
 * turned the text up. Stacking costs vertical space on a page that already
 * scrolls, and costs nothing else.
 *
 * A row whose action genuinely cannot leave the line — a control that must stay
 * beside its label to be understood — passes `stack={false}` and takes
 * responsibility for its own wrapping.
 */
export function SplitRow({
  leading,
  trailing,
  stack: stackOverride,
  style,
  testID,
}: {
  /** The label side. Gets the room; wraps rather than truncating. */
  leading: ReactNode;
  /** The action side. Keeps its intrinsic width and never shrinks. */
  trailing?: ReactNode;
  /** Force the layout instead of following the reader's text size. */
  stack?: boolean;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}) {
  const { stack: shouldStack } = useTextScale();
  const stacked = stackOverride ?? shouldStack;

  if (!trailing) {
    return (
      <View style={[styles.row, style]} testID={testID}>
        {leading}
      </View>
    );
  }

  return (
    <View style={[stacked ? styles.stacked : styles.row, style]} testID={testID}>
      <View style={stacked ? styles.stackedLeading : styles.leading}>{leading}</View>
      <View style={stacked ? styles.stackedTrailing : styles.trailing}>{trailing}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: space.sm,
  },
  leading: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    flexShrink: 1,
  },
  trailing: {
    flexShrink: 0,
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  stacked: {
    // No `alignItems: 'stretch'` override needed — the default fills the width,
    // which is what puts the action on its own full line.
    gap: space.sm,
  },
  stackedLeading: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    flexWrap: 'wrap',
  },
  stackedTrailing: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: space.sm,
  },
});
