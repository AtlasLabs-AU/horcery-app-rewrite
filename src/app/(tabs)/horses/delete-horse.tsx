import { Stack, router, useLocalSearchParams } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { WriteSafeNotice } from '@/components/horses/write-safe-notice';
import { radius, space, type } from '@/constants/tokens';
import { useToast } from '@/components/ui/toast';
import { useTokens } from '@/hooks/use-tokens';

export default function DeleteHorseScreen() {
  const { colors } = useTokens();
  const { showToast } = useToast();
  const { name } = useLocalSearchParams<{ name?: string }>();
  return (
    <View style={[styles.content, { backgroundColor: colors.background }]}>
      <Stack.Screen options={{ title: 'Remove Horse', headerLargeTitle: false }} />
      <Text style={[type.title3, { color: colors.foreground }]}>Remove {name ?? 'this horse'}?</Text>
      <Text style={[type.body, { color: colors.secondary }]}>This removes the horse from the organisation. Review the action carefully before it is enabled.</Text>
      <WriteSafeNotice />
      <Pressable onPress={() => { showToast('Removal is not enabled in the rewrite yet.'); router.back(); }} accessibilityRole="button" accessibilityLabel="Confirm horse removal" style={[styles.destructive, { backgroundColor: colors.statusAlert }]}><Text style={[type.headline, { color: colors.onMedia }]}>Confirm Removal</Text></Pressable>
      <Pressable onPress={() => router.back()} accessibilityRole="button" accessibilityLabel="Cancel removal" style={[styles.cancel, { borderColor: colors.divider }]}><Text style={[type.headline, { color: colors.foreground }]}>Cancel</Text></Pressable>
    </View>
  );
}

const styles = StyleSheet.create({ content: { flex: 1, padding: space.edge, gap: space.md, justifyContent: 'center' }, destructive: { minHeight: 48, borderRadius: radius.full, alignItems: 'center', justifyContent: 'center', marginTop: space.md }, cancel: { minHeight: 48, borderRadius: radius.full, borderWidth: 1, alignItems: 'center', justifyContent: 'center' } });
