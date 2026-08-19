import { router } from 'expo-router';
import { Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Icon, type IconName } from '@/components/ui/icon';
import { useToast } from '@/components/ui/toast';
import { config } from '@/config/env';
import { useTokens } from '@/hooks/use-tokens';
import { radius, space, type } from '@/constants/tokens';
import { BottomTabInset } from '@/constants/theme';

/**
 * The More tab, redone in the confirmed design language (requirements §4e):
 * grouped cards on the calm canvas, tonal indigo icon wells, accent reserved
 * for small emphasis.
 *
 * Content mirrors the current app's More page. Differences, on purpose:
 * - Feeding Plans is omitted — it is invisible dead code in the current app.
 * - Sandbox (env-gated developer entry) is omitted from the prototype.
 * - Spaces and Manage Alerts are feature/role-gated in production; the
 *   prototype shows them unconditionally (Remote Config runs on defaults in
 *   Expo Go).
 * Rows whose destination exists navigate (Manage Alerts → /alerts, from the
 * alerts slice A2); the rest are visibly disabled until theirs does.
 */
export default function MoreScreen() {
  const { colors } = useTokens();
  const { showToast } = useToast();
  const openAlerts = () => router.push('/alerts');
  const feedbackUrl = config.web.FEEDBACK_FORM_URL.trim();
  const openFeedback = () => {
    void Linking.openURL(feedbackUrl).catch(() =>
      showToast('Feedback could not be opened.'),
    );
  };

  return (
    <View style={[styles.page, { backgroundColor: colors.background }]}>
      <SafeAreaView style={styles.page} edges={['top']}>
        <View style={styles.headerRow}>
          <Text style={[type.largeTitle, { color: colors.foreground }]}>More</Text>
          <Pressable
            onPress={() => router.push('/menu')}
            hitSlop={12}
            accessibilityRole="button"
            accessibilityLabel="Open menu"
            testID="more-menu-button">
            <Icon name="menu" size={24} color={colors.foreground} />
          </Pressable>
        </View>

        <ScrollView contentContainerStyle={styles.content}>
          <View style={[styles.group, { backgroundColor: colors.card }]}>
            <MoreRow
              icon="spaces"
              title="Spaces"
              description="Video feeds from all your connected cameras in one place."
              testID="more-spaces"
            />
            <MoreRow
              icon="clips"
              title="Clips"
              description="Clips you created, received, or shared across your organization."
              testID="more-clips"
            />
            <MoreRow
              icon="devices"
              title="Devices"
              description="Keep track of all connected devices."
              testID="more-devices"
            />
            <MoreRow
              icon="alerts"
              title="Manage Alerts"
              description="Global and horse-specific alerts, so you never miss anything."
              last
              onPress={openAlerts}
              testID="more-alerts"
            />
          </View>

          {feedbackUrl ? (
            <View style={[styles.feedbackCard, { backgroundColor: colors.bed }]}>
              <Text style={[type.headline, { color: colors.foreground }]}>
                {'We’d love to hear from you! 🐴'}
              </Text>
              <Text style={[type.subhead, { color: colors.secondary }]}>
                Your feedback helps us build features that truly support your
                horses and your stable life.
              </Text>
              <Pressable
                onPress={openFeedback}
                accessibilityRole="button"
                accessibilityLabel="Give Feedback"
                testID="more-feedback"
                style={({ pressed }) => [
                  styles.feedbackButton,
                  { backgroundColor: colors.card },
                  pressed && styles.pressed,
                ]}>
                <Icon name="feedback" size={16} color={colors.accent} />
                <Text style={[type.headline, { color: colors.accent }]}>
                  Give Feedback
                </Text>
              </Pressable>
            </View>
          ) : null}
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

/**
 * Icon well + title + one-line description + chevron.
 *
 * A row with no destination renders as PLAIN TEXT, dimmed, with no button
 * role and no chevron — never as a control that looks tappable and isn't
 * (requirements §6b item 3). The rows light up as their screens are built.
 */
function MoreRow({
  icon,
  title,
  description,
  last,
  onPress,
  testID,
}: {
  icon: IconName;
  title: string;
  description: string;
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
      accessibilityLabel={wired ? title : undefined}
      testID={testID}
      style={({ pressed }) => [styles.row, pressed && wired && { backgroundColor: colors.bed }]}>
      {/* Bare icon, no tinted well (editorial pass 2026-08-17). */}
      <View style={styles.iconWell}>
        <Icon name={icon} size={20} color={wired ? colors.foreground : colors.dimmed} />
      </View>
      <View style={styles.rowText}>
        <Text style={[type.body, { color: wired ? colors.foreground : colors.tertiary }]}>
          {title}
        </Text>
        <Text
          style={[type.footnote, { color: wired ? colors.secondary : colors.dimmed }]}
          numberOfLines={2}>
          {wired ? description : `${description} (coming soon)`}
        </Text>
      </View>
      {wired ? <Icon name="chevronRight" size={13} color={colors.dimmed} /> : null}
      {last ? null : (
        <View style={[styles.separator, { backgroundColor: colors.divider }]} />
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  page: {
    flex: 1,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: space.edge,
    paddingVertical: space.sm,
  },
  content: {
    padding: space.edge,
    paddingBottom: BottomTabInset + space.xl,
    gap: space.edge,
  },
  group: {
    borderRadius: radius.md,
    borderCurve: 'continuous',
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    paddingHorizontal: space.edge,
    paddingVertical: space.md,
    minHeight: 64,
  },
  rowText: {
    flex: 1,
    gap: space.xxs,
  },
  iconWell: {
    width: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  separator: {
    position: 'absolute',
    left: space.edge + 36 + space.md,
    right: 0,
    bottom: 0,
    height: StyleSheet.hairlineWidth,
  },
  feedbackCard: {
    borderRadius: radius.md,
    borderCurve: 'continuous',
    padding: space.card,
    gap: space.sm,
  },
  feedbackButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: space.sm,
    minHeight: 44,
    borderRadius: radius.full,
    alignSelf: 'flex-start',
    paddingHorizontal: space.lg,
    marginTop: space.sm,
  },
  pressed: {
    opacity: 0.7,
  },
});
