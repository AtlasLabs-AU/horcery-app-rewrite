# Handover to Codex — People In Stall chart spike, Run 2

Written by Claude, 2026-08-16. Companion to Codex's own 10-step Run 2 plan (which
Inakshi forwarded to me); this document does not repeat that plan, it tells you
where everything is, what has already been done, what I designed but did not
finish, and the traps I already fell into so you don't.

Authoritative references, in this order: `Horcery_App_Rewrite_Requirements.md`
§6a (agreed architecture, weights, gates) → your 10-step plan → this file.

---

## 0. Ground rules that have not changed

- **Old app repo `84-horcery-app-react-native` is READ-ONLY reference. Never edit it.**
- **Never two chart engines in production.** Nothing from `spikes/` enters `src/`
  until one renderer is selected. `src/charts/` is the renderer-independent domain
  layer and IS production code — keep it free of ECharts/Victory/Skia imports
  (the ESLint default-deny boundaries enforce this; the boundary tests in
  `src/__tests__/architecture-boundaries.test.ts` prove it).
- Secrets travel via 1Password, never chat/email. Do not enter credentials.
- Any `sudo` command is surfaced to Inakshi, never run.
- Two agents share this machine. Stage by explicit path, never `git add -A`.
  Do not touch the `rnd` worktree (see §1) — it has another session's
  uncommitted work.
- Commit discipline from your plan: small commits, one purpose each, in the
  order: (1) Run 1 corrections ✅ done · (2) domain performance + LOD ·
  (3) harness corrections · (4) accessibility + parity · (5) measurement
  evidence · (6) scorecard + recommendation. Run `npm run check` (lint with
  `--max-warnings=0`, typecheck, jest) after every stage.
- Report outcomes faithfully. If a gate is unmet or a device is unavailable,
  say so; do not pick the less-bad candidate to finish.

## 1. Repository state (verified 2026-08-16 before handover)

| Where | Branch | Commit | Notes |
|---|---|---|---|
| `/Users/inakshi/dev/horcery-app-rewrite-main` | `main` | `d38628e` (pushed) | **Work here.** Git worktree of the same repo, moved out of `AI Projects` because RN native builds break on the space in that path. Clean except one untracked file (below). |
| `/Users/inakshi/AI Projects/Horcery/horcery-app-rewrite` | `rnd` | `165abb8` | Primary checkout, another session's Review-History work is uncommitted there. **Do not touch.** |

Untracked, uncommitted, deliberately left for you:
`src/charts/__tests__/occupancy-timeline.bench.test.ts` — the deterministic
benchmark for stage 2. **It fails on purpose against the current code**; making
it pass is stage 2's acceptance criterion. Commit it together with the fix.

Recent commits on `main` (oldest → newest): `ff7fd9d` domain layer + fixtures +
catalogue · `479ea46` fixture hardening · `406ec6d` clock-aligned positioning
kept, spikes gated out of app checks · `85f8c50` harness · `602b2f5` bring-up ·
`db04811` chips/DST wording · `bbe1753` Run 1 measurements · `d38628e` Run 1
corrections (stage 1 of your plan — **done**).

## 2. Where things live

**Domain layer (production, `src/charts/`)**
- `occupancy-timeline.ts` — `buildOccupancyTimeline()`, `positionInDay()`,
  `dayLabel()`, `hourTicks()`, `intervalTooltip()`, `ZOOM`. Types
  `OccupancyDay/Interval/Series/Timeline`, `PrometheusRangeSeries`.
- `fixtures/people-in-stall.ts` — seeded (mulberry32) generator producing
  Prometheus-shaped range responses. Fixtures and their fingerprints (interval
  counts, pinned by tests): normalWeek 38 · denseWeek 374 · quietWeek 0 · noData ·
  partialToday · overnight · daylightSaving (2026-03-08, 23 h day) ·
  daylightSavingFallBack (2026-11-01, 25 h day, 1000 samples that day) ·
  worstCase 6 720. Zone `America/Chicago`, step 90 s, threshold 0.2, series
  `Human_Interaction` (With Horse) / `Human_Presence` (Without Horse).
  **Observed-heavy (real anonymised QA response) is deliberately absent** — see §8.
