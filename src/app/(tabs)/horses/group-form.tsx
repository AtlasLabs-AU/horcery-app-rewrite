import { Stack, router } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput } from 'react-native';

import { WriteSafeNotice } from '@/components/horses/write-safe-notice';
import { radius, space, type } from '@/constants/tokens';
import { useToast } from '@/components/ui/toast';
import { useTokens } from '@/hooks/use-tokens';

export default function GroupFormScreen() {
  const { colors } = useTokens();
  const { showToast } = useToast();
  const [name, setName] = useState('');
  return (
    <ScrollView style={{ backgroundColor: colors.background }} contentContainerStyle={styles.content} contentInsetAdjustmentBehavior="automatic">
      <Stack.Screen options={{ title: 'New Group', headerLargeTitle: false }} />
      <WriteSafeNotice />
      <Text style={[type.subhead, { color: colors.secondary }]}>Group name</Text>
      <TextInput value={name} onChangeText={setName} placeholder="e.g. Mares" placeholderTextColor={colors.dimmed} accessibilityLabel="Group name" style={[styles.input, { color: colors.foreground, backgroundColor: colors.card, borderColor: colors.divider }]} />
      <Pressable disabled={!name.trim()} onPress={() => { showToast('Group draft is ready for review.'); router.back(); }} accessibilityRole="button" accessibilityLabel="Review new group" style={[styles.primary, { backgroundColor: name.trim() ? colors.inverse : colors.bed }]}>
        <Text style={[type.headline, { color: name.trim() ? colors.onInverse : colors.dimmed }]}>Review Group</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({ content: { padding: space.edge, paddingBottom: space.xxl, gap: space.md }, input: { minHeight: 48, borderWidth: 1, borderRadius: radius.sm, paddingHorizontal: space.md, fontSize: 17 }, primary: { minHeight: 48, borderRadius: radius.full, alignItems: 'center', justifyContent: 'center' } });
