import { StatusBar } from 'expo-status-bar';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, SafeAreaView, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { RENDERERS, type RendererId } from './src/renderer';
import { EChartsTimeline } from './src/renderers/echarts-timeline';
import { VictoryTimeline } from './src/renderers/victory-timeline';
import { GEOMETRY, loadScenarios } from './src/scenarios';

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

  const [rendererId, setRendererId] = useState<RendererId>('echarts-svg');
  const [scenarioIndex, setScenarioIndex] = useState(0);
  const [mountKey, setMountKey] = useState(0);
  const [firstPaintMs, setFirstPaintMs] = useState<number | null>(null);
  const [remounting, setRemounting] = useState<number | null>(null);
  const jsFps = useJsFps();

  const scenario = scenarios[scenarioIndex]!;
  const onFirstPaint = useCallback((ms: number) => setFirstPaintMs(Math.round(ms)), []);

  useEffect(() => setFirstPaintMs(null), [rendererId, scenarioIndex, mountKey]);
  // Harness trace — every state change lands in the Metro log so a run can be
  // reconstructed exactly. Remove nothing here: it is the audit trail.
  useEffect(() => {
    console.log(`[harness] renderer=${rendererId} scenario=${scenario.name} mount=${mountKey}`);
  }, [rendererId, scenario.name, mountKey]);
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
      setMountKey((k) => k + 1);
      setRemounting(remounting + 1);
    }, 120);
    return () => clearTimeout(id);
  }, [remounting]);

  const chart = (() => {
    const props = { timeline: scenario.timeline, width: chartWidth, height: GEOMETRY.chartHeight, onFirstPaint };
    switch (rendererId) {
      case 'echarts-svg':
        return <EChartsTimeline {...props} backend="svg" />;
      case 'echarts-skia':
        return <EChartsTimeline {...props} backend="skia" />;
      case 'victory-skia':
        return <VictoryTimeline {...props} />;
    }
  })();

  return (
    <GestureHandlerRootView style={styles.root}>
      <SafeAreaView style={styles.root}>
        <StatusBar style="dark" />
        <View style={styles.header}>
          <Text style={styles.title}>People In Stall — renderer spike</Text>
        </View>

        <Segmented
          options={RENDERERS.map((r) => ({ id: r.id, label: r.label }))}
          value={rendererId}
          onChange={(id) => setRendererId(id as RendererId)}
          testIDPrefix="renderer"
        />

        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipRow} contentContainerStyle={styles.chips}>
          {scenarios.map((s, i) => (
            <Pressable
              key={s.name}
              testID={`scenario-${s.name}`}
              onPress={() => setScenarioIndex(i)}
              style={[styles.chip, i === scenarioIndex && styles.chipOn]}>
              <Text style={[styles.chipText, i === scenarioIndex && styles.chipTextOn]}>
                {s.name} · {s.intervalCount}
              </Text>
            </Pressable>
          ))}
        </ScrollView>

        <View style={styles.chartCard} testID="chart-card">
          <View key={`${rendererId}-${scenario.name}-${mountKey}`} testID={`chart-${rendererId}`}>
            {chart}
          </View>
        </View>

        <View style={styles.stats} testID="stats">
          <Stat label="bars" value={String(scenario.intervalCount)} />
          <Stat label="build" value={`${scenario.buildMs} ms`} />
          <Stat label="first paint" value={firstPaintMs === null ? '…' : `${firstPaintMs} ms`} testID="stat-first-paint" />
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
      </SafeAreaView>
    </GestureHandlerRootView>
  );
}

function Segmented({
  options,
  value,
  onChange,
  testIDPrefix,
}: {
  options: { id: string; label: string }[];
  value: string;
  onChange: (id: string) => void;
  testIDPrefix: string;
}) {
  return (
    <View style={styles.segmented}>
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
  // Top padding clears the Expo dev-client's floating "Tools" bubble (top-right,
  // ~90–110 px), which otherwise swallows taps on the third renderer segment.
  header: { paddingHorizontal: 16, paddingTop: 72 },
  title: { fontSize: 17, fontWeight: '600', color: '#0f172a' },
  segmented: { flexDirection: 'row', margin: 16, marginBottom: 8, borderRadius: 10, backgroundColor: '#f1f5f9', padding: 3 },
  segment: { flex: 1, paddingVertical: 8, borderRadius: 8, alignItems: 'center' },
  segmentOn: { backgroundColor: '#ffffff' },
  segmentText: { fontSize: 13, color: '#475569' },
  segmentTextOn: { color: '#0f172a', fontWeight: '600' },
  chipRow: { flexGrow: 0 },
  chips: { paddingHorizontal: 16, gap: 8, paddingBottom: 8, alignItems: 'center' },
  chip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, backgroundColor: '#f1f5f9' },
  chipOn: { backgroundColor: '#0369A1' },
  chipText: { fontSize: 12, color: '#334155' },
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