- `__tests__/occupancy-timeline.test.ts` — 30 characterisation tests. Do not
  weaken them; extend them.
- `PEOPLE_IN_STALL.md` — behaviour catalogue §1–11 mined from the old app
  (tooltip text, zoom bounds, DST costs, legacy quirks kept/dropped, scoring).

**Harness (spike, `spikes/charts-harness/`)** — its own Expo app, own
`package.json`, bundle/package id `au.com.atlaslabs.horcery.chartsharness`.
- `App.tsx` — renderer segmented control, fixture chips, chart card keyed by
  renderer/scenario/mountKey, stats row (bars / build ms / first paint / JS fps),
  Remount ×50, `[harness]` console trace. `paddingTop: 72` exists because the
  Expo dev-client "Tools" bubble swallowed taps on the third segment.
- `src/scenarios.ts` — `loadScenarios()` builds every fixture through
  `buildOccupancyTimeline` and records `buildMs`; `SERIES` colours
  `#0369A1`/`#7DD3FC`; `GEOMETRY` (chartHeight 300, barHeight 16, radius 4,
  minWidth 1, tooltipHide 2000 ms, zoomMinSpan 0.1).
- `src/renderer.ts` — `RendererProps`, `RENDERERS` (echarts-svg, echarts-skia, victory).
- `src/renderers/echarts-timeline.tsx` — `@wuba/react-native-echarts` 3.1.1,
  echarts 6.1 custom series (rects), value x-axis 0..1, category y inverse,
  inside dataZoom `minSpan 10`, tooltip `trigger:'item'`, first paint via rAF proxy
  (Wuba emits no `finished`). **Uses `api.style()`** — deprecated, to remove.
- `src/renderers/victory-timeline.tsx` — `victory-native` 41.26 + Skia 2.6.2 +
  Reanimated 4.5. `CartesianChart` as coordinate system; bars drawn in
  `renderOutside` and re-laid-out from `useCartesianTransformContext` (k, tx);
  zoom-aware `xTicks` from `onScaleChange` with a guarded `setVisible`; scale AND
  pan clamped after the gesture via `plotRange`; own `Gesture.Tap` hit-test tooltip
  (press state snaps to data points, so the built-in one is unusable here);
  first paint via `reportFirstPaint()` from `onChartBoundsChange`.
  Skia `Matrix4` is **row-major: scaleX at index 0, translateX at index 3**
  (not 12 — that cost me an afternoon).
- `metro.config.js` — `watchFolders: ['../../src/charts']`, `nodeModulesPaths`
  fallback, custom `resolveRequest`: `tslib` → `tslib/tslib.js` (CJS pin, else
  `__extends undefined`), `@/charts/*` → shared dir. Do not add
  `disableHierarchicalLookup` (breaks expo-asset).
- `measure/PROTOCOL.md` (Run 1, marked superseded), `measure/RESULTS.md` (Run 1
  numbers + the correction block at the top), `measure/gfx.sh`
  (`reset | report <name> | mem <label>` around `adb shell dumpsys gfxinfo`).

**Gating of spikes out of the app's checks:** `jest.config.js`
`modulePathIgnorePatterns`/`testPathIgnorePatterns` for `spikes/`, `tsconfig.json`
excludes `spikes`, ESLint ignores `spikes/**`. The harness has its own
`tsc`; run `npx tsc --noEmit -p spikes/charts-harness` after harness edits.

## 3. Toolchain facts (all verified working)

- CocoaPods: `~/.gem/ruby/2.6.0/bin/pod` (not on PATH — call it by path).
- JDK: Temurin 17 at `~/Downloads/horcery-android/jdk/Contents/Home`
  (`export JAVA_HOME=...`). Android SDK `~/Library/Android/sdk`.
