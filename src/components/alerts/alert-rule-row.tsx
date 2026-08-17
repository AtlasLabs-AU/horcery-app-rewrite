import { Pressable, StyleSheet, Text, View } from 'react-native';

import { DriftBadge } from '@/components/alerts/drift-badge';
import { ScopeTag } from '@/components/alerts/scope-tag';
import { Icon } from '@/components/ui/icon';
import { radius, space, type } from '@/constants/tokens';
import type { AlertRuleView } from '@/domain/alerts/view';
import { useTokens } from '@/hooks/use-tokens';

/**
 * One alert rule on Manage Alerts: bare type icon · type name · the
 * plain-English sentence · two scope tags · a drift badge when the stored
 * window has moved.
 *
 * ONE pressable, and its accessibility label IS the sentence plus the tags —
 * the shipping app labels every row "Alert item" and nests a second button
 * (Horcery_Manage_Alerts_Review.md §3.4). Without `onPress` (A2 read-only,
 * and viewer roles) it is plain content, not a button that does nothing.
 */
export function AlertRuleRow({
  view,
  onPress,
  testID,
}: {
  view: AlertRuleView;
  onPress?: () => void;
  testID?: string;
}) {
  const { colors } = useTokens();
  const applyIcon = view.form.scope.target === 'stalls' ? 'inStall' : 'horse';
  const label = [
    view.typeName,
    view.sentence,
    `${view.applyTag}, ${view.notifyTag}`,
    view.drift ? 'Window has shifted since it was saved' : null,
    view.pushOff ? 'Notifications are off for this alert' : null,
  ]
    .filter(Boolean)
    .join('. ');

  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      accessibilityRole={onPress ? 'button' : undefined}
      accessibilityLabel={label}
      testID={testID ?? `alert-rule-${view.id}`}
      style={({ pressed }) => [
        styles.row,
        { backgroundColor: colors.card },
        pressed && onPress && { opacity: 0.9 },
      ]}>
      <View style={styles.iconSlot}>
        <Icon name={view.icon} size={22} color={colors.foreground} />
      </View>
      <View style={styles.body}>
        <View style={styles.titleLine}>
          <Text style={[type.headline, styles.title, { color: colors.foreground }]} numberOfLines={1}>
            {view.typeName}
          </Text>
          {view.pushOff ? <Icon name="notificationsOff" size={14} color={colors.tertiary} /> : null}
        </View>
        <Text style={[type.subhead, { color: colors.secondary }]}>{view.sentence}</Text>
        <View style={styles.tags}>
          <ScopeTag icon={applyIcon} label={view.applyTag} testID={`${view.id}-apply`} />
          <ScopeTag icon="alerts" label={view.notifyTag} testID={`${view.id}-notify`} />
        </View>
        {view.drift ? <DriftBadge drift={view.drift} testID={`${view.id}-drift`} /> : null}
        {view.isGeneric ? (
          <Text style={[type.caption, { color: colors.tertiary }]}>
            New alert type — showing basic details.
          </Text>
        ) : null}
      </View>
      {onPress ? <Icon name="chevronRight" size={13} color={colors.dimmed} /> : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: space.md,
    padding: space.md,
    borderRadius: radius.md,
    borderCurve: 'continuous',
  },
  iconSlot: { width: 28, alignItems: 'center', paddingTop: 2 },
  body: { flex: 1, gap: space.xs },
  titleLine: { flexDirection: 'row', alignItems: 'center', gap: space.xs },
  title: { flexShrink: 1 },
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: space.xs, marginTop: space.xxs },
});
