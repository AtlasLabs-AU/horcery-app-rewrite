import { StatusBar } from 'expo-status-bar';
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import {
  ActivityIndicator,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import {
  buildOccupancyA11yModel,
  occupancyA11yPage,
  type OccupancyA11yModel,
} from '@/charts/occupancy-a11y';
import {
  COMPACT_NO_DATA,
  COMPACT_SUMMARY,
  CONTINUOUS_NORMAL,
  MIXED_OBSERVATIONS,
  buildContinuousFixture,
  type CatalogueChart,
} from '@/charts/chart-catalogue';

import {
  DEFAULT_RENDERER_ID,
  RENDERERS,
  type EChartsProgressiveMode,
  type RendererId,
  type RenderSignal,
  type VictoryRenderMode,
} from './src/renderer';
import { CatalogueRendererHost, RendererHost } from './src/renderer-host';
import {
  advanceRemountSequence,
  startRemountSequence,
  type RemountSequence,
} from './src/remount-sequence';
import { GEOMETRY, loadScenarios, seriesLabel } from './src/scenarios';

const MEMORY_SEQUENCE_BUILD = process.env.EXPO_PUBLIC_HORCERY_MEMORY_SEQUENCE === '1';
const REMOUNT_INTERVAL_MS = 120;
const CHECKPOINT_HOLD_MS = 20_000;

/**
 * §6a chart renderer harness — People In Stall.
 *
 * One screen, three renderers behind a switch, nine fixtures behind another,
 * identical geometry. Drive it by hand or with argent; read UI-thread frame
 * times from the platform (`dumpsys gfxinfo` / Instruments), not from here —
 * the JS-FPS figure below is a rough guide only, because JS being idle says
 * nothing about the UI thread dropping frames.
 *
 * `Remount ×50` unmounts and remounts the current chart fifty times for the
 * leak/reliability check; watch memory in the platform profiler while it runs.
 */
export default function App() {
  const scenarios = useMemo(loadScenarios, []);
  const { width: windowWidth } = useWindowDimensions();
  const chartWidth = windowWidth - 32;

  const [rendererId, setRendererId] = useState<RendererId>(DEFAULT_RENDERER_ID);
  const [screenMode, setScreenMode] = useState<'timeline' | 'catalogue'>('timeline');
  const [scenarioIndex, setScenarioIndex] = useState(MEMORY_SEQUENCE_BUILD ? 1 : 0);
  const [mountKey, setMountKey] = useState(0);
  const [renderSignal, setRenderSignal] = useState<RenderSignal | null>(null);
  const [remountSequence, setRemountSequence] = useState<RemountSequence | null>(null);
  const [lodEnabled, setLodEnabled] = useState(false);
  const [progressiveMode, setProgressiveMode] = useState<EChartsProgressiveMode>('default');
  const [victoryMode, setVictoryMode] = useState<VictoryRenderMode>('relayout');
  const [parentScroll, setParentScroll] = useState(false);
  const [chartForeground, setChartForeground] = useState(true);
  // External platform traces are the deciding evidence. Keep this off during
  // release measurements so the harness does not schedule a frame forever or
  // re-render its whole screen every second.
  const jsFps = useJsFps(false);

  const scenario = scenarios[scenarioIndex]!;
  const onRenderSignal = useCallback((signal: RenderSignal) => {
    setRenderSignal({ ...signal, elapsedMs: Math.round(signal.elapsedMs) });
  }, []);

  // Harness trace — every state change lands in the Metro log so a run can be
  // reconstructed exactly. Remove nothing here: it is the audit trail.
  useEffect(() => {
    console.log(
      `[harness] screen=${screenMode} renderer=${rendererId} scenario=${scenario.name} mount=${mountKey} ` +
      `lod=${lodEnabled} progressive=${progressiveMode} victory=${victoryMode}`,
    );
  }, [rendererId, scenario.name, mountKey, lodEnabled, progressiveMode, screenMode, victoryMode]);
  useEffect(() => {
    console.log('[harness] App mounted');
    return () => console.log('[harness] App UNMOUNTED');
  }, []);

  // Remount loop for the reliability/memory check. Measurement builds pause
  // at exact same-process checkpoints so external ADB PSS reads do not have to
  // race a seven-second ECharts loop.
  useEffect(() => {
    if (remountSequence === null) return;
    if (remountSequence.phase === 'checkpoint' && remountSequence.count === 50) return;

    const delay = remountSequence.phase === 'checkpoint' ? CHECKPOINT_HOLD_MS : REMOUNT_INTERVAL_MS;
    const id = setTimeout(() => {
      const next = advanceRemountSequence(remountSequence);
      if (next.count !== remountSequence.count) {
        setRenderSignal(null);
        setMountKey((k) => k + 1);
      }
      setRemountSequence(next);
    }, delay);
    return () => clearTimeout(id);
  }, [remountSequence]);

  // The stats ticker intentionally re-renders App once a second. Keeping this
  // element referentially stable makes that instrumentation invisible to both
  // candidates rather than charging Victory for the harness UI.
  const chart = useMemo(() => {
    const props = {
      timeline: scenario.timeline,
      width: chartWidth,
      height: GEOMETRY.chartHeight,
      lodEnabled,
      onRenderSignal,
    };
    return (
      <RendererHost
        {...props}
        rendererId={rendererId}
        progressiveMode={progressiveMode}
        victoryMode={victoryMode}
      />
    );
  }, [chartWidth, lodEnabled, onRenderSignal, progressiveMode, rendererId, scenario.timeline, victoryMode]);

  const chartPresentation = chartForeground ? (
    scenario.status === 'data' ? (
      <>
        <View
          key={`${rendererId}-${scenario.name}-${mountKey}-${lodEnabled}-${progressiveMode}-${victoryMode}`}
          testID={`chart-${rendererId}`}
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants">
          {chart}
        </View>
        {scenario.timeline ? <OccupancyAccessibilityOverlay timeline={scenario.timeline} /> : null}
      </>
    ) : (
      <ChartStateOverlay status={scenario.status} />
    )
  ) : (
    <ChartStateOverlay status="background" />
  );

  return (
    <GestureHandlerRootView style={styles.root}>
      <SafeAreaView style={styles.root}>
        <StatusBar style="dark" />
        <ParentContainer scrollEnabled={parentScroll}>
        <View style={styles.header}>
          <Text style={styles.title}>Horcery chart renderer spike</Text>
        </View>

        <Segmented
          options={[
            { id: 'timeline', label: 'People In Stall' },
            { id: 'catalogue', label: 'Catalogue scalability' },
          ]}
          value={screenMode}
          onChange={(id) => {
            setRenderSignal(null);
            setScreenMode(id as 'timeline' | 'catalogue');
          }}
          testIDPrefix="scope"
        />

        <Segmented
          options={RENDERERS.map((r) => ({ id: r.id, label: r.label }))}
          value={rendererId}
          onChange={(id) => {
            setRenderSignal(null);
            setRendererId(id as RendererId);
          }}
          testIDPrefix="renderer"
        />

        {screenMode === 'timeline' ? <>
        <View style={styles.variants}>
          <Segmented
            options={[{ id: 'off', label: 'LOD off' }, { id: 'on', label: 'LOD on' }]}
            value={lodEnabled ? 'on' : 'off'}
            onChange={(id) => {
              setRenderSignal(null);
              setLodEnabled(id === 'on');
            }}
            testIDPrefix="lod"
            compact
          />
          {rendererId.startsWith('echarts') ? (
            <Segmented
              options={[{ id: 'default', label: 'Progressive default' }, { id: 'tuned', label: 'Progressive tuned' }]}
              value={progressiveMode}
              onChange={(id) => {
                setRenderSignal(null);
                setProgressiveMode(id as EChartsProgressiveMode);
              }}
              testIDPrefix="progressive"
              compact
            />
          ) : (
            <Segmented
              options={[{ id: 'relayout', label: 'Victory relayout' }, { id: 'matrix', label: 'Victory matrix' }]}
              value={victoryMode}
              onChange={(id) => {
                setRenderSignal(null);
                setVictoryMode(id as VictoryRenderMode);
              }}
              testIDPrefix="victory-mode"
              compact
            />
          )}
        </View>

        <View style={styles.variants}>
          <Segmented
            options={[{ id: 'static', label: 'Parent static' }, { id: 'scroll', label: 'Parent ScrollView' }]}
            value={parentScroll ? 'scroll' : 'static'}
            onChange={(id) => setParentScroll(id === 'scroll')}
            testIDPrefix="parent"
            compact
          />
          <Segmented
            options={[{ id: 'foreground', label: 'Chart foreground' }, { id: 'background', label: 'Chart background' }]}
            value={chartForeground ? 'foreground' : 'background'}
            onChange={(id) => {
              setRenderSignal(null);
              setChartForeground(id === 'foreground');
            }}
            testIDPrefix="lifecycle"
            compact
          />
        </View>

        <View style={styles.chips}>
          {scenarios.map((s, i) => (
            <Pressable
              key={s.name}
              testID={`scenario-${s.name}`}
              onPress={() => {
                setRenderSignal(null);
                setScenarioIndex(i);
              }}
              style={[styles.chip, i === scenarioIndex && styles.chipOn]}>
              <Text style={[styles.chipText, i === scenarioIndex && styles.chipTextOn]}>
                {s.name} · {s.intervalCount}
              </Text>
            </Pressable>
          ))}
        </View>

        <View style={styles.chartCard} testID="chart-card">
          {chartPresentation}
        </View>

        <View style={styles.stats} testID="stats">
          <Stat label="bars" value={String(scenario.intervalCount)} />
          <Stat label="build" value={`${scenario.buildMs} ms`} />
          <Stat
            label="render signal"
            value={renderSignal === null ? '…' : `${renderSignal.elapsedMs} ms · ${renderSignal.source}`}
            testID="stat-render-signal"
          />
          <Stat label="JS fps" value={jsFps === null ? 'off' : String(jsFps)} testID="stat-js-fps" />
        </View>

        <View style={styles.actions}>
          <Pressable
            testID="remount-sequence"
            onPress={() => setRemountSequence(startRemountSequence())}
            disabled={remountSequence !== null}
            style={[styles.button, remountSequence !== null && styles.buttonBusy]}>
            <Text testID="remount-sequence-status" style={styles.buttonText}>
              {remountSequence === null
                ? 'Remount 0 → 10 → 25 → 50'
                : remountSequence.phase === 'checkpoint'
                  ? `Checkpoint ${remountSequence.count}/50`
                  : `Remounting ${remountSequence.count}/50`}
            </Text>
          </Pressable>
        </View>

        <Text style={styles.purpose}>{scenario.purpose}</Text>
        </> : (
          <CataloguePanel
            rendererId={rendererId}
            width={chartWidth}
            renderSignal={renderSignal}
            onRenderSignal={onRenderSignal}
            onCaseChange={() => setRenderSignal(null)}
            jsFps={jsFps}
          />
        )}
        </ParentContainer>
      </SafeAreaView>
    </GestureHandlerRootView>
  );
}

const CATALOGUE_CASES: { id: string; label: string; purpose: string }[] = [
  {
    id: 'continuous-normal',
    label: 'continuous · 144',
    purpose: 'Two irregular time series, real gaps, a threshold, organization-zone labels and horizontal zoom.',
  },
  {
    id: 'continuous-high',
    label: 'continuous · 20k',
    purpose: 'The same meaning at 20,000 points. No sampling or gap filling is allowed to make the renderer look faster.',
  },
  {
    id: 'mixed',
    label: 'mixed + annotated',
    purpose: 'Stacked bars, a line with a genuine missing value, sparse event markers and one exact joined tooltip.',
  },
  {
    id: 'compact',
    label: 'compact summary',
    purpose: 'A bounded radial summary with an exact 68.2% value and restrained static presentation.',
  },
  {
    id: 'compact-no-data',
    label: 'compact no-data',
    purpose: 'No reading is distinct from zero percent and clears the radial presentation.',
  },
];

function CataloguePanel({
  rendererId,
  width,
  renderSignal,
  onRenderSignal,
  onCaseChange,
  jsFps,
}: {
  rendererId: RendererId;
  width: number;
  renderSignal: RenderSignal | null;
  onRenderSignal: (signal: RenderSignal) => void;
  onCaseChange: () => void;
  jsFps: number | null;
}) {
  const [caseIndex, setCaseIndex] = useState(0);
  const selected = CATALOGUE_CASES[caseIndex]!;
  // The stress fixture is intentionally created only when selected. A normal
  // chart screen must not pay the allocation/startup cost of a hidden test.
  const selectedChart = useMemo<CatalogueChart>(() => {
    if (selected.id === 'continuous-normal') return CONTINUOUS_NORMAL;
    if (selected.id === 'continuous-high') return buildContinuousFixture(10_000);
    if (selected.id === 'mixed') return MIXED_OBSERVATIONS;
    if (selected.id === 'compact') return COMPACT_SUMMARY;
    return COMPACT_NO_DATA;
  }, [selected.id]);
  const itemCount = selectedChart.kind === 'continuous'
    ? selectedChart.series.reduce((count, series) => count + series.points.length, 0)
    : selectedChart.kind === 'mixed'
      ? selectedChart.categories.length
      : selectedChart.value === null ? 0 : 1;

  return (
    <>
      <View style={styles.chips}>
        {CATALOGUE_CASES.map((entry, index) => (
          <Pressable
            key={entry.id}
            testID={`catalogue-${entry.id}`}
            onPress={() => {
              onCaseChange();
              setCaseIndex(index);
            }}
            style={[styles.chip, index === caseIndex && styles.chipOn]}>
            <Text style={[styles.chipText, index === caseIndex && styles.chipTextOn]}>{entry.label}</Text>
          </Pressable>
        ))}
      </View>
      <View style={styles.chartCard} testID="catalogue-chart-card">
        <CatalogueRendererHost
          key={`${rendererId}-${selected.id}`}
          rendererId={rendererId}
          chart={selectedChart}
          width={width}
          height={GEOMETRY.chartHeight}
          onRenderSignal={onRenderSignal}
        />
      </View>
      <View style={styles.stats} testID="catalogue-stats">
        <Stat label="items" value={String(itemCount)} />
        <Stat
          label="render signal"
          value={renderSignal === null ? '…' : `${renderSignal.elapsedMs} ms · ${renderSignal.source}`}
          testID="catalogue-render-signal"
        />
        <Stat label="JS fps" value={jsFps === null ? 'off' : String(jsFps)} />
      </View>
      <Text style={styles.purpose}>{selected.purpose}</Text>
    </>
  );
}

function ParentContainer({ scrollEnabled, children }: { scrollEnabled: boolean; children: ReactNode }) {
  if (scrollEnabled) {
    return (
      <ScrollView contentContainerStyle={styles.screen} testID="parent-scroll-view">
        {children}
      </ScrollView>
    );
  }
  return (
    <View style={styles.screen} testID="parent-static-view">
      {children}
    </View>
  );
}

function ChartStateOverlay({ status }: { status: 'no-data' | 'loading' | 'error' | 'background' }) {
  const copy = {
    'no-data': 'No Data Available',
    loading: 'Loading People In Stall chart',
    error: 'Something went wrong.\nPlease try again later.',
    background: 'Chart is in the background',
  }[status];
  return (
    <View
      style={styles.stateOverlay}
      testID={`chart-state-${status}`}
      accessible
      accessibilityRole={status === 'loading' ? 'progressbar' : 'text'}
      accessibilityLabel={copy.replace('\n', ' ')}>
      {status === 'loading' ? <ActivityIndicator color="#0369a1" /> : null}
      <Text style={styles.stateText}>{copy}</Text>
    </View>
  );
}

function OccupancyAccessibilityOverlay({ timeline }: { timeline: NonNullable<ReturnType<typeof loadScenarios>[number]['timeline']> }) {
  const model = useMemo<OccupancyA11yModel>(
    () =>
      buildOccupancyA11yModel(timeline, {
        chartLabel: 'People In Stall chart',
        seriesLabel,
      }),
    [timeline],
  );
  const [pageIndex, setPageIndex] = useState(0);
  const page = occupancyA11yPage(model, pageIndex);

  useEffect(() => setPageIndex(0), [model]);

  return (
    <View style={styles.a11yOverlay} pointerEvents="box-none" testID="occupancy-a11y-layer">
      <View
        style={styles.a11yNode}
        accessible
        accessibilityRole="adjustable"
        accessibilityLabel={`${model.summary} ${page.pageLabel}. Swipe up or down to browse interval pages.`}
        accessibilityValue={{ min: 1, max: page.pageCount, now: page.page + 1, text: page.pageLabel }}
        accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
        onAccessibilityAction={(event) => {
          if (event.nativeEvent.actionName === 'increment') setPageIndex((value) => value + 1);
          if (event.nativeEvent.actionName === 'decrement') setPageIndex((value) => value - 1);
        }}
        testID="occupancy-a11y-summary"
      />
      {page.intervals.map((interval, index) => (
        <View
          key={interval.id}
          style={[styles.a11yNode, { top: index + 2 }]}
          accessible
          accessibilityRole="text"
          accessibilityLabel={interval.label}
          testID={`occupancy-a11y-interval-${index}`}
        />
      ))}
    </View>
  );
}

function Segmented({
  options,
  value,
  onChange,
  testIDPrefix,
  compact = false,
}: {
  options: { id: string; label: string }[];
  value: string;
  onChange: (id: string) => void;
  testIDPrefix: string;
  compact?: boolean;
}) {
  return (
    <View style={[styles.segmented, compact && styles.segmentedCompact]}>
      {options.map((o) => (
        <Pressable
          key={o.id}
          testID={`${testIDPrefix}-${o.id}`}
          onPress={() => onChange(o.id)}
          accessibilityRole="button"
          accessibilityState={{ selected: o.id === value }}
          style={[styles.segment, o.id === value && styles.segmentOn]}>
          <Text style={[styles.segmentText, o.id === value && styles.segmentTextOn]}>{o.label}</Text>
        </Pressable>
      ))}
    </View>
  );
}

function Stat({ label, value, testID }: { label: string; value: string; testID?: string }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={styles.statValue} testID={testID}>
        {value}
      </Text>
    </View>
  );
}