- Emulator: AVD `Horcery_Pixel` (API 36 arm64) → serial `emulator-5554`.
  `expo run:android --variant release` — do NOT pass `--device emulator-5554`
  ("Could not find device"); omit the flag.
- iOS: iPhone 17 Pro simulator `09C755C6-BF27-4AC2-8D97-A9DA4C5E5442`, iOS 26.5.
  `expo run:ios --configuration Release`. ~15 min; Android release ~30 min.
- Device driving: argent MCP. `describe` before every tap; `run-sequence` for
  fixed gesture sets; `gesture-pinch`/`gesture-swipe`; `native-profiler-*` for
  Instruments (hangs, CPU); `screen-recording-start/stop` for videos. Emulator
  input lag merges events — verify state from the post-action frame, use
  ≥800 ms delays between steps.
- Android smoothness: `dumpsys gfxinfo <pkg> reset` / `dumpsys gfxinfo <pkg>`
  (frames, janky %, p50/90/95/99, slow UI thread) — wrapped by `gfx.sh`.
  For Run 2 also capture `dumpsys gfxinfo <pkg> framestats` — per-frame
  timestamps incl. input event time → inter-frame gaps, >100 ms freezes,
  input-to-present latency. Memory: `dumpsys meminfo <pkg>` PSS.
- If Fast Refresh looks stuck, restart the app; the Android app once held a
  dead JS instance from a pre-fix bundle.

## 4. Stage 2 — domain performance + level of detail (designed, not implemented)

### 4a. Baseline (Node/jest, this laptop, `HORCERY_BENCH=1 npx jest src/charts/__tests__/occupancy-timeline.bench.test.ts`)

```
worst-case build: 951 ms for 13 440 samples (70.8 µs/sample)
normal-week 506 · dense-week 499 · quiet-week 490 · no-data 4.7 · partial-today 406
overnight 523 · daylight-saving 402 · fall-back 415 · worst-case 354 ms
positionInDay ×10 000: 412 ms  (≈41 µs per call)
```
On the Android emulator (release) the same builds took 2.2–2.6 s. Cause: one
`DateTime.fromSeconds(...).toFormat()` per sample in `buildOccupancyTimeline`
(13 440 per week) and two `DateTime` constructions per `positionInDay` call
(called twice per bar by both renderers, on every layout).

The bench asserts **relative** bounds (µs/sample < 2; every fixture < 1.5× the
ceiling; 10 000 `positionInDay` calls < 10 ms) so it is not hostile to CI.
Keep the `HORCERY_BENCH=1` printout and paste the after-numbers into
`RESULTS.md` (Run 2 section) beside the before-numbers above.

### 4b. Design I had started (I reverted my partial edit; the file is at `d38628e`)

1. **`OccupancyDay` gains three fields**, computed once per day with luxon:
   ```ts
   nextMidnight: EpochSeconds;            // unclamped; = end on finished days
   utcOffset: number;                     // seconds, in force at `start`
   utcOffsetChange?: { at: EpochSeconds; utcOffset: number }; // DST days only
   ```
   Find `utcOffsetChange` by comparing `DateTime.fromSeconds(start).offset` and
   `DateTime.fromSeconds(nextMidnight - 1).offset`; if they differ, binary-search
   the transition instant between them (~17 luxon calls, DST days only).
   The existing test `is pure — same input yields same output` uses `toEqual`,
   so the new fields must be deterministic (they are).

2. **Bucketing by arithmetic.** Days are contiguous ascending. Drop
   `sample[0] > nowSeconds` as now; then a sample belongs to day *i* iff
   `days[i].start <= t < days[i].nextMidnight`. Keep a cursor (Prometheus is
   ascending) and fall back to a scan if `t` goes backwards. No `Map<string,…>`
   keyed by formatted date; use `days[i]`.

