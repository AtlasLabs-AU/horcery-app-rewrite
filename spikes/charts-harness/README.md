# Charts harness — People In Stall renderer spike (§6a)

Three renderers behind one switch, nine deterministic data fixtures plus loading
and error states behind another, identical
geometry, all drawing the app's own `src/charts` domain layer.

```
npm ci                                  # own dependencies, incl. both renderers
npx expo prebuild --platform ios        # or android
npx expo run:ios                        # debug — for correctness / parity
npx expo run:ios --configuration Release   # what performance is measured on
npx expo run:android --variant release
```

## Run 2 isolated finalists

`HORCERY_RENDERER` changes the Metro entry graph and native app identifier.
Prebuild each finalist before its Release build so autolinking is recalculated;
the two bundle IDs can then remain installed side-by-side.

```bash
HORCERY_RENDERER=echarts-skia npx expo prebuild --clean --no-install
HORCERY_RENDERER=echarts-skia npx expo run:ios --configuration Release

HORCERY_RENDERER=victory npx expo prebuild --clean --no-install
HORCERY_RENDERER=victory npx expo run:ios --configuration Release
```

For Android on this test machine, set `JAVA_HOME` to the Temurin 17 JDK recorded
in the Run 2 handover before the same prebuild plus `expo run:android --variant
release` sequence. Bundle source-map audits must show no `victory-native` source
in the ECharts build and no `echarts`, `zrender`, or Wuba source in the Victory
build. A combined harness bundle is not evidence for bundle size or cold start.

- **Renderers:** `ECharts · SVG` (what the current app uses), `ECharts · Skia`, `Victory · Skia`.
- **Fixtures:** from `src/charts/fixtures/people-in-stall.ts` — the chip shows name · bar count.
- **Stats row:** bars, domain-layer build time, library render signal, JS-thread FPS. The signal is diagnostic only; Run 2 visible presentation comes from native frame evidence.
- **Variants:** shared LOD off/on; ECharts progressive default/tuned; Victory relayout/matrix. The trace logs every selected combination.
- **Remount ×50:** unmount/remount loop for the leak check; watch memory in the platform profiler.

UI-thread frame times come from the platform, not from the app:
`adb shell dumpsys gfxinfo au.com.atlaslabs.horcery.chartsharness framestats`
on Android; Instruments (Core Animation / Animation Hitches) on iOS. Drive the
gestures with argent so every run is the same run.

What each renderer must do is `src/charts/PEOPLE_IN_STALL.md` §2–§7; how the
result is scored is §10 there.