/** JS-thread frames per second — a rough guide only (see header). */
function useJsFps(enabled: boolean) {
  const [fps, setFps] = useState<number | null>(null);
  const frames = useRef(0);
  useEffect(() => {
    if (!enabled) return;
    let raf = 0;
    const tick = () => {
      frames.current += 1;
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    const id = setInterval(() => {
      setFps(frames.current);
      frames.current = 0;
    }, 1000);
    return () => {
      cancelAnimationFrame(raf);
      clearInterval(id);
    };
  }, [enabled]);
  return fps;
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#ffffff' },
  screen: { flexGrow: 1, backgroundColor: '#ffffff' },
  // Top padding clears the Expo dev-client's floating "Tools" bubble (top-right,
  // ~90–110 px), which otherwise swallows taps on the third renderer segment.
  header: { paddingHorizontal: 16, paddingTop: 72 },
  title: { fontSize: 17, fontWeight: '600', color: '#0f172a' },
  segmented: { flexDirection: 'row', margin: 16, marginBottom: 8, borderRadius: 10, backgroundColor: '#f1f5f9', padding: 3 },
  segmentedCompact: { flex: 1, margin: 4 },
  variants: { flexDirection: 'row', marginHorizontal: 12 },
  segment: { flex: 1, paddingVertical: 8, borderRadius: 8, alignItems: 'center' },
  segmentOn: { backgroundColor: '#ffffff' },
  segmentText: { fontSize: 13, color: '#475569' },
  segmentTextOn: { color: '#0f172a', fontWeight: '600' },
  stateOverlay: { width: '100%', height: 300, borderRadius: 12, backgroundColor: '#f1f5f9', alignItems: 'center', justifyContent: 'center', gap: 10 },
  stateText: { color: '#64748b', fontSize: 14, textAlign: 'center' },
  a11yOverlay: { position: 'absolute', inset: 0 },
  a11yNode: { position: 'absolute', left: 0, top: 0, width: 1, height: 1, overflow: 'hidden' },
  // Wrapping rows, not a horizontal scroller: every fixture is one tap away,
  // for a human and for argent alike.
  chips: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 16, gap: 6, paddingBottom: 8 },
  chip: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 16, backgroundColor: '#f1f5f9' },
  chipOn: { backgroundColor: '#0369A1' },
  chipText: { fontSize: 11, color: '#334155' },
  chipTextOn: { color: '#ffffff', fontWeight: '600' },
  chartCard: { marginHorizontal: 16, borderRadius: 12, backgroundColor: '#ffffff', shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 8, elevation: 2 },
  stats: { flexDirection: 'row', justifyContent: 'space-around', marginTop: 12, paddingHorizontal: 16 },
  stat: { alignItems: 'center' },
  statLabel: { fontSize: 11, color: '#64748B' },
  statValue: { fontSize: 15, fontWeight: '600', color: '#0f172a', fontVariant: ['tabular-nums'] },
  actions: { flexDirection: 'row', justifyContent: 'center', marginTop: 12 },
  button: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 10, backgroundColor: '#0369A1' },
  buttonBusy: { backgroundColor: '#7DD3FC' },
  buttonText: { color: '#ffffff', fontWeight: '600' },
  purpose: { marginTop: 12, marginHorizontal: 16, fontSize: 12, color: '#64748B', lineHeight: 17 },
});
