import { BottomSheet, RNHostView } from '@expo/ui';
import {
  BottomSheet as CommunityBottomSheet,
  BottomSheetView,
  type BottomSheetMethods,
} from '@expo/ui/community/bottom-sheet';
import { router } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import Animated, {
  interpolate,
  runOnJS,
  useAnimatedStyle,
  useDerivedValue,
  withSpring,
} from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Icon } from '@/components/ui/icon';
import { useTokens } from '@/hooks/use-tokens';
import { radius, space, type } from '@/constants/tokens';

const ACTIONS = [
  {
    id: 'share',
    label: 'Share',
    description: 'Create a secure sharing link for this resource.',
    icon: 'share',
  },
  {
    id: 'edit',
    label: 'Edit',
    description: 'Open a form and update metadata.',
    icon: 'edit',
  },
  {
    id: 'remove',
    label: 'Remove',
    description: 'Permanently delete with confirmation.',
    icon: 'remove',
  },
  {
    id: 'group',
    label: 'Manage groups',
    description: 'Move this item between barn groupings.',
    icon: 'group',
  },
] as const;

export default function ProtoBottomSheet() {
  const { colors } = useTokens();
  const { height: windowHeight, width: windowWidth } = useWindowDimensions();

  const [isExpoSheetOpen, setIsExpoSheetOpen] = useState(false);
  const [communitySheetIndex, setCommunitySheetIndex] = useState(-1);
  const [isMotionSheetMounted, setIsMotionSheetMounted] = useState(false);
  const [isMotionSheetOpen, setIsMotionSheetOpen] = useState(false);
  const communitySheetRef = useRef<BottomSheetMethods>(null);

  const closeCommunitySheet = useCallback(() => setCommunitySheetIndex(-1), []);
  const openCommunitySheet = useCallback(() => {
    setIsExpoSheetOpen(false);
    setCommunitySheetIndex(0);
  }, []);
  const openExpoSheet = useCallback(() => {
    closeCommunitySheet();
    setIsExpoSheetOpen(true);
  }, [closeCommunitySheet]);

  const openMotionSheet = useCallback(() => {
    setIsExpoSheetOpen(false);
    closeCommunitySheet();
    setIsMotionSheetMounted(true);
    setIsMotionSheetOpen(true);
  }, [closeCommunitySheet]);

  const closeMotionSheet = useCallback(() => setIsMotionSheetOpen(false), []);

  /*
    Derived from state rather than assigned in a handler: writing to a shared
    value that a hook already captured is what the React Compiler's
    immutability rule forbids, and it fails the lint gate.
  */
  const motionProgress = useDerivedValue(() =>
    withSpring(
      isMotionSheetOpen ? 1 : 0,
      { damping: isMotionSheetOpen ? 22 : 24, stiffness: isMotionSheetOpen ? 220 : 260, mass: 0.8 },
      (finished) => {
        if (finished && !isMotionSheetOpen) runOnJS(setIsMotionSheetMounted)(false);
      },
    ),
  );

  const motionScreenStyle = useAnimatedStyle(() => ({
    borderRadius: interpolate(motionProgress.value, [0, 1], [0, radius.lg]),
    transform: [
      { scale: interpolate(motionProgress.value, [0, 1], [1, 0.94]) },
      { translateY: interpolate(motionProgress.value, [0, 1], [0, -10]) },
    ],
  }));

  const motionBackdropStyle = useAnimatedStyle(() => ({
    opacity: interpolate(motionProgress.value, [0, 1], [0, 0.42]),
  }));

  const motionSheetStyle = useAnimatedStyle(() => ({
    opacity: interpolate(motionProgress.value, [0, 0.12, 1], [0, 1, 1]),
    transform: [{ translateY: interpolate(motionProgress.value, [0, 1], [windowHeight, 0]) }],
  }));

  const sheetWidth = windowWidth - space.edge * 2;

  const communityRows = ACTIONS.map((action) => (
    <ActionRow
      key={action.id}
      label={action.label}
      description={action.description}
      icon={action.icon}
      isDestructive={action.id === 'remove'}
      onPress={closeCommunitySheet}
    />
  ));

  const primaryRows = ACTIONS.map((action) => (
    <ActionRow
      key={`${action.id}-primary`}
      label={action.label}
      description={action.description}
      icon={action.icon}
      isDestructive={action.id === 'remove'}
      onPress={() => setIsExpoSheetOpen(false)}
    />
  ));

  return (
    <View style={[styles.page, { backgroundColor: colors.background }]}> 
      <Animated.View
        style={[styles.page, styles.motionScreen, motionScreenStyle, { backgroundColor: colors.background }]}> 
        <SafeAreaView style={styles.page} edges={['top']}>
        <View style={styles.header}>
          <Pressable
            onPress={() => router.back()}
            hitSlop={12}
            accessibilityRole="button"
            accessibilityLabel="Back"
            style={styles.iconButton}
            testID="bottom-sheet-back">
            <Icon name="back" size={20} color={colors.foreground} />
          </Pressable>
          <Text style={[type.title3, { color: colors.foreground }]}>Bottom sheet options</Text>
          <View style={styles.iconSpacer} />
        </View>

        <ScrollView contentContainerStyle={styles.content}>
          <Text style={[type.body, { color: colors.foreground }]}>
            Compare three prototype options side-by-side. Option C recreates the
            MotionFlix transition locally with the Reanimated dependency already in this app.
          </Text>

          <Text style={[type.eyebrow, styles.sectionHeader, { color: colors.tertiary }]}>
            Option A · current rewrite sheet
          </Text>
          <Pressable
            onPress={openExpoSheet}
            accessibilityRole="button"
            accessibilityLabel="Open Expo UI sheet"
            testID="open-expo-sheet"
            style={({ pressed }) => [styles.launchButton, { backgroundColor: colors.card }, pressed && styles.pressed]}>
            <Text style={[type.headline, { color: colors.foreground }]}>Open Expo UI BottomSheet</Text>
            <Text style={[type.subhead, { color: colors.tertiary }]}>
              Built with @expo/ui BottomSheet + RNHostView
            </Text>
          </Pressable>

          <Text style={[type.eyebrow, styles.sectionHeader, { color: colors.tertiary }]}> 
            Option B · community bottom sheet
          </Text>
          <Pressable
            onPress={openCommunitySheet}
            accessibilityRole="button"
            accessibilityLabel="Open community bottom sheet"
            testID="open-community-sheet"
            style={({ pressed }) => [
              styles.launchButton,
              { backgroundColor: colors.card },
              pressed && styles.pressed,
            ]}>
            <Text style={[type.headline, { color: colors.foreground }]}>
              Open community BottomSheet
            </Text>
            <Text style={[type.subhead, { color: colors.tertiary }]}>
              @expo/ui/community/bottom-sheet (native modal sheet)
            </Text>
          </Pressable>

          <Text style={[type.eyebrow, styles.sectionHeader, { color: colors.tertiary }]}> 
            Option C · MotionFlix transition
          </Text>
          <Pressable
            onPress={openMotionSheet}
            accessibilityRole="button"
            accessibilityLabel="Open MotionFlix transition sheet"
            testID="open-motionflix-sheet"
            style={({ pressed }) => [
              styles.launchButton,
              { backgroundColor: colors.card },
              pressed && styles.pressed,
            ]}>
            <Text style={[type.headline, { color: colors.foreground }]}>Open transition sheet</Text>
            <Text style={[type.subhead, { color: colors.tertiary }]}> 
              Scales the page, dims the backdrop, and springs the sheet into place
            </Text>
          </Pressable>

          <Text style={[type.footnote, { color: colors.tertiary }]}>
            Open each one and compare drag feel, elevation, header treatment, and close behavior in light
            and dark mode.
          </Text>
        </ScrollView>
        </SafeAreaView>
      </Animated.View>

      <BottomSheet isPresented={isExpoSheetOpen} onDismiss={() => setIsExpoSheetOpen(false)}>
        <RNHostView matchContents>
          <View style={[styles.sheetCard, { width: sheetWidth, backgroundColor: colors.card }]}>
            <View style={[styles.handle, { backgroundColor: colors.divider }]} />
            <View style={styles.sheetHeader}>
              <Text style={[type.title3, styles.sheetTitle, { color: colors.foreground }]}>
                Expo UI prototype
              </Text>
              <Pressable
                onPress={() => setIsExpoSheetOpen(false)}
                accessibilityRole="button"
                accessibilityLabel="Close Expo UI sheet"
                hitSlop={10}
                style={[styles.closeTextButton, { backgroundColor: colors.bed }]}>
                <Text style={[type.subhead, { color: colors.foreground }]}>Done</Text>
              </Pressable>
            </View>
            <View style={[styles.divider, { backgroundColor: colors.divider }]} />
            {primaryRows}
          </View>
        </RNHostView>
      </BottomSheet>

      <CommunityBottomSheet
        ref={communitySheetRef}
        index={communitySheetIndex}
        snapPoints={['45%', '88%']}
        enablePanDownToClose
        backgroundStyle={{ backgroundColor: colors.card }}
        onDismiss={closeCommunitySheet}
        onClose={closeCommunitySheet}
        onChange={setCommunitySheetIndex}
        enableDynamicSizing={false}>
        <BottomSheetView style={[styles.communitySheet, { backgroundColor: colors.card }]}>
          <View style={styles.communityHandleWrap}>
            <View style={[styles.handle, { backgroundColor: colors.divider }]} />
          </View>
          <View style={styles.sheetHeader}>
            <View>
              <Text style={[type.title3, { color: colors.foreground }]}>Community sheet</Text>
              <Text style={[type.subhead, { color: colors.tertiary }]}>
                @expo/ui/community/bottom-sheet
              </Text>
            </View>
            <Pressable
              onPress={closeCommunitySheet}
              accessibilityRole="button"
              accessibilityLabel="Close community sheet"
              hitSlop={10}
              style={[styles.closeTextButton, { backgroundColor: colors.bed }]}>
              <Text style={[type.subhead, { color: colors.foreground }]}>Done</Text>
            </Pressable>
          </View>
          <View style={[styles.divider, { backgroundColor: colors.divider }]} />
          {communityRows}
        </BottomSheetView>
      </CommunityBottomSheet>

      {isMotionSheetMounted ? (
        <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
          <Animated.View
            style={[styles.motionBackdrop, { backgroundColor: colors.mediaWell }, motionBackdropStyle]}
            pointerEvents="auto">
            <Pressable
              style={StyleSheet.absoluteFill}
              onPress={closeMotionSheet}
              accessibilityRole="button"
              accessibilityLabel="Close transition sheet" />
          </Animated.View>
          <Animated.View
            style={[styles.motionSheet, { backgroundColor: colors.card }, motionSheetStyle]}
            accessibilityViewIsModal
            accessibilityLabel="MotionFlix transition sheet">
            <View style={styles.motionHandleWrap}>
              <View style={[styles.handle, { backgroundColor: colors.divider }]} />
            </View>
            <View style={styles.sheetHeader}>
              <View style={styles.sheetText}>
                <Text style={[type.title3, { color: colors.foreground }]}>Horse options</Text>
                <Text style={[type.subhead, { color: colors.tertiary }]}>MotionFlix-style transition</Text>
              </View>
              <Pressable
                onPress={closeMotionSheet}
                accessibilityRole="button"
                accessibilityLabel="Close transition sheet"
                hitSlop={10}
                style={[styles.closeTextButton, { backgroundColor: colors.bed }]}> 
                <Text style={[type.subhead, { color: colors.foreground }]}>Done</Text>
              </Pressable>
            </View>
            <View style={[styles.divider, { backgroundColor: colors.divider }]} />
            {ACTIONS.map((action) => (
              <ActionRow
                key={`${action.id}-motion`}
                label={action.label}
                description={action.description}
                icon={action.icon}
                isDestructive={action.id === 'remove'}
                onPress={closeMotionSheet}
              />
            ))}
          </Animated.View>
        </View>
      ) : null}
    </View>
  );
}

