import { BottomSheet, RNHostView } from '@expo/ui';
import { useCallback, useState } from 'react';
import { Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';

import { Icon } from '@/components/ui/icon';
import type { MenuAction, MenuProps } from '@/components/ui/menu-types';
import { useTokens } from '@/hooks/use-tokens';
import { radius, space, type } from '@/constants/tokens';

export type { MenuAction, MenuProps } from '@/components/ui/menu-types';

/**
 * Universal `Menu` — a trigger that opens a BOTTOM SHEET of actions.
 *
 * **Why a sheet and not a dropdown (Inakshi, 2026-08-17).** This started as a
 * SwiftUI `Menu` / Compose `DropdownMenu`, which anchors a small popover to
 * its trigger. The shipping app has always used bottom sheets for these
 * (`react-native-actions-sheet`), so a dropdown was both a departure from what
 * customers know and, on a ⋮ at the right edge of a card, a cramped popover
 * hanging off the corner. Three further things came free with the change:
 *
 * 1. The dropdown rendered LIGHT in dark mode — the native popover did not
 *    inherit the app's scheme. These rows are ours, so they cannot.
 * 2. Multi-select works. A dropdown closes on every tap, so picking three
 *    behaviours in Review History meant opening it three times.
 * 3. Rows have room for the second line the current app's sheets carry
 *    ("Update details of the selected horse"), so a disabled action can say
 *    *why* instead of smuggling it into the label.
 *
 * It is still native where it counts: `BottomSheet` from `@expo/ui` is a real
 * `UISheetPresentationController` on iOS and a Material 3 `ModalBottomSheet`
 * on Android. `RNHostView` is what lets the rows inside be ordinary React
 * Native views, so they take the design tokens like everything else. This
 * file therefore has no platform fork at all — the previous `menu.ios.tsx`
 * and `menu.android.tsx` are gone.
 */
export function Menu({
  actions,
  label,
  icon,
  accessibilityLabel,
  title,
  multiSelect = false,
  width,
  height,
  testID,
}: MenuProps) {
  const { colors } = useTokens();
  const { width: windowWidth } = useWindowDimensions();
  const [open, setOpen] = useState(false);
  const empty = actions.length === 0;

  /**
   * `RNHostView` sizes to its content inside the native sheet, so short rows
   * ("Exiting") produced a half-width panel floating on the left. The sheet
   * insets its content by 16 on each side, so this is the full usable width.
   */
  const sheetWidth = windowWidth - space.edge * 2;

  const runAction = useCallback(
    (action: MenuAction) => {
      if (action.disabled) return;
      // A filter stays open so the next tap is a tap, not a re-open.
      if (!multiSelect) setOpen(false);
      action.onPress?.();
    },
    [multiSelect],
  );

  return (
    <>
      <Pressable
        onPress={() => setOpen(true)}
        disabled={empty}
        hitSlop={8}
        accessibilityRole={empty ? undefined : 'button'}
        accessibilityLabel={accessibilityLabel}
        accessibilityState={{ expanded: open, disabled: empty }}
        testID={testID}
        style={({ pressed }) => [
          styles.trigger,
          !!width && { width },
          !!height && { minHeight: height },
          pressed && styles.pressed,
        ]}>
        {label ? (
          <Text
            style={[type.headline, { color: empty ? colors.dimmed : colors.accent }]}
            numberOfLines={1}>
            {label}
          </Text>
        ) : icon ? (
          <Icon name={icon} size={20} color={empty ? colors.dimmed : colors.accent} />
        ) : null}
      </Pressable>

      <BottomSheet isPresented={open} onDismiss={() => setOpen(false)}>
        <RNHostView matchContents>
          <View style={[styles.sheet, { width: sheetWidth, backgroundColor: colors.card }]}>
            <View style={styles.sheetHeader}>
              <Text style={[type.title3, styles.sheetTitle, { color: colors.foreground }]}>
                {title ?? accessibilityLabel}
              </Text>
              <Pressable
                onPress={() => setOpen(false)}
                hitSlop={12}
                accessibilityRole="button"
                accessibilityLabel={multiSelect ? 'Done' : 'Close'}
                testID={testID ? `${testID}-done` : undefined}>
                <Text style={[type.headline, { color: colors.accent }]}>
                  {multiSelect ? 'Done' : 'Close'}
                </Text>
              </Pressable>
            </View>

            {actions.map((action, index) => (
              <Row
                key={action.id}
                action={action}
                last={index === actions.length - 1}
                onPress={() => runAction(action)}
                testID={testID ? `${testID}-${action.id}` : undefined}
              />
            ))}
          </View>
        </RNHostView>
      </BottomSheet>
    </>
  );
}

function Row({
  action,
  last,
  onPress,
  testID,
}: {
  action: MenuAction;
  last: boolean;
  onPress: () => void;
  testID?: string;
}) {
  const { colors } = useTokens();
  const tint = action.destructive ? colors.statusAlert : colors.accent;
  const titleColor = action.disabled
    ? colors.dimmed
    : action.destructive
      ? colors.statusAlert
      : colors.foreground;

  return (
    <Pressable
      onPress={onPress}
      disabled={action.disabled}
      accessibilityRole={action.disabled ? undefined : 'button'}
      accessibilityLabel={action.label}
      accessibilityState={{ disabled: !!action.disabled, selected: !!action.selected }}
      testID={testID}
      style={({ pressed }) => [styles.row, pressed && !action.disabled && styles.pressed]}>
      {action.icon ? (
        <Icon
          name={action.icon}
          size={20}
          color={action.disabled ? colors.dimmed : tint}
          style={styles.rowIcon}
        />
      ) : null}
      <View style={styles.rowWords}>
        <Text style={[type.headline, { color: titleColor }]} numberOfLines={1}>
          {action.label}
        </Text>
        {action.description ? (
          <Text style={[type.footnote, { color: colors.tertiary }]} numberOfLines={2}>
            {action.description}
          </Text>
        ) : null}
      </View>
      {action.selected ? <Icon name="check" size={18} color={colors.accent} /> : null}
      {!last ? (
        <View style={[styles.separator, { backgroundColor: colors.divider }]} pointerEvents="none" />
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  trigger: {
    minHeight: 44,
    minWidth: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: { opacity: 0.6 },
  sheet: {
    borderRadius: radius.md,
    borderCurve: 'continuous',
    overflow: 'hidden',
    paddingBottom: space.sm,
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: space.md,
    paddingHorizontal: space.card,
    paddingTop: space.md,
    paddingBottom: space.sm,
  },
  sheetTitle: { flexShrink: 1 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    minHeight: 56,
    paddingHorizontal: space.card,
    paddingVertical: space.md,
  },
  rowIcon: { marginTop: 2 },
  rowWords: { flex: 1, gap: space.xxs },
  separator: {
    position: 'absolute',
    left: space.card,
    right: 0,
    bottom: 0,
    height: StyleSheet.hairlineWidth,
  },
});
