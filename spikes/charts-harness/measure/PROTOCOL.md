# Measurement protocol — People In Stall renderer spike (Run 1 — preflight)

> **Superseded for the decision (2026-08-16).** This is the Run 1 protocol:
> one repetition, emulator/simulator only, next-animation-frame "first paint",
> hand-transcribed numbers. It stays as the record of how Run 1 was taken.
> The deciding protocol is `RUN2-PROTOCOL.md`.

Written before the first number was taken, so the numbers cannot shape it.
Results go in `RESULTS.md` in the same shape.

## Builds

- iOS: `expo run:ios --configuration Release` on iPhone 17 Pro simulator (iOS 26.5).
- Android: `expo run:android --variant release` on `Horcery_Pixel` (API 36, arm64 emulator).
- Same commit for every run; commit hash recorded at the top of RESULTS.md.
- **These establish parity, build compatibility and large differences. They do
  not pick the winner** — that is a release build on a physical mid-range
  Android (catalogue §10).

## Loads

| Load | Fixture | Bars |
|---|---|---|
| normal | `normal-week` | 38 |
| stress | `dense-week` | 374 |
| ceiling | `worst-case` | 6 720 |
| observed-heavy | *(real anonymised QA response — not yet captured)* | — |

## Per renderer × load

1. Select renderer, select fixture. Wait for the chart to settle (≥ 3 s).
2. **First paint** — read `stat-first-paint` from the harness (first animation
   frame after the draw call; same proxy for all three). Three samples via
   Remount, report the median.
3. **Gesture set** — identical every time, driven by argent, over the plot area:
   pinch-in 0.15→0.60 over 700 ms · pan left 0.75→0.25 over 400 ms · pan right
   0.25→0.75 over 400 ms · pinch-out 0.60→0.15 over 700 ms. 800 ms rest between.
4. **Android smoothness** — `measure/gfx.sh reset` before step 3,
   `measure/gfx.sh report <renderer>-<load>` after. Records total frames,
   janky count/%, p50/p90/p95/p99 frame time, slow-UI-thread count.
5. **iOS smoothness** — argent native profiler (Instruments) around step 3:
   UI hangs count and longest hang; JS fps minimum from the harness during the
   gesture as a secondary signal.
6. **Reliability / memory** — on `dense-week`: `measure/gfx.sh mem before`,
   Remount ×50, wait 15 s, `measure/gfx.sh mem after`. Report PSS delta. Any
   crash or visual corruption during any step is recorded verbatim.

## Scoring (catalogue §10 weights)

Smoothness 30 · Reliability/memory 25 · Parity 20 · Accessibility 15 · Cost 10.
Rejection gates first: <60 fps pan of `normal-week` on the physical Android;
collapse on `worst-case`; `quiet-week` indistinguishable from `no-data`; bars
not exposed to the accessibility tree.

## Caveats that travel with every number

- Emulator/simulator GPU paths differ from phones; treat as **relative**.
- Harness overhead is constant across renderers (JS fps counter, stats row).
- ECharts back-ends do layout in JS then hand geometry to native; Victory
  (as implemented here) re-renders React per transform tick. Both costs are
  real; neither is hidden.
