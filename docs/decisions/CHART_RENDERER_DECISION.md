# Chart renderer — decision

**Date:** 2026-08-19
**Status:** **Decided.** Supersedes the provisional selection recorded on
2026-08-17 under `spike-evidence/run2/physical-redmi-note-12/decision-day/`.
**Selected:** **Victory Native (`victory-native` 41.x) on Skia**
**Rejected:** ECharts via `@wuba/react-native-echarts` — both its SVG and Skia
back-ends
**Confidence:** Medium-high on Android, medium overall. Reversal conditions and
untested gaps are listed at the end, and both are real.

Authority: requirements §6a. Decided on measured evidence, not preference, as §6a
required.

---

## 1. The decision in plain English

Use Victory to draw the charts. Do not port the legacy chart package. Feature
screens keep talking only to the renderer-independent Horcery chart layer that
already exists, so no screen imports a chart library and the engine can be
replaced later without rewriting chart meaning.

The two candidates are close on almost everything a developer cares about, and
ECharts is actually the cheaper one to maintain. The decision turns on one fact:

> On the mid-range Android phones a large share of Horcery's customers use,
> ECharts is unusable and Victory is not.

Horcery ships to both platforms and §6a permits only one chart engine in
production. When one candidate is fine everywhere and the other fails on the
weaker platform, the weaker platform decides.

## 2. What was measured

Three real devices, one simulator, identical fixtures, identical gesture script
(pinch open ×2, pan left, pan right, pinch closed ×2), release builds throughout.

### The load that matters

Measured from the live stall monitors on 2026-08-18 (`sm-1275`, `sm-1272`,
`sm-1212`, seven days each):

| Metric | Real state changes per week |
|---|---:|
| Horse occupancy | 36 – 48 |
| Lying down | 33 – 69 |
| Human in stall | 270 – 350 |

The **dense fixture (374 intervals)** is therefore a realistic busy week and is
the load the decision rests on. The **ceiling fixture (6,720)** is roughly **19×**
anything these devices produce; it is retained as a stress case and never
averaged with dense. Before this measurement the spike had been ranking
candidates largely on the ceiling — a load that does not occur.

### Physical Redmi Note 12 (Android 15) — the deciding device

At the realistic load (374), gestures performed by hand:

| | ECharts · Skia | Victory · Skia |
|---|---:|---:|
| Screen updates produced | 45 | **120** |
| Worst single frame | 163 ms | **59 ms** |
| Frames over 100 ms | 1 | **0** |
| Inakshi, verbatim | **"very slow"** | **"smooth"** |

At the ceiling (6,720), three attempts, both LOD settings:

| | ECharts · Skia | Victory · Skia |
|---|---|---|
| Frames during a full gesture set | **4, then 0, then 2** | 120, then 120 |
| Recovered without force-stop | **No — 0 of 3** | Yes — 2 of 2 |
| Memory | 390 – 460 MB | 235 – 277 MB |
| Inakshi, verbatim | "stuck and its still stuck" · "basically unusable" | "not that smooth" |

### Physical iPhone 17 Pro Max (iOS 26.6)

At the realistic load, Instruments Animation Hitches, 25-second windows:

| | ECharts · Skia | Victory · Skia |
|---|---:|---:|
| **Visible stutters** | **0** | **0** |
| Frames produced | 158 | 230 |
| Inakshi, verbatim | "smooth" | "smooth" |

**Both renderers are fine on premium Apple hardware.** ECharts' failure is
specific to mid-range Android, not universal — an important narrowing, and the
reason this document does not claim ECharts is simply bad.

## 3. Against §6a's gates and weights

**Rejection gates first, as §6a requires.** ECharts fails two on the deciding
device: *"no interaction freeze over 100 ms"* and *"pan/zoom smooth under
worst-case data"* — unrecoverably, three times out of three, in both
configurations, requiring a force-stop each time. A gate failure disqualifies
regardless of score. Victory passes all gates; its own ceiling defect (a 5.7–6.4 s
layout stall) was fixed during the spike and now reports **140 ms**.

| Criterion | Weight | Winner | Basis |
|---|---:|---|---|
| Smoothness | 30 % | **Victory** | 120 vs 45 updates at realistic load; user perception agreed |
| Reliability / memory | 25 % | **Victory** | ECharts unrecoverable ×3; 390–460 MB vs 235–277 MB |
| Whole-catalogue scalability | 20 % | *ECharts* | 4/4 archetypes from library primitives; Victory hand-draws 2/4 plus tooltips and zoom maths |
| Behavioural parity | 15 % | tied | both corrected; no decision-critical difference remains |
| Implementation cost | 10 % | *ECharts* | 506 vs 777 adapter lines (~37 % fewer) |

