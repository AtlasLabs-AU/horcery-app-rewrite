import type { ReactNode } from 'react';
import { Linking, Pressable, StyleSheet, Text, View } from 'react-native';

import { Icon } from '@/components/ui/icon';
import type { IconName } from '@/components/ui/icon-names';
import { useToast } from '@/components/ui/toast';
import { config } from '@/config/env';
import { radius, space, type } from '@/constants/tokens';
import { useTokens } from '@/hooks/use-tokens';

/**
 * Generic page states — the shapes `horses-states.tsx` established (glyph in
 * a grey circle, title, one line, an action), lifted out so a second page
 * does not copy 150 lines. Horses still carries its own copies while another
 * session is working in that folder; unify when that settles.
 */

export function StateShell({
  icon,
  title,
  detail,
  children,
  testID,
}: {
  icon: IconName;
  title: string;
  detail: string;
  children?: ReactNode;
  testID?: string;
}) {
  const { colors } = useTokens();
  return (
    <View style={styles.state} testID={testID}>
      <View style={[styles.stateIcon, { backgroundColor: colors.fillTonal }]}>
        <Icon name={icon} size={26} color={colors.accent} />
      </View>
      <Text style={[type.title3, styles.centered, { color: colors.foreground }]}>{title}</Text>
      <Text style={[type.subhead, styles.detail, { color: colors.secondary }]}>{detail}</Text>
      {children}
    </View>
  );
}

function ContactSupport() {
  const { colors } = useTokens();
  const { showToast } = useToast();
  const open = () => {
    void Linking.openURL(config.web.SUPPORT_URL).catch(() => showToast('Support could not be opened.'));
  };
  return (
    <Pressable onPress={open} accessibilityRole="button" accessibilityLabel="Contact support" style={styles.supportButton}>
      <Text style={[type.subhead, { color: colors.accent }]}>Contact Support</Text>
    </Pressable>
  );
}

export function ErrorState({
  title,
  detail = 'Check your connection and try again.',
  onRetry,
  testID,
}: {
  title: string;
  detail?: string;
  onRetry: () => void;
  testID?: string;
}) {
  const { colors } = useTokens();
  return (
    <StateShell icon="info" title={title} detail={detail} testID={testID}>
      <Pressable
        onPress={onRetry}
        accessibilityRole="button"
        accessibilityLabel="Try again"
        style={({ pressed }) => [styles.primary, { backgroundColor: colors.inverse }, pressed && { opacity: 0.85 }]}>
        <Text style={[type.headline, { color: colors.onInverse }]}>Try again</Text>
      </Pressable>
      <ContactSupport />
    </StateShell>
  );
}

export function NoInternetState({ onRetry, enabled, testID }: { onRetry: () => void; enabled: boolean; testID?: string }) {
  const { colors } = useTokens();
  return (
    <StateShell
      icon="wifiOff"
      title="No internet connection"
      detail="Reconnect your network and the page will refresh automatically."
      testID={testID}>
      <Pressable
        onPress={onRetry}
        disabled={!enabled}
        accessibilityRole={enabled ? 'button' : undefined}
        accessibilityLabel={enabled ? 'Retry when online' : 'Retry unavailable while offline'}
        style={({ pressed }) => [
          styles.primary,
          { backgroundColor: enabled ? colors.inverse : colors.bed },
          pressed && enabled && { opacity: 0.85 },
          !enabled && { opacity: 0.6 },
        ]}>
        <Text style={[type.headline, { color: enabled ? colors.onInverse : colors.tertiary }]}>
          {enabled ? 'Retry' : 'Waiting for connection'}
        </Text>
      </Pressable>
      <ContactSupport />
    </StateShell>
  );
}

/** N grey rows standing in for a list while it loads. */
export function ListSkeleton({ rows = 3, rowHeight = 96, testID }: { rows?: number; rowHeight?: number; testID?: string }) {
  const { colors } = useTokens();
  return (
    <View style={styles.skeletons} accessibilityLabel="Loading" testID={testID}>
      {Array.from({ length: rows }, (_, i) => (
        <View key={i} style={[styles.skeleton, { height: rowHeight, backgroundColor: colors.card }]}>
          <View style={[styles.skeletonGlyph, { backgroundColor: colors.fillTonal }]} />
          <View style={styles.skeletonLines}>
            <View style={[styles.lineWide, { backgroundColor: colors.fillTonal }]} />
            <View style={[styles.lineShort, { backgroundColor: colors.fillTonal }]} />
          </View>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  state: {
    minHeight: 360,
    alignItems: 'center',
    justifyContent: 'center',
    gap: space.sm,
    paddingHorizontal: space.xl,
  },
  stateIcon: {
    width: 56,
    height: 56,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: space.xs,
  },
  centered: { textAlign: 'center' },
  detail: { textAlign: 'center', maxWidth: 300 },
  primary: {
    minHeight: 44,
    marginTop: space.sm,
    paddingHorizontal: space.card,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  supportButton: { minHeight: 44, alignItems: 'center', justifyContent: 'center', paddingHorizontal: space.md },
  skeletons: { gap: space.md, paddingHorizontal: space.edge, paddingTop: space.md },
  skeleton: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: space.md,
    padding: space.md,
    borderRadius: radius.md,
    borderCurve: 'continuous',
  },
  skeletonGlyph: { width: 28, height: 28, borderRadius: radius.full },
  skeletonLines: { flex: 1, gap: space.sm },
  lineWide: { height: 18, width: '66%', borderRadius: radius.xs },
  lineShort: { height: 14, width: '90%', borderRadius: radius.xs },
});
