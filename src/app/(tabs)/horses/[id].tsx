import { Image } from 'expo-image';
import { Stack, useLocalSearchParams } from 'expo-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { DateTime } from 'luxon';
import { useMemo } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { HorsesError, HorsesLoading } from '@/components/horses/horses-states';
import { Icon } from '@/components/ui/icon';
import { radius, space, type } from '@/constants/tokens';
import { queries } from '@/services';
import { useAuthStore } from '@acme/stores/authorization-states';
import { useTokens } from '@/hooks/use-tokens';
import { horseSelectionKey, joinHorseRow, type HorseRow } from '@/hooks/horses-data';

function value(param: string | string[] | undefined, fallback = '') {
  return Array.isArray(param) ? (param[0] ?? fallback) : (param ?? fallback);
}

export default function HorseDetailSeed() {
  const params = useLocalSearchParams<{ id: string }>();
  const queryClient = useQueryClient();
  const organizationID = useAuthStore((state) => state.organizationID);
  const { colors } = useTokens();
  const id = value(params.id);
  const isSampleHorse = id.startsWith('sample-');

  const horseQuery = useQuery({
    ...queries.animal.detail(id, {
      deleted_at__isnull: true,
      organization_id: organizationID ?? '',
    }),
    enabled: !!id && !isSampleHorse && !!organizationID,
    select: (response) => response.data,
  });

  const horse = useMemo(() => {
    // Read inside the memo, not during render: the compiler cannot prove a
    // value pulled out of the query cache will not be mutated afterwards, so
    // hoisting it out costs the whole component its memoization.
    const cached = queryClient.getQueryData<HorseRow>(horseSelectionKey(id));
    if (cached) return cached;
    if (!horseQuery.data) return null;

    const epoch =
      Math.floor(
        DateTime.now().minus({ minutes: 5 }).toSeconds() / 300,
      ) * 300;

    return joinHorseRow(horseQuery.data, horseQuery.data.stall, epoch);
  }, [queryClient, id, horseQuery.data]);

  if (!horse && horseQuery.isLoading) {
    return (
      <ScrollView
        style={{ backgroundColor: colors.background }}
        contentContainerStyle={styles.content}
        contentInsetAdjustmentBehavior="automatic">
        <Stack.Screen options={{ title: 'Horse', headerLargeTitle: false }} />
        <HorsesLoading />
      </ScrollView>
    );
  }

  if (!horse && horseQuery.isError) {
    return (
      <View style={[styles.stateShell, { backgroundColor: colors.background }]}>
        <Stack.Screen options={{ title: 'Horse', headerLargeTitle: false }} />
        <HorsesError onRetry={() => void horseQuery.refetch()} />
      </View>
    );
  }

  if (!horse) {
    return (
      <View style={[styles.stateShell, { backgroundColor: colors.background }]}>
        <Stack.Screen options={{ title: 'Horse', headerLargeTitle: false }} />
        <Text style={[type.title3, { color: colors.foreground }]}>Horse not found</Text>
      </View>
    );
  }

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
  stateShell: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: space.edge,
  },
});