Victory takes the 55 % that customers feel. ECharts takes the 30 % that concerns
our own convenience. Cost is explicitly a tie-breaker in §6a and does not override
a gate failure.

**Why ECharts loses on Android but not iOS.** Its adapter draws each interval
through a `custom` series whose callback runs in JavaScript, once per bar, with
`dataZoom` set to `filterMode: 'none'` so nothing is excluded as the viewport
changes. Every zoom step re-runs that work for all intervals, on the same thread
that services touch. Apple hardware absorbs it; a mid-range Android phone does
not. Victory draws with Skia against the chart's scales, so zooming is largely
geometry rather than JavaScript.

## 4. Consequences

1. Victory's adapter moves into `src/components/charts`, behind the existing
   renderer-independent seam. Feature screens continue to import no chart library.
2. **The ECharts spike code and all Run 2 evidence are retained** until Victory's
   first production chart passes its acceptance checks; removal is then a separate
   verified commit. §6a requires removal "before production work", which is not the
   same as today. Only one engine ever ships.
3. Victory costs more Horcery-owned code — custom tooltip hit-testing, pinch
   composition and clamping, exact segment paths. That is accepted, with eyes open,
   and is the main thing to watch as the rest of the catalogue is built. If a
   future archetype needs yet another bespoke drawing path, revisit.
4. Pin `victory-native`, `@shopify/react-native-skia` and Expo to tested versions;
   upgrade deliberately, with a physical-device regression run.
5. The legacy chart package stays read-only reference. Do not port it.

## 5. Reversal conditions

Revisit this decision if any of these occur:

- a required chart family cannot be built without yet more bespoke drawing code,
  such that Victory starts to constitute a private chart framework (§6a excludes
  one);
- repeated navigation shows memory that does not settle or substantially return;
- the anonymised production response materially exceeds the shapes measured here;
- Victory becomes incompatible with the pinned Expo/React Native/Skia stack and
  cannot be corrected inside the adapter boundary;
- a physical mid-range **iPhone** shows Victory failing where ECharts does not —
  untested, see below.

## 6. What was NOT established — read before quoting this document

- **One repetition per cell on iOS**, and hand-performed gestures on Android
  (Xiaomi blocks synthetic touch, so the randomised seven-repetition matrix in
  `RUN2-PROTOCOL.md` was never run). These are bounded comparisons, not a
  laboratory result.
- **No older or mid-range iPhone was tested.** The iPhone evidence comes from the
  fastest device Apple sells, where both candidates were fine. Nothing here
  certifies a cheaper iPhone.
- **No physical tablet** was tested; iPad evidence is simulator layout only.
- The physical-iPhone build was **not renderer-isolated** (a linker failure forced
  a direct `xcodebuild` without the isolation flag), so both libraries were present
  and **no memory figures may be quoted from it**. The Android builds were properly
  isolated and are the stronger evidence.
- **Screen-reader validation remains deferred** by Inakshi's 2026-08-16 decision;
  it is a pre-release gate.
- The **observed-heavy production response** has still not been supplied. Real
  interval counts were measured directly from Prometheus instead, which is better
  evidence for *volume* but not a substitute for the real response shape.

## 7. Separate from this decision, and now the actual blocker

Selecting an engine does not make the charts correct. Measured against live data
on 2026-08-18, the following are open regardless of renderer, and production chart
work should not proceed on the affected charts until they are resolved:

- the activity query returns **two series, one of them entirely zeros** — a
  phantom flat line beside the real data (cause: the query's own `or on(instance)`
  fallback carrying a different label set, not historical label drift);
- **average volume, humidity and pressure have no declared unit**, and
  `activeness` has no metric metadata at all;
- **activeness is not a percentage** (raw values 5.7–158) yet is presented today as
  a pie chart and progress ring — the visual asserts a precision the measurement
  does not have;
- one activity query took **28.7 seconds** to return uncached — a mobile problem no
  renderer can fix.

The next deliverable is a chart-and-query register: every chart, its approved
query, units, thresholds, and whether real data supports it.

---

**Evidence.** `spike-evidence/run2/physical-redmi-note-12/` (Android, incl.
`manual-physical/RUN-LOG.md`), `spike-evidence/run2/iphone-17-pro-max-physical/`
(real iPhone), `spike-evidence/run2/ios-sim-iphone-17-pro-max/` (simulator),
`spikes/charts-harness/measure/` (protocols, parity ledger, cost ledger, analyzer).
All raw captures retained with SHA-256 hashes; every table generated from them.
