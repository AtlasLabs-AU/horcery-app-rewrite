import { router, Stack } from 'expo-router';
import { useMemo } from 'react';
import { Pressable, SectionList, StyleSheet, Text, View } from 'react-native';

import { useAlertsPermissions } from '@/components/alerts/alerts-permissions';
import { ErrorState, ListSkeleton, StateShell } from '@/components/app/page-states';
import { Icon } from '@/components/ui/icon';
import { radius, space, type } from '@/constants/tokens';
import { CATEGORY_LABEL } from '@/domain/alerts/descriptors';
import type { AlertTypeDescriptor, DescriptorCategory } from '@/domain/alerts/types';
import { useAlertTypes } from '@/hooks/alerts/use-alert-types';
import { useTokens } from '@/hooks/use-tokens';

const ORDER: DescriptorCategory[] = ['behavioural', 'presence', 'environmental', 'general'];

/**
 * Step 1 of creating an alert: choose the type. Grouped by category, ONE
 * tap opens Configure — not the shipping app's "select, then Next".
 * Read-only roles never reach this (the list hides "+"); if they arrive by
 * deep link they see why they cannot proceed.
 */
export default function ChooseAlertTypeScreen() {
  const { colors } = useTokens();
  const permissions = useAlertsPermissions();
  const types = useAlertTypes();

  const sections = useMemo(
    () =>
      ORDER.map((category) => ({
        title: CATEGORY_LABEL[category],
        data: types.descriptors.filter((d) => d.category === category),
      })).filter((s) => s.data.length > 0),
    [types.descriptors],
  );

  const open = (d: AlertTypeDescriptor) =>
    router.push({ pathname: '/alerts/configure', params: { typeId: d.id } });

  return (
    <>
      <Stack.Screen options={{ title: 'New alert', headerLargeTitle: false }} />
      {!permissions.create ? (
        <View style={[styles.page, { backgroundColor: colors.background }]}>
          <StateShell icon="info" title="You can view alerts" detail={permissions.reason} testID="new-alert-read-only" />
        </View>
      ) : (
        <SectionList
          style={[styles.page, { backgroundColor: colors.background }]}
          contentInsetAdjustmentBehavior="automatic"
          sections={sections}
          keyExtractor={(d) => d.id}
          contentContainerStyle={styles.content}
          stickySectionHeadersEnabled={false}
          renderSectionHeader={({ section }) => (
            <Text style={[type.footnote, styles.sectionTitle, { color: colors.secondary }]}>{section.title}</Text>
          )}
          renderItem={({ item }) => (
            <Pressable
              onPress={() => open(item)}
              accessibilityRole="button"
              accessibilityLabel={item.name}
              testID={`alert-type-${item.slug}`}
              style={({ pressed }) => [styles.row, { backgroundColor: colors.card }, pressed && { opacity: 0.9 }]}>
              <Icon name={item.icon} size={22} color={colors.foreground} />
              <Text style={[type.body, styles.rowText, { color: colors.foreground }]}>{item.name}</Text>
              <Icon name="chevronRight" size={13} color={colors.dimmed} />
            </Pressable>
          )}
          ItemSeparatorComponent={() => <View style={{ height: space.sm }} />}
          SectionSeparatorComponent={() => <View style={{ height: space.md }} />}
          ListEmptyComponent={
            types.isLoading ? (
              <ListSkeleton rows={5} rowHeight={56} testID="alert-types-loading" />
            ) : types.isError ? (
              <ErrorState title="Couldn’t load alert types" onRetry={() => void types.refetch()} />
            ) : (
              <StateShell icon="info" title="No alert types available" detail="The server returned none." />
            )
          }
        />
      )}
    </>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1 },
  content: { paddingHorizontal: space.edge, paddingTop: space.md, paddingBottom: space.xxl },
  sectionTitle: { textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: space.sm },
  row: {
    minHeight: 56,
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    paddingHorizontal: space.card,
    borderRadius: radius.md,
    borderCurve: 'continuous',
  },
  rowText: { flex: 1 },
});
