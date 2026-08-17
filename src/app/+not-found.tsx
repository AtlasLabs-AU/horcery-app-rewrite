import { Link } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Icon } from '@/components/ui/icon';
import { radius, space, type } from '@/constants/tokens';
import { useTokens } from '@/hooks/use-tokens';

export default function NotFoundScreen() {
  const { colors } = useTokens();
  return (
    <View style={[styles.shell, { backgroundColor: colors.background }]}>
      <Icon name="search" size={28} color={colors.accent} />
      <Text style={[type.title, { color: colors.foreground }]}>Page not found</Text>
      <Text style={[type.body, styles.detail, { color: colors.secondary }]}>This page is no longer available.</Text>
      <Link href="/" asChild>
        <Pressable style={[styles.button, { backgroundColor: colors.inverse }]} accessibilityRole="button" accessibilityLabel="Go home">
          <Text style={[type.headline, { color: colors.onInverse }]}>Go home</Text>
        </Pressable>
      </Link>
    </View>
  );
}

const styles = StyleSheet.create({
  shell: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: space.sm, paddingHorizontal: space.lg },
  detail: { textAlign: 'center' },
  button: { minHeight: 44, marginTop: space.md, paddingHorizontal: space.card, borderRadius: radius.full, alignItems: 'center', justifyContent: 'center' },
});
