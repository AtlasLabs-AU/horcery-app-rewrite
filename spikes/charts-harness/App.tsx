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
  DEFAULT_RENDERER_ID,
  RENDERERS,
  type EChartsProgressiveMode,
  type RendererId,
  type RenderSignal,
  type VictoryRenderMode,
} from './src/renderer';
import { RendererHost } from './src/renderer-host';
import { GEOMETRY, loadScenarios, seriesLabel } from './src/scenarios';

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
  const [scenarioIndex, setScenarioIndex] = useState(0);
  const [mountKey, setMountKey] = useState(0);
  const [renderSignal, setRenderSignal] = useState<RenderSignal | null>(null);
  const [remounting, setRemounting] = useState<number | null>(null);
  const [lodEnabled, setLodEnabled] = useState(false);
  const [progressiveMode, setProgressiveMode] = useState<EChartsProgressiveMode>('default');
  const [victoryMode, setVictoryMode] = useState<VictoryRenderMode>('relayout');
  const [parentScroll, setParentScroll] = useState(false);
  const [chartForeground, setChartForeground] = useState(true);
  const jsFps = useJsFps();

  const scenario = scenarios[scenarioIndex]!;
  const onRenderSignal = useCallback((signal: RenderSignal) => {
    setRenderSignal({ ...signal, elapsedMs: Math.round(signal.elapsedMs) });
  }, []);

  // Harness trace — every state change lands in the Metro log so a run can be
  // reconstructed exactly. Remove nothing here: it is the audit trail.
  useEffect(() => {
    console.log(
      `[harness] renderer=${rendererId} scenario=${scenario.name} mount=${mountKey} ` +
      `lod=${lodEnabled} progressive=${progressiveMode} victory=${victoryMode}`,
    );
  }, [rendererId, scenario.name, mountKey, lodEnabled, progressiveMode, victoryMode]);
  useEffect(() => {
    console.log('[harness] App mounted');
    return () => console.log('[harness] App UNMOUNTED');
  }, []);

  // Remount loop for the reliability/memory check.
  useEffect(() => {
    if (remounting === null) return;
    if (remounting >= 50) {
      setRemounting(null);
      return;
    }
    const id = setTimeout(() => {
      setRenderSignal(null);
      setMountKey((k) => k + 1);
      setRemounting(remounting + 1);
    }, 120);
    return () => clearTimeout(id);
  }, [remounting]);

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
          <Text style={styles.title}>People In Stall — renderer spike</Text>
        </View>

        <Segmented
          options={RENDERERS.map((r) => ({ id: r.id, label: r.label }))}
          value={rendererId}
          onChange={(id) => {
            setRenderSignal(null);
            setRendererId(id as RendererId);
          }}
          testIDPrefix="renderer"
        />

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
          <Stat label="JS fps" value={String(jsFps)} testID="stat-js-fps" />
        </View>

        <View style={styles.actions}>
          <Pressable
            testID="remount-50"
            onPress={() => setRemounting(0)}
            disabled={remounting !== null}
            style={[styles.button, remounting !== null && styles.buttonBusy]}>
            <Text style={styles.buttonText}>{remounting === null ? 'Remount ×50' : `Remounting ${remounting}/50`}</Text>
          </Pressable>
        </View>

        <Text style={styles.purpose}>{scenario.purpose}</Text>
        </ParentContainer>
      </SafeAreaView>
    </GestureHandlerRootView>
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
function useJsFps() {
  const [fps, setFps] = useState(0);
  const frames = useRef(0);
  useEffect(() => {
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
  }, []);
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
