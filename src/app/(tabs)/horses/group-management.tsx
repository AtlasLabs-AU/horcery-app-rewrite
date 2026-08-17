import { Stack, router } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text } from 'react-native';

import { WriteSafeNotice } from '@/components/horses/write-safe-notice';
import { radius, space, type } from '@/constants/tokens';
import { useHorseGroups } from '@/hooks/use-horse-groups';
import { useToast } from '@/components/ui/toast';
import { useTokens } from '@/hooks/use-tokens';

export default function GroupManagementScreen() {
  const { colors } = useTokens();
  const { showToast } = useToast();
  const groups = useHorseGroups();
  return (
    <ScrollView style={{ backgroundColor: colors.background }} contentContainerStyle={styles.content} contentInsetAdjustmentBehavior="automatic">
      <Stack.Screen options={{ title: 'Edit Groups', headerLargeTitle: false }} />
      <WriteSafeNotice />
      {groups.groups.map((group) => <Pressable key={group.id} onPress={() => showToast(`${group.name} is ready to rename.`)} accessibilityRole="button" accessibilityLabel={`Edit ${group.name}`} style={[styles.row, { backgroundColor: colors.card, borderColor: colors.divider }]}><Text style={[type.headline, { color: colors.foreground }]}>{group.name}</Text><Text style={[type.subhead, { color: colors.secondary }]}>Edit</Text></Pressable>)}
      <Pressable onPress={() => router.push('/horses/group-form')} accessibilityRole="button" accessibilityLabel="New group" style={[styles.primary, { backgroundColor: colors.inverse }]}><Text style={[type.headline, { color: colors.onInverse }]}>New Group</Text></Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({ content: { padding: space.edge, paddingBottom: space.xxl, gap: space.md }, row: { minHeight: 52, borderWidth: 1, borderRadius: radius.sm, paddingHorizontal: space.md, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }, primary: { minHeight: 48, borderRadius: radius.full, alignItems: 'center', justifyContent: 'center', marginTop: space.sm } });
