# Charts harness — People In Stall renderer spike (§6a)

Three renderers behind one switch, nine fixtures behind another, identical
geometry, all drawing the app's own `src/charts` domain layer.

```
npm ci                                  # own dependencies, incl. both renderers
npx expo prebuild --platform ios        # or android
npx expo run:ios                        # debug — for correctness / parity
npx expo run:ios --configuration Release   # what performance is measured on
npx expo run:android --variant release
```

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
