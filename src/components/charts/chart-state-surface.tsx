import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { useTokens } from '@/hooks/use-tokens';

/** Shared visual treatment for every chart family's honest data states. */
export function ChartStateSurface({
  stateKey,
  blocksContent,
  busy,
  message,
  children,
}: {
  stateKey: string;
  blocksContent: boolean;
  busy: boolean;
  message: string | null;
  children: React.ReactNode;
}) {
  const { colors, type, space } = useTokens();

  return (
    <>
      {blocksContent ? null : children}
      {message ? (
        <View
          testID={`chart-state-${stateKey}`}
          style={[
            styles.notice,
            {
              gap: space.sm,
              marginTop: space.md,
              paddingHorizontal: space.md,
              paddingVertical: space.sm,
              backgroundColor: colors.bed,
            },
          ]}>
          {busy ? <ActivityIndicator size="small" color={colors.secondary} /> : null}
          <Text style={[type.caption, styles.message, { color: colors.secondary }]}>
            {message}
          </Text>
        </View>
      ) : null}
    </>
  );
}

const styles = StyleSheet.create({
  notice: {
    minHeight: 36,
    borderRadius: 6,
    flexDirection: 'row',
    alignItems: 'center',
  },
  message: { flex: 1 },
});
