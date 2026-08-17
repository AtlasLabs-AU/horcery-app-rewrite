import { Stack, router, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text } from 'react-native';

import { WriteSafeNotice } from '@/components/horses/write-safe-notice';
import { radius, space, type } from '@/constants/tokens';
import { useHorseGroups } from '@/hooks/use-horse-groups';
import { useToast } from '@/components/ui/toast';
import { useTokens } from '@/hooks/use-tokens';

export default function HorseGroupsScreen() {
  const { colors } = useTokens();
  const { showToast } = useToast();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const groupsQuery = useHorseGroups();
  const [selected, setSelected] = useState<string[]>([]);
  const groups = useMemo(() => groupsQuery.groups, [groupsQuery.groups]);
  return (
    <ScrollView style={{ backgroundColor: colors.background }} contentContainerStyle={styles.content} contentInsetAdjustmentBehavior="automatic">
      <Stack.Screen options={{ title: 'Manage Groups', headerLargeTitle: false }} />
      <WriteSafeNotice />
      <Text style={[type.body, { color: colors.foreground }]}>Choose groups for this horse.</Text>
      {groups.map((group) => {
        const isSelected = selected.includes(group.id);
        return <Pressable key={group.id} onPress={() => setSelected((current) => isSelected ? current.filter((value) => value !== group.id) : [...current, group.id])} accessibilityRole="checkbox" accessibilityState={{ checked: isSelected }} style={[styles.row, { backgroundColor: colors.card, borderColor: colors.divider }]}><Text style={[type.headline, { color: colors.foreground }]}>{group.name}</Text><Text style={[type.headline, { color: colors.accent }]}>{isSelected ? '✓' : ''}</Text></Pressable>;
      })}
      {!groupsQuery.isLoading && groups.length === 0 ? <Text style={[type.subhead, { color: colors.secondary }]}>No groups exist yet.</Text> : null}
      <Pressable onPress={() => { showToast(`Group changes for ${id ? 'this horse' : 'the selected horse'} are ready for review.`); router.back(); }} accessibilityRole="button" accessibilityLabel="Review group changes" style={[styles.primary, { backgroundColor: colors.inverse }]}><Text style={[type.headline, { color: colors.onInverse }]}>Review Changes</Text></Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({ content: { padding: space.edge, paddingBottom: space.xxl, gap: space.md }, row: { minHeight: 52, borderWidth: 1, borderRadius: radius.sm, paddingHorizontal: space.md, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }, primary: { minHeight: 48, borderRadius: radius.full, alignItems: 'center', justifyContent: 'center', marginTop: space.sm } });
