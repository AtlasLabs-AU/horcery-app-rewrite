import { Pressable, StyleSheet, Text, View } from 'react-native';

import { SectionCard, SectionHeader } from '@/components/for-you/card';
import { LinkButton } from '@/components/for-you/link-button';
import { Icon } from '@/components/ui/icon';
import { useTokens } from '@/hooks/use-tokens';
import { radius, space, type } from '@/constants/tokens';

/**
 * Review section. On the QA organization this shows its empty state, which is
 * exactly what we need for parity — an empty state is a first-class layout.
 */
export function ReviewCard({
  onFilter,
  onSeeHistory,
  children,
}: {
  onFilter?: () => void;
  onSeeHistory?: () => void;
  /** Review cards when there are any; the empty state renders otherwise. */
  children?: React.ReactNode;
}) {
  const { colors } = useTokens();
  return (
    <SectionCard testID="for-you-review-card">
      <SectionHeader
        title="Review"
        adornment={
          onFilter ? (
            <Pressable
              onPress={onFilter}
              hitSlop={12}
              accessibilityRole="button"
              accessibilityLabel="Filter behaviors">
              <Icon name="filter" size={18} color={colors.accent} />
            </Pressable>
          ) : undefined
        }
        action={
          onSeeHistory ? (
            <LinkButton label="See History" onPress={onSeeHistory} testID="for-you-review-history" />
          ) : undefined
        }
      />
      {children ?? <ReviewEmptyState />}
    </SectionCard>
  );
}

function ReviewEmptyState() {
  const { colors } = useTokens();
  return (
    <View style={[styles.info, { backgroundColor: colors.bed }]} testID="for-you-review-empty">
      <Icon name="info" size={18} color={colors.accent} />
      <Text style={[type.subhead, styles.infoText, { color: colors.secondary }]}>
        Your Stall Monitor will feature recent events that may be of interest to
        you here.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  info: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: space.sm,
    borderRadius: radius.sm,
    borderCurve: 'continuous',
    padding: space.edge,
    marginTop: space.edge,
  },
  infoText: {
    flex: 1,
    lineHeight: 21,
  },
});