function ActionRow({
  icon,
  label,
  description,
  isDestructive,
  onPress,
}: {
  icon: 'share' | 'edit' | 'remove' | 'group';
  label: string;
  description: string;
  isDestructive?: boolean;
  onPress: () => void;
}) {
  const { colors } = useTokens();
  const tint = isDestructive ? colors.statusAlert : colors.foreground;

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${label} action`}
      style={({ pressed }) => [styles.sheetRow, pressed && { opacity: 0.65 }]}>
      <Icon name={icon} size={18} color={tint} />
      <View style={styles.sheetText}>
        <Text style={[type.body, { color: colors.foreground }]}>{label}</Text>
        <Text
          style={[type.footnote, { color: colors.tertiary }]}
          numberOfLines={2}>
          {description}
        </Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  page: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: space.edge,
    gap: space.md,
  },
  iconButton: {
    width: 36,
    height: 36,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconSpacer: {
    width: 36,
  },
  content: {
    paddingHorizontal: space.edge,
    gap: space.md,
    paddingBottom: space.xl,
  },
  sectionHeader: {
    marginTop: space.md,
  },
  launchButton: {
    borderRadius: radius.md,
    borderCurve: 'continuous',
    padding: space.md,
    gap: space.xs,
  },
  pressed: {
    opacity: 0.7,
  },
  sheetCard: {
    borderTopLeftRadius: radius.md,
    borderTopRightRadius: radius.md,
    borderCurve: 'continuous',
    overflow: 'hidden',
    paddingTop: space.xs,
    paddingBottom: space.sm,
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: space.md,
    paddingHorizontal: space.md,
    paddingBottom: space.md,
    paddingTop: space.md,
  },
  sheetTitle: {
    flex: 1,
  },
  closeTextButton: {
    minHeight: 28,
    minWidth: 56,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    marginHorizontal: space.md,
  },
  handle: {
    alignSelf: 'center',
    width: 34,
    height: 4,
    borderRadius: radius.full,
    opacity: 0.5,
  },
  sheetRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    paddingVertical: space.md,
    paddingHorizontal: space.md,
  },
  sheetText: {
    flex: 1,
    gap: space.xxs,
  },
  communitySheet: {
    borderTopLeftRadius: radius.md,
    borderTopRightRadius: radius.md,
    borderCurve: 'continuous',
    overflow: 'hidden',
    paddingBottom: space.md,
    paddingTop: space.sm,
  },
  communityHandleWrap: {
    alignItems: 'center',
  },
  motionBackdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  motionScreen: {
    overflow: 'hidden',
  },
  motionSheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    borderCurve: 'continuous',
    overflow: 'hidden',
    paddingBottom: space.xl,
    paddingTop: space.sm,
  },
  motionHandleWrap: {
    alignItems: 'center',
    paddingBottom: space.xs,
  },
});
