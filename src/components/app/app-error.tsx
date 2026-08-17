import { Link } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Icon } from '@/components/ui/icon';
import { radius, space, type } from '@/constants/tokens';
import { useTokens } from '@/hooks/use-tokens';

export function AppError({ error, retry }: { error?: Error; retry: () => void }) {
  const { colors } = useTokens();
  const name = error?.name ?? 'Error';
  const message = error?.message ?? 'Something unexpected happened. Please try again.';

  return (
    <View style={[styles.shell, { backgroundColor: colors.background }]}>
      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.divider }]}>
        <Icon name="info" size={24} color={colors.accent} />
        <Text style={[type.title, { color: colors.foreground }]}>Something broke</Text>
        <Text style={[type.subhead, styles.detail, { color: colors.secondary }]}>{name}</Text>
        <Text style={[type.body, styles.message, { color: colors.tertiary }]} numberOfLines={3} selectable>
          {message}
        </Text>
        <Pressable
          onPress={retry}
          accessibilityRole="button"
          accessibilityLabel="Try again"
          style={({ pressed }) => [styles.button, { backgroundColor: colors.inverse }, pressed && styles.pressed]}>
          <Text style={[type.headline, { color: colors.onInverse }]}>Try again</Text>
        </Pressable>
        <Link href="/" asChild>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Go back home"
            style={({ pressed }) => [styles.secondary, { borderColor: colors.divider }, pressed && styles.pressed]}>
            <Text style={[type.headline, { color: colors.foreground }]}>Go home</Text>
          </Pressable>
        </Link>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  shell: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: space.lg },
  card: { width: '100%', alignItems: 'center', gap: space.sm, padding: space.lg, borderWidth: 1, borderRadius: radius.md, borderCurve: 'continuous' },
  detail: { textAlign: 'center' },
  message: { textAlign: 'center', maxWidth: 420 },
  button: { width: '100%', minHeight: 44, marginTop: space.md, borderRadius: radius.full, alignItems: 'center', justifyContent: 'center', paddingHorizontal: space.card },
  secondary: { width: '100%', minHeight: 44, marginTop: space.sm, borderRadius: radius.full, borderWidth: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: space.card },
  pressed: { opacity: 0.85 },
});
