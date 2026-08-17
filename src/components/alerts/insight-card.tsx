import { StyleSheet, Text, View } from 'react-native';

import { ScopeTag } from '@/components/alerts/scope-tag';
import { Icon } from '@/components/ui/icon';
import type { IconName } from '@/components/ui/icon-names';
import { radius, space, type } from '@/constants/tokens';
import { useTokens } from '@/hooks/use-tokens';

/**
 * The card at the top of Configure: type name and the LIVE sentence, updated
 * on every change, with the two scope tags. The single best UX idea in the
 * shipping app, kept (Horcery_Manage_Alerts_Review.md §2).
 */
export function InsightCard({
  icon,
  typeName,
  sentence,
  applyTag,
  notifyTag,
  applyIcon,
}: {
  icon: IconName;
  typeName: string;
  sentence: string;
  applyTag: string;
  notifyTag: string;
  applyIcon: IconName;
}) {
  const { colors } = useTokens();
  return (
    <View
      style={[styles.card, { backgroundColor: colors.card }]}
      accessibilityLabel={`${typeName}. ${sentence}. ${applyTag}, ${notifyTag}`}
      testID="alert-insight">
      <View style={styles.titleRow}>
        <Icon name={icon} size={22} color={colors.foreground} />
        <Text style={[type.headline, { color: colors.foreground }]}>{typeName}</Text>
      </View>
      <Text style={[type.body, { color: colors.foreground }]} testID="alert-insight-sentence">
        {sentence}
      </Text>
      <View style={styles.tags}>
        <ScopeTag icon={applyIcon} label={applyTag} />
        <ScopeTag icon="alerts" label={notifyTag} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: space.card,
    borderRadius: radius.md,
    borderCurve: 'continuous',
    gap: space.sm,
  },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: space.xs, marginTop: space.xxs },
});
