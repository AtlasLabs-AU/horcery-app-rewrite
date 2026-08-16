import { Image } from 'expo-image';
import { Stack, useLocalSearchParams } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { Icon } from '@/components/ui/icon';
import { radius, space, type } from '@/constants/tokens';
import { useTokens } from '@/hooks/use-tokens';
import { horseSelectionKey, type HorseRow } from '@/hooks/horses-data';

function value(param: string | string[] | undefined, fallback = '') {
  return Array.isArray(param) ? (param[0] ?? fallback) : (param ?? fallback);
}

export default function HorseDetailSeed() {
  const params = useLocalSearchParams<{ id: string }>();
  const queryClient = useQueryClient();
  const { colors } = useTokens();
  const id = value(params.id);
  const horse = queryClient.getQueryData<HorseRow>(horseSelectionKey(id));
  const name = horse?.name ?? 'Horse';
  const stallName = horse?.stallName ?? 'No stall';
  const hasImage = !!horse?.imageUri || !!horse?.blurhash;

  return (
    <ScrollView
      style={{ backgroundColor: colors.background }}
      contentContainerStyle={styles.content}
      contentInsetAdjustmentBehavior="automatic">
      <Stack.Screen options={{ title: name, headerLargeTitle: false }} />
      <View style={[styles.image, { backgroundColor: colors.fillTonal }]}>
        {hasImage ? (
          <Image
            source={horse?.imageUri || undefined}
            placeholder={horse?.blurhash ? { blurhash: horse.blurhash } : undefined}
            style={StyleSheet.absoluteFill}
            contentFit="cover"
            accessible
            accessibilityLabel={`${name} thumbnail`}
          />
        ) : (
          <Icon name="horse" size={42} color={colors.accent} />
        )}
      </View>
      {id.startsWith('sample-') ? (
        <Text style={[type.footnote, styles.sample, { color: colors.accent }]}>Sample horse</Text>
      ) : null}
      <Text style={[type.largeTitle, { color: colors.foreground }]}>{name}</Text>
      <Text style={[type.headline, { color: colors.secondary }]}>{stallName}</Text>
      <View style={[styles.note, { backgroundColor: colors.card }]}>
        <Text style={[type.headline, { color: colors.foreground }]}>Horse details are next</Text>
        <Text style={[type.subhead, { color: colors.secondary }]}>
          This read-only seed preserves card navigation without pretending edit, group, or removal flows are ready.
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: space.edge, paddingBottom: space.xxl },
  image: {
    width: '100%',
    aspectRatio: 4 / 3,
    marginBottom: space.lg,
    borderRadius: radius.lg,
    borderCurve: 'continuous',
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sample: { marginBottom: space.xs, fontWeight: '600' },
  note: {
    marginTop: space.lg,
    gap: space.sm,
    padding: space.card,
    borderRadius: radius.md,
    borderCurve: 'continuous',
  },
});
