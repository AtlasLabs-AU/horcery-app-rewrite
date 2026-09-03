import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef } from 'react';
import {
  Alert,
  Animated,
  Easing,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { authRn } from '@acme/config/firebase-rn';
import { queries, queryClient } from '@acme/services';
import { useAuthStore } from '@acme/stores/authorization-states';
import { Icon, type IconName } from '@/components/ui/icon';
import { font } from '@/constants/fonts';
import { useTokens } from '@/hooks/use-tokens';
import { radius, space, type } from '@/constants/tokens';

const OVERLAY_OPACITY = 0.45;
const SLIDE_MS = 250; // motion token `base`

/**
 * The main menu, redone per the UI design brief.
 *
 * The current app paints this as a full-screen solid #615FFF panel — the
 * largest saturated flood in the app, exactly what the accent rules forbid.
 * Here it is a side panel sliding over a dimmed page: calm canvas, grouped
 * cards, tonal indigo icon wells, saturated accent only on the
 * active-organization check. Same six actions, same organization switcher.
 */
export default function MenuScreen() {
  const { colors } = useTokens();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  // Full-screen, like the current app — the slide direction still says "sidebar".
  const panelWidth = width;

  const progress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(progress, {
      toValue: 1,
      duration: SLIDE_MS,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [progress]);

  const close = useCallback(() => {
    Animated.timing(progress, {
      toValue: 0,
      duration: SLIDE_MS,
      easing: Easing.in(Easing.cubic),
      useNativeDriver: true,
    }).start(() => router.back());
  }, [progress]);

  const organizationID = useAuthStore((s) => s.organizationID);
  const setOrganization = useAuthStore((s) => s.setOrganization);

  const { data: organizationList } = useQuery({
    ...queries.organization.list({ ordering: '-created_at' }),
  });
  const organizations = useMemo(
    () => organizationList?.data ?? [],
    [organizationList],
  );

  const selectOrganization = (id: string) => {
    const next = organizations.find((org) => org.id === id);
    if (next) {
      setOrganization(next.id, next.name ?? null);
      close();
    }
  };

  const confirmLogOut = () => {
    Alert.alert('Log out?', 'You can sign back in any time.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Log Out',
        style: 'destructive',
        onPress: () => {
          // All three, in this order. The persisted auth store outlives the
          // Firebase session, so skipping it leaves the previous account's
          // organization and user record on the device for whoever signs in
          // next — on a shared tablet that is another tenant's data on screen.
          queryClient.clear();
          useAuthStore.getState().signOut();
          authRn.signOut().catch(() => {
            // Already signed out locally; nothing further to do.
          });
        },
      },
    ]);
  };

  return (
    <View style={styles.root} testID="main-menu">
      <Animated.View
        style={[
          StyleSheet.absoluteFill,
          styles.overlay,
          { opacity: Animated.multiply(progress, OVERLAY_OPACITY) },
        ]}>
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={close}
          accessibilityRole="button"
          accessibilityLabel="Close menu"
        />
      </Animated.View>

      <Animated.View
        style={[
          styles.panel,
          {
            width: panelWidth,
            backgroundColor: colors.background,
            transform: [
              {
                translateX: progress.interpolate({
                  inputRange: [0, 1],
                  outputRange: [panelWidth, 0],
                }),
              },
            ],
          },
        ]}>
        <ScrollView
          contentContainerStyle={[
            styles.content,
            { paddingTop: insets.top + space.sm, paddingBottom: insets.bottom + space.lg },
          ]}>
          <View style={styles.headerRow}>
            <Text style={[type.title, { color: colors.foreground }]}>Menu</Text>
            <Pressable
              onPress={close}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel="Close menu"
              testID="menu-close"
              style={[styles.closeButton, { backgroundColor: colors.fillTonal }]}>
              <Icon name="close" size={14} color={colors.secondary} />
            </Pressable>
          </View>

          <MenuGroup>
            <MenuRow icon="account" label="My Account" />
            <MenuRow icon="organization" label="Manage Organization" external />
            <MenuRow icon="devices" label="Devices" last />
          </MenuGroup>

          <Text style={[type.eyebrow, styles.eyebrow, { color: colors.tertiary }]}>
            Organizations
          </Text>
          <MenuGroup>
            {organizations.map((org, index) => (
              <OrganizationRow
                key={org.id}
                name={org.name ?? 'Unnamed organization'}
                active={org.id === organizationID}
                last={index === organizations.length - 1}
                onPress={() => selectOrganization(org.id)}
              />
            ))}
          </MenuGroup>

          <MenuGroup style={styles.footerGroup}>
            <MenuRow icon="info" label="About Us" />
            <MenuRow icon="support" label="Support" external />
            <MenuRow
              icon="logOut"
              label="Log Out"
              last
              onPress={confirmLogOut}
              testID="menu-log-out"
            />
          </MenuGroup>
        </ScrollView>
      </Animated.View>
    </View>
  );
}