3. **`intervalsForDay`**: the buckets are our own arrays, so check "already
   sorted" in O(n) and only sort in place when needed; the synthetic closing
   sample push is fine on our own array. Everything else unchanged —
   the characterised behaviour (open on `> threshold`, close on value change,
   synthetic close at `day.end`, which is `now` on today) must not move.

4. **`positionInDay(t, day, zone)`** becomes arithmetic (keep the signature;
   `zone` may become unused — keep it for API stability or drop it and update
   the two renderers + tests):
   ```
   if t <= day.start → 0;  if t >= day.nextMidnight → 1
   offset(t) = day.utcOffsetChange && t >= day.utcOffsetChange.at
               ? day.utcOffsetChange.utcOffset : day.utcOffset
   clockSeconds = (t + offset(t)) − (day.start + day.utcOffset)
   return clockSeconds / 86400
   ```
   Checks (already pinned by tests): spring 1:30 CST → 3:30 CDT is one real hour
   but 2/24 apart; fall-back both 1:30s land at 1.5/24; 7 AM is 7/24 on the 23 h,
   25 h and ordinary day; the closing midnight is exactly 1.

5. **Do not touch `dayLabel`, `hourTicks`, `intervalTooltip` semantics** — but
   note both renderers currently call `intervalTooltip` for **every bar at
   option-build time** (6 720 × two DateTimes + formats). Move tooltip text to
   **tap time** in both renderers (ECharts: `tooltip.formatter` function;
   Victory: in the tap handler). That is renderer-independent and fair.

6. **Renderer-independent geometry + LOD (new module, e.g.
   `src/charts/occupancy-layout.ts`)** — the thing your plan item 2b asks for:
   ```ts
   layoutOccupancyTimeline(timeline): OccupancyLayout
     // rows[], bars[]: { row, seriesIndex, x0, x1, interval } — x in [0,1] via positionInDay
   reduceLayout(layout, { visibleSpan: [x0,x1], plotWidthPx }): OccupancyLayout
     // merges same-row, same-series bars whose on-screen width < 1 physical px
     // AND whose gap < 1 px into one bar carrying `merged: OccupancyInterval[]`
     // (originals preserved for tooltip/a11y); never merges across series or rows;
     // identity when nothing is sub-pixel.
   ```
   Tests: reduction is idempotent; total covered time is preserved; at
   `visibleSpan=[0,1]`, plotWidth 350 px, worstCase (960 bars/row) reduces
   substantially; at 10 % span it restores to (near) originals; overnight and
   DST fixtures reduce identically before/after; the merged bar's tooltip lists
   the originals' range. **Both renderers must consume the SAME `reduceLayout`
   output** driven by the same visible-span callback (ECharts `datazoom` event
   → `setOption`; Victory `onScaleChange`). Measure LOD as a **variant**
   (on/off) — if it hurts one candidate that is a finding, not a tuning knob.

### 4c. Acceptance for stage 2
`npm run check` green; bench passes; all 30 characterisation tests untouched
and green; before/after numbers recorded; commit message names the µs/sample
before and after.

## 5. Stage 3 — harness corrections, specifics

- **Statistics ticker rerender**: `App.tsx` stats row updates JS fps every
  second; the chart element must be memoized (memo + stable props) — verify
  with the React profiler (argent `react-profiler-*`) that neither renderer
  commits on the tick.
- **First paint**: rAF-after-draw is NOT visible presentation. Prove or replace:
  test whether Wuba propagates ECharts' `rendered`/`finished` events (Run 1
  found no `finished`; `rendered` untested). If neither works, record it as an
  adapter limitation and use an external presentation measurement for both
  (Android: `framestats` first frame after mount; iOS: Instruments/`os_signpost`
  around mount + screen recording). Same start/stop boundaries for both:
  data arrival → domain build → option/geometry build → visible frame.
- **ECharts**: remove `api.style()` (use explicit `style: { fill }` in the
  custom series `renderItem`); test progressive rendering defaults vs tuned
  (`progressive`, `progressiveThreshold`); `useCoarsePointer` + `pointerSize`
  for near-tap; `animation: false` for large charts; finalist build imports
  **only** the Skia renderer; log every Wuba/Skia deprecation warning verbatim
  into the maintenance-risk section.
