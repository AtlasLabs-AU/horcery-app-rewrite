// Default export AND a named export of the same name; the alias keeps the
// import-rule happy without pretending they are the same thing.
import { default as NativeSheet, BottomSheetView } from '@expo/ui/community/bottom-sheet';
import { useCallback, useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Icon } from '@/components/ui/icon';
import type { MenuAction, MenuProps } from '@/components/ui/menu-types';
import { useSheetScale } from '@/components/ui/sheet-scale';
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
 * **Which sheet (decided 2026-08-17 after three prototypes).** This uses
 * `@expo/ui/community/bottom-sheet` — a real iOS sheet with detents and a
 * Material 3 `ModalBottomSheet` on Android — because it is the only option
 * that brings the *gesture*: drag to dismiss, and drag between resting
 * heights. A hand-animated version (the "MotionFlix" prototype) reproduced
 * the look but had no gesture at all, and hand-writing drag physics is
 * exactly where "smooth over showy" goes wrong.
 *
 * The one thing the native sheet does not do is move the app behind it, and
 * that recession is the part of the MotionFlix transition Inakshi picked. It
 * lives in `SheetScaleHost`, wrapped around the root navigator — see the note
 * there for why that is the only hand-animated piece.
 *
 * Content is ordinary React Native, so the rows take the design tokens like
 * everything else. This file has no platform fork at all — the previous
 * `menu.ios.tsx` and `menu.android.tsx` are gone.
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
  const [open, setOpen] = useState(false);
  const empty = actions.length === 0;
  const sheetScale = useSheetScale();

  // The app recedes while the sheet is up, and comes back when it goes —
  // including when the sheet is DRAGGED away rather than dismissed by us.
  useEffect(() => {
    if (!open) return undefined;
    sheetScale.present();
    return () => sheetScale.release();
  }, [open, sheetScale]);

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

      <NativeSheet
        index={open ? 0 : -1}
        onClose={() => setOpen(false)}
        onDismiss={() => setOpen(false)}
        enablePanDownToClose
        // Content height, not fixed detents: these lists are three to seven
        // short rows, and a 72%-tall sheet holding three rows is mostly empty
        // sheet. A long sheet can pass snap points when one exists.
        enableDynamicSizing
        backgroundStyle={{ backgroundColor: colors.background }}
        handleIndicatorStyle={{ backgroundColor: colors.tertiary }}>
        <BottomSheetView>
          <View style={[styles.sheet, { backgroundColor: colors.background }]}>
            <View style={styles.sheetHeader}>
              <Text style={[type.title3, styles.sheetTitle, { color: colors.foreground }]}>
                {title ?? accessibilityLabel}
              </Text>
              <Pressable
                onPress={() => setOpen(false)}
                hitSlop={12}
                accessibilityRole="button"
                accessibilityLabel={multiSelect ? 'Done' : 'Close'}
                testID={testID ? `${testID}-done` : undefined}
                style={({ pressed }) => [styles.closeButton, pressed && styles.pressed]}>
                {multiSelect ? (
                  <Text style={[type.footnote, { color: colors.accent, fontWeight: '600' }]}>
                    Done
                  </Text>
                ) : (
                  <Icon name="close" size={16} color={colors.tertiary} />
                )}
              </Pressable>
            </View>
            <View style={[styles.separatorBar, { backgroundColor: colors.divider }]} />

            <ScrollView
              // A long filter list must stay reachable on a small phone; a
              // short one measures to its content and never scrolls.
              style={styles.rows}
              contentContainerStyle={styles.rowsContent}
              showsVerticalScrollIndicator={false}>
              {actions.map((action, index) => (
                <Row
                  key={action.id}
                  action={action}
                  last={index === actions.length - 1}
                  onPress={() => runAction(action)}
                  testID={testID ? `${testID}-${action.id}` : undefined}
                />
              ))}
            </ScrollView>
          </View>
        </BottomSheetView>
      </NativeSheet>
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
    paddingTop: space.xs,
    // Clears the home indicator: a native sheet ends at the screen edge.
    paddingBottom: space.xl,
  },
  /** A long filter stays reachable on a small phone; a short one never scrolls. */
  rows: { maxHeight: 420 },
  rowsContent: { paddingBottom: space.sm },
  dragHandle: {
    alignSelf: 'center',
    width: 36,
    height: 5,
    borderRadius: radius.full,
    marginBottom: space.sm,
    opacity: 0.5,
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: space.md,
    paddingHorizontal: space.sm + space.xs,
    paddingTop: space.sm,
    paddingBottom: space.sm,
  },
  closeButton: {
    minHeight: 26,
    minWidth: 26,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.full,
  },
  separatorBar: {
    height: StyleSheet.hairlineWidth,
    marginHorizontal: space.sm,
    marginBottom: space.xs,
  },
  sheetTitle: { flexShrink: 1 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    minHeight: 60,
    paddingHorizontal: space.sm + space.xs,
    paddingVertical: space.md,
  },
  rowIcon: { marginTop: 2, opacity: 0.95 },
  rowWords: { flex: 1, gap: space.xxs },
  separator: {
    position: 'absolute',
    left: space.sm + space.xs,
    right: 0,
    bottom: 0,
    height: StyleSheet.hairlineWidth,
  },
});