function MenuGroup({
  children,
  style,
}: {
  children: React.ReactNode;
  style?: object;
}) {
  const { colors } = useTokens();
  return (
    <View style={[styles.group, { backgroundColor: colors.card }, style]}>
      {children}
    </View>
  );
}

/**
 * One action row. A row with no handler renders dimmed, without a button
 * role or chevron — the standing rule from requirements §6b item 3: a visible
 * control navigates, acts, is visibly disabled with a reason, or does not
 * render. These light up as their destinations are built.
 */
function MenuRow({
  icon,
  label,
  external,
  last,
  onPress,
  testID,
}: {
  icon: IconName;
  label: string;
  external?: boolean;
  last?: boolean;
  onPress?: () => void;
  testID?: string;
}) {
  const { colors } = useTokens();
  const wired = !!onPress;
  return (
    <Pressable
      onPress={onPress}
      disabled={!wired}
      accessibilityRole={wired ? 'button' : undefined}
      accessibilityLabel={wired ? label : undefined}
      testID={testID}
      style={({ pressed }) => [styles.row, pressed && wired && { backgroundColor: colors.bed }]}>
      {/* Bare icon, no tinted well (editorial pass 2026-08-17). */}
      <View style={styles.iconWell}>
        <Icon name={icon} size={20} color={wired ? colors.foreground : colors.dimmed} />
      </View>
      <Text
        style={[type.body, styles.rowLabel, { color: wired ? colors.foreground : colors.tertiary }]}
        numberOfLines={1}>
        {label}
      </Text>
      {wired ? (
        <Icon name={external ? 'external' : 'chevronRight'} size={13} color={colors.dimmed} />
      ) : null}
      {last ? null : (
        <View style={[styles.separator, { backgroundColor: colors.divider }]} />
      )}
    </Pressable>
  );
}

function OrganizationRow({
  name,
  active,
  last,
  onPress,
}: {
  name: string;
  active: boolean;
  last?: boolean;
  onPress: () => void;
}) {
  const { colors } = useTokens();
  const initials = name
    .split(/\s+/)
    .slice(0, 2)
    .map((word) => word[0]?.toUpperCase() ?? '')
    .join('');
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={name}
      accessibilityState={{ selected: active }}
      style={({ pressed }) => [styles.row, pressed && { backgroundColor: colors.bed }]}>
      <View style={[styles.avatar, { backgroundColor: colors.bed }]}>
        <Text style={[type.footnote, { color: colors.accent, fontFamily: font.semibold }]}>
          {initials}
        </Text>
      </View>
      <Text style={[type.body, styles.rowLabel, { color: colors.foreground }]} numberOfLines={1}>
        {name}
      </Text>
      {active ? (
        <Icon name="checkFilled" size={20} color={colors.accent} />
      ) : null}
      {last ? null : (
        <View style={[styles.separator, { backgroundColor: colors.divider }]} />
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  overlay: {
    backgroundColor: '#000000',
  },
  panel: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    overflow: 'hidden',
  },
  content: {
    padding: space.edge,
    gap: space.edge,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: space.xs,
  },
  closeButton: {
    width: 30,
    height: 30,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  group: {
    borderRadius: radius.md,
    borderCurve: 'continuous',
    overflow: 'hidden',
  },
  eyebrow: {
    marginTop: space.sm,
    marginBottom: -space.sm,
    paddingHorizontal: space.xs,
  },
  footerGroup: {
    marginTop: space.sm,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    paddingHorizontal: space.edge,
    minHeight: 54,
  },
  rowLabel: {
    flex: 1,
  },
  iconWell: {
    width: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  separator: {
    position: 'absolute',
    left: space.edge + 32 + space.md,
    right: 0,
    bottom: 0,
    height: StyleSheet.hairlineWidth,
  },
});
