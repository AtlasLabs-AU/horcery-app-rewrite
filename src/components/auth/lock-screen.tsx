import { Image } from 'expo-image';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Icon } from '@/components/ui/icon';
import { useTokens } from '@/hooks/use-tokens';
import { radius, space, type } from '@/constants/tokens';

/**
 * Face ID gate shown over an existing session on app open.
 *
 * FRONT-END PREVIEW ONLY (Inakshi, 2026-08-14): tapping the button unlocks
 * unconditionally — real biometrics need `expo-local-authentication` and a
 * settings toggle in My Account. Gated by PREVIEWS.faceIdUnlock, which is
 * compiled out of release builds (src/config/previews.ts).
 */

export function LockScreen({ onUnlock }: { onUnlock: () => void }) {
  const { colors } = useTokens();

  return (
    <View style={[styles.page, { backgroundColor: colors.background }]}>
      <SafeAreaView style={styles.page}>
        <View style={styles.content}>
          <Image
            source={require('@/assets/images/horcery-logo-large.svg')}
            style={styles.logo}
            contentFit="contain"
            accessibilityLabel="Horcery logo"
          />
          <View style={styles.unlockGroup}>
            <Pressable
              onPress={onUnlock}
              accessibilityRole="button"
              accessibilityLabel="Unlock with Face ID"
              testID="lock-screen-unlock"
              style={({ pressed }) => [
                styles.faceButton,
                { backgroundColor: colors.fillTonal },
                pressed && styles.pressed,
              ]}>
              <Icon name="faceId" size={44} color={colors.accent} />
            </Pressable>
            <Text style={[type.headline, { color: colors.foreground }]}>
              Unlock with Face ID
            </Text>
            <Text style={[type.footnote, { color: colors.tertiary }]}>
              Your session is protected on this phone.
            </Text>
          </View>
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  page: {
    flex: 1,
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: space.xxl,
    padding: space.edge,
  },
  logo: {
    width: 150,
    height: 136,
  },
  unlockGroup: {
    alignItems: 'center',
    gap: space.md,
  },
  faceButton: {
    width: 92,
    height: 92,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: space.sm,
  },
  pressed: {
    opacity: 0.7,
  },
});
