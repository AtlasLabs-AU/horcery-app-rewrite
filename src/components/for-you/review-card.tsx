import { SymbolView } from 'expo-symbols';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { SectionCard, SectionHeader } from '@/components/for-you/card';
import { LinkButton } from '@/components/for-you/link-button';
import { Brand, Fyp, Radius, Spacing } from '@/constants/theme';

/**
 * Review section. On the QA organization this shows its empty state, which is
 * exactly what we need for parity — an empty state is a first-class layout, not
 * a placeholder.
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
  return (
    <SectionCard testID="for-you-review-card">
      <SectionHeader
        title="Review"
        adornment={
          <Pressable
            onPress={onFilter}
            hitSlop={12}
            accessibilityRole="button"
            accessibilityLabel="Filter behaviors">
            <SymbolView
              name="line.3.horizontal.decrease"
              size={18}
              tintColor={Brand.primary}
            />
          </Pressable>
        }
        action={
          <LinkButton
            label="See History"
            width={110}
            onPress={onSeeHistory}
            testID="for-you-review-history"
          />
        }
      />
      {children ?? <ReviewEmptyState />}
    </SectionCard>
  );
}

function ReviewEmptyState() {
  return (
    <View style={styles.info} testID="for-you-review-empty">
      <SymbolView name="info.circle" size={18} tintColor={Brand.primary} />
      <Text style={styles.infoText}>
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
    gap: Spacing.two,
    backgroundColor: Fyp.infoBackground,
    borderColor: Fyp.infoBorder,
    borderWidth: 1,
    borderRadius: Radius.inner,
    padding: Spacing.three,
    marginTop: Spacing.three,
  },
  infoText: {
    flex: 1,
    fontSize: 15,
    lineHeight: 21,
    color: Fyp.body,
  },
});
