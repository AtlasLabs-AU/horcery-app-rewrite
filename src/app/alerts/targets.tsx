import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';

import { ErrorState, ListSkeleton, StateShell } from '@/components/app/page-states';
import { Icon } from '@/components/ui/icon';
import { SegmentedControl } from '@/components/ui/segmented-control';
import type { SegmentedOption } from '@/components/ui/segmented-control-types';
import { radius, space, type } from '@/constants/tokens';
import type { Selection } from '@/domain/alerts/types';
import { setTargetsResult, type TargetKind } from '@/hooks/alerts/targets-selection-store';
import { useTargets, type TargetRow } from '@/hooks/alerts/use-targets';
import { useTokens } from '@/hooks/use-tokens';

type Mode = Selection['mode'];

const MODES: SegmentedOption<Mode>[] = [
  { label: 'All', value: 'all' },
  { label: 'Selected', value: 'include' },
  { label: 'Excluded', value: 'exclude' },
];

const KIND_LABEL: Record<TargetKind, { title: string; singular: string; plural: string; empty: string }> = {
  horses: { title: 'Apply to horses', singular: 'horse', plural: 'horses', empty: 'No horses yet' },
  stalls: { title: 'Apply to stalls', singular: 'stall', plural: 'stalls', empty: 'No stalls yet' },
  members: { title: 'Send alert to', singular: 'person', plural: 'people', empty: 'No members yet' },
};

function param(value: string | string[] | undefined): string {
  return Array.isArray(value) ? (value[0] ?? '') : (value ?? '');
}

/**
 * The targets picker — a FORM-SHEET ROUTE (not a bottom-sheet component)
 * because it needs the native header search bar. Returns its result through
 * `targets-selection-store` under the caller's request id (architecture §6.5).
 *
 * All / Selected / Excluded on a native segmented control; the list only
 * matters for the last two. Search filters by name and subtitle. Every page of
 * the source is loaded (`listComplete`), so nothing is silently missing.
 */
export default function TargetsPickerScreen() {
  const { colors } = useTokens();
  const { width } = useWindowDimensions();
  const params = useLocalSearchParams<{ kind?: string; requestId?: string; mode?: string; ids?: string }>();
  const kind = (param(params.kind) || 'stalls') as TargetKind;
  const requestId = param(params.requestId);
  const initialMode = (param(params.mode) || 'all') as Mode;
  const initialIds = param(params.ids).split(',').filter(Boolean);
  const labels = KIND_LABEL[kind];

  const [mode, setMode] = useState<Mode>(initialMode);
  const [selected, setSelected] = useState<Set<string>>(() => new Set(initialIds));
  const [query, setQuery] = useState('');

  const targets = useTargets(kind);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return targets.rows;
    return targets.rows.filter(
      (r) => r.name.toLowerCase().includes(q) || (r.subtitle ?? '').toLowerCase().includes(q),
    );
  }, [targets.rows, query]);

  const toggle = useCallback((id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const done = useCallback(() => {
    const selection: Selection = mode === 'all' ? { mode: 'all' } : { mode, ids: [...selected] };
    if (requestId) setTargetsResult(requestId, { kind, selection });
    router.back();
  }, [mode, selected, requestId, kind]);

  const count = selected.size;
  const summary =
    mode === 'all'
      ? `Every ${labels.singular}`
      : `${count} ${count === 1 ? labels.singular : labels.plural} ${mode === 'include' ? 'selected' : 'excluded'}`;

  const renderRow = ({ item }: { item: TargetRow }) => {
    const isOn = selected.has(item.id);
    return (
      <Pressable
        onPress={() => toggle(item.id)}
        disabled={mode === 'all'}
        accessibilityRole="checkbox"
        accessibilityState={{ checked: isOn, disabled: mode === 'all' }}
        accessibilityLabel={item.subtitle ? `${item.name}, ${item.subtitle}` : item.name}
        testID={`target-${item.id}`}
        style={({ pressed }) => [
          styles.row,
          { backgroundColor: colors.card },
          pressed && mode !== 'all' && { opacity: 0.9 },
          mode === 'all' && { opacity: 0.5 },
        ]}>
        <View style={styles.rowText}>
          <Text style={[type.body, { color: colors.foreground }]} numberOfLines={1}>
            {item.name}
          </Text>
          {item.subtitle ? (
            <Text style={[type.footnote, { color: colors.secondary }]} numberOfLines={1}>
              {item.subtitle}
            </Text>
          ) : null}
        </View>
        <Icon name={isOn ? 'checkFilled' : 'circleEmpty'} size={22} color={isOn ? colors.accent : colors.dimmed} />
      </Pressable>
    );
  };

  return (
    <>
      <Stack.Screen
        options={{
          title: labels.title,
          headerLargeTitle: false,
          headerSearchBarOptions: {
            placeholder: `Search ${labels.plural}`,
            autoCapitalize: 'none',
            hideWhenScrolling: false,
            onChangeText: (e) => setQuery(e.nativeEvent.text),
            onCancelButtonPress: () => setQuery(''),
          },
          headerRight: () => (
            <Pressable onPress={done} hitSlop={12} accessibilityRole="button" accessibilityLabel="Done" testID="targets-done">
              <Text style={[type.headline, { color: colors.accent }]}>Done</Text>
            </Pressable>
          ),
        }}
      />
      <FlatList
        style={[styles.page, { backgroundColor: colors.background }]}
        contentInsetAdjustmentBehavior="automatic"
        data={mode === 'all' ? [] : filtered}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={
          <View style={styles.header}>
            <SegmentedControl<Mode>
              options={MODES}
              value={mode}
              onChange={setMode}
              width={Math.max(width - space.edge * 2, 260)}
              accessibilityLabel="Who this applies to"
              testID="targets-mode"
            />
            <Text style={[type.footnote, styles.summary, { color: colors.secondary }]} testID="targets-summary">
              {summary}
            </Text>
          </View>
        }
        renderItem={renderRow}
        ItemSeparatorComponent={() => <View style={{ height: space.sm }} />}
        ListEmptyComponent={
          mode === 'all' ? null : targets.isLoading ? (
            <ListSkeleton rows={4} rowHeight={56} testID="targets-loading" />
          ) : targets.isError ? (
            <ErrorState title={`Couldn’t load ${labels.plural}`} onRetry={() => void targets.refetch()} />
          ) : query ? (
            <StateShell icon="search" title={`No ${labels.plural} match “${query}”`} detail="Try another name." />
          ) : (
            <StateShell icon="info" title={labels.empty} detail="" />
          )
        }
      />
    </>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1 },
  listContent: { paddingHorizontal: space.edge, paddingBottom: space.xxl },
  header: { paddingTop: space.md, paddingBottom: space.md, gap: space.sm, alignItems: 'center' },
  summary: { alignSelf: 'flex-start' },
  row: {
    minHeight: 56,
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    paddingHorizontal: space.md,
    borderRadius: radius.sm,
    borderCurve: 'continuous',
  },
  rowText: { flex: 1, gap: 2 },
});
