import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Icon } from '@/components/ui/icon';
import { CARD_HEIGHT } from '@/components/horses/horse-card';
import { radius, space, type } from '@/constants/tokens';
import { useTokens } from '@/hooks/use-tokens';

export function HorsesLoading() {
  const { colors } = useTokens();
  return (
    <View style={styles.loading} accessibilityLabel="Loading horses" testID="horses-loading">
      {[0, 1, 2].map((item) => (
        <View key={item} style={[styles.skeleton, { backgroundColor: colors.card }]}>
          <View style={[styles.skeletonImage, { backgroundColor: colors.fillTonal }]} />
          <View style={styles.skeletonLines}>
            <View style={[styles.lineWide, { backgroundColor: colors.fillTonal }]} />
            <View style={[styles.lineShort, { backgroundColor: colors.fillTonal }]} />
          </View>
        </View>
      ))}
    </View>
  );
}

export function HorsesError({ onRetry }: { onRetry: () => void }) {
  const { colors } = useTokens();
  return (
    <StateShell icon="info" title="Couldn't load horses" detail="Check your connection and try again.">
      <Pressable
        onPress={onRetry}
        accessibilityRole="button"
        style={({ pressed }) => [
          styles.retry,
          { backgroundColor: colors.inverse },
          pressed && { opacity: 0.85 },
        ]}>
        <Text style={[type.headline, { color: colors.onInverse }]}>Try again</Text>
      </Pressable>
    </StateShell>
  );
}

export function HorsesEmpty({
  search,
  groupName,
}: {
  search?: string;
  groupName?: string;
}) {
  if (search) {
    return (
      <StateShell
        icon="search"
        title={`No horses match “${search}”`}
        detail="Try another name or clear the search."
      />
    );
  }
  if (groupName) {
    return (
      <StateShell
        icon="group"
        title={`No horses in ${groupName}`}
        detail="Choose another group to see its horses."
      />
    );
  }
  return (
    <StateShell
      icon="horse"
      title="No horses yet"
      detail="Adding horses will be available when the write side is ready."
    />
  );
}

function StateShell({
  icon,
  title,
  detail,
  children,
}: {
  icon: 'info' | 'search' | 'group' | 'horse';
  title: string;
  detail: string;
  children?: React.ReactNode;
}) {
  const { colors } = useTokens();
  return (
    <View style={styles.state}>
      <View style={[styles.stateIcon, { backgroundColor: colors.fillTonal }]}>
        <Icon name={icon} size={26} color={colors.accent} />
      </View>
      <Text style={[type.title3, { color: colors.foreground }]}>{title}</Text>
      <Text style={[type.subhead, styles.detail, { color: colors.secondary }]}>{detail}</Text>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  loading: { gap: space.md, paddingHorizontal: space.edge, paddingTop: space.md },
  skeleton: {
    height: CARD_HEIGHT,
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    padding: space.sm,
    borderRadius: radius.md,
    borderCurve: 'continuous',
  },
  skeletonImage: { width: 120, height: 90, borderRadius: radius.sm },
  skeletonLines: { flex: 1, gap: space.sm },
  lineWide: { height: 18, width: '66%', borderRadius: radius.xs },
  lineShort: { height: 14, width: '42%', borderRadius: radius.xs },
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
  detail: { textAlign: 'center', maxWidth: 300 },
  retry: {
    minHeight: 44,
    marginTop: space.sm,
    paddingHorizontal: space.card,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