- **Victory**: after the two fixes, also build the "bars inside the transformed
  canvas group" variant (pure UI-thread zoom/pan; corner radius will distort
  under non-uniform scale — decide whether `rx` compensation is acceptable) and
  measure it against the current React-rerender implementation. Keep zoom
  limits 10–100 %, pan clamp, exact tooltip, corner behaviour.
- Automate the gesture set with argent `run-sequence` (pinch-in 0.15→0.60 700 ms ·
  pan L 0.75→0.25 400 ms · pan R 400 ms · pinch-out 700 ms · 800 ms rests) and
  save every raw `gfxinfo`/`framestats`/Instruments export — no hand transcription.

## 6. Stages 4–6 — notes

- Parity checklist (your item 4) → make it a table in
  `spikes/charts-harness/measure/PARITY.md`, one row per behaviour, one column
  per finalist, each cell = evidence pointer (screenshot/video hash). Add
  loading + error scenarios to `scenarios.ts` (they are not fixtures today).
  Tablet: iPad simulator for parity only; the physical tablet is a §7 gate.
  Parent ScrollView + background/foreground: add a wrapper toggle in `App.tsx`.
- Accessibility (your item 5): one native layer outside the canvas in
  `src/charts/` (renderer-independent, e.g. `occupancy-a11y.ts` producing a
  summary string + per-day/per-interval announcements from `OccupancyTimeline`),
  rendered by the harness as an overlay of focusable, labelled elements
  (paged/virtualised — never thousands of nodes). Verify with VoiceOver on
  simulator and TalkBack on emulator; record.
- Isolated finalist builds (item 6): two harness build variants via an env
  flag read in `renderer.ts` (`HORCERY_RENDERER=echarts-skia|victory`) that
  makes Metro exclude the other package; measure app size, native deps
  (`Podfile.lock`/gradle deps diff), clean-build reliability, cold start,
  first screen, chart mount, repeated nav, memory recovery, warnings.

## 7. Evidence storage convention (agreed with Inakshi's rule on repo size)

Raw traces, videos, `framestats` dumps: **outside git** at
`/Users/inakshi/AI Projects/Horcery/spike-evidence/run2/<device>/<renderer>/<scenario>/…`.
In git, commit only `spikes/charts-harness/measure/RUN2-MANIFEST.md`: one row
per artefact — path, device, build commit, timestamp, SHA-256, what it shows.

## 8. Blocked on Inakshi (do not fabricate; report as unavailable if unanswered)

1. Physical mid-range Android (Galaxy A7-2018 class) — owned, borrowed or
   purchase (~AU$100 used).
2. Modern Android, real iPhone, physical tablet.
3. Anonymised observed-heavy QA fixture: one Prometheus range-query response
   (`query_range`, step 90, one busy stall, 7 days, both `Event_Type` series),
   instance/job labels scrubbed, delivered via 1Password. Suggested requester:
   Vikum (backend). Load it as a tenth fixture with its own fingerprint test.

Until 1–3 land: complete stages 2–6 fully, run the sim/emu matrix with ≥7
repetitions and randomised renderer order as supporting evidence, and **do not
issue a recommendation**. Say exactly what remains unavailable.

## 9. Things I got wrong before, so you don't

- Claimed a "RNTL act() quirk" — false; `render/rerender/fireEvent.press` are
  simply async in v14 and must be awaited.
- "Fixed" DST by elapsed-time positioning — wrong; clock alignment is the
  chart's grammar. Reverted; costs are documented and tested.
- Guessed the dense fixture fingerprint (452) — actual 374. Never guess
  fingerprints; run the test.
- Read 10 cheap frames as "smoothness". Frames-per-second and cost-per-frame
  are separate claims; report both, always with the frame count.
- Wrote "first paint" for the next animation frame. Don't.
