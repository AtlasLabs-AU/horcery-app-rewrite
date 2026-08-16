# Results — People In Stall renderer spike (run 1, 2026-08-16)

> ## Status of this document (corrected 2026-08-16, after review)
>
> **Run 1 is an instrumentation preflight, not a renderer-selection decision.**
> Everything below the line is kept exactly as written on the day; this block
> records what the review found wrong with how it was read.
>
> - **ECharts · SVG is rejected.** (Unchanged.)
> - **ECharts · Skia remains a finalist. Victory Native remains a finalist.
>   There is no overall leader.** §6 below said Skia "leads on this evidence";
>   that was too strong and is withdrawn. Its low completed-frame cost
>   (p50 17 ms dense) was measured on **50 frames in ~5 s, and 10 frames at the
>   ceiling** — a cheap frame is not smoothness when almost no frames are
>   produced. Frames-per-second and cost-per-frame are two different claims and
>   Run 1 conflated them.
> - **Victory's Run 1 numbers are contaminated by two harness defects** (mine,
>   §2): its chart re-rendered on the stats ticker every second, and its
>   first-paint instrumentation had been deleted, so its mount and idle-CPU
>   figures are not comparable with the ECharts figures in the same tables.
> - **Run 1 satisfied none of the gates:** no physical device (§10 of the
>   catalogue: mid-range Android, modern Android, iPhone, tablet), no
>   accessibility layer, no observed-heavy real fixture, single repetition,
>   manually transcribed numbers, no raw evidence retained, "first paint" =
>   next animation frame (an unproven proxy for visible presentation).
> - **Still true and renderer-independent:** the domain layer costs 2.2–2.6 s
>   on the emulator (§5) and is fixed before anything else in Run 2.
>
> Run 2's protocol supersedes `PROTOCOL.md` for the decision. See
> `RUN2-PROTOCOL.md` when it lands.

## Run 2 — Stage 2 domain result (2026-08-16)

The renderer-independent bottleneck identified in Run 1 is fixed in source and
pinned by `occupancy-timeline.bench.test.ts`; this is not yet a replacement for
the Android end-to-end rerun.

- Same-session laptop wall-clock before/after: **5.33 → 0.36 µs/sample** for
  the 13,440-sample ceiling immediately before and after the arithmetic change.
- The regression gate now uses process CPU time so concurrent Metro/native
  builds cannot turn scheduler starvation into a domain-code failure. Latest
  contended run: **1.79 CPU µs/sample**, under the unchanged 2 µs ceiling.
- `positionInDay` ×10,000: **185.33 ms before → 0.08 CPU ms after**. Day UTC
  offsets and the one DST transition are computed once; positioning is then
  arithmetic while retaining the 30 characterised clock-alignment behaviours.
- Samples are bucketed into the seven known day ranges arithmetically. The
  defensive out-of-order path and all fixture fingerprints remain tested.
- New shared `occupancy-layout.ts` retains every source interval while merging
  only same-row, same-series sub-pixel bars. It is idempotent, restores all
  6,720 originals at 10% zoom, preserves covered time, and generates legacy
  tooltip strings lazily for only the selected reduced bar.

The earlier 2.2–2.6 s Android result remains the device baseline until the
corrected release harness is rebuilt and measured in Run 2.

## Run 2 — Stages 3–6 status (2026-08-16)

**Status: engineering scaffolding and isolated Release smoke checks are
complete; the measurement matrix and decision gates are not. No finalist
leads.** Raw artefacts and their limitations are indexed in
`RUN2-MANIFEST.md`; behavioural claims are tracked separately in `PARITY.md`.

- Both adapters now consume the same renderer-independent timeline and shared
  level-of-detail API. Run 2 exposes LOD off/on, ECharts progressive
  default/tuned and Victory relayout/matrix variants without changing the
  fixtures or meaning.
- The accessibility layer is native and outside either canvas. It pages at 20
  interval nodes and its formatting/paging behavior is pinned by five tests.
  An Android ECharts tree proves the summary and 20 exact interval labels. A
  clean live Victory inspection showed the same nodes, but the retained XML is
  contaminated by a System UI dialog, so Victory remains pending until a clean
  raw capture exists. Neither finalist has spoken VoiceOver/TalkBack evidence.
- Shared loading, error and no-data states, parent ScrollView and lifecycle
  controls exist in the harness. Their parity rows remain pending until the
  required transition recordings or traces are retained.
- Fresh isolated iOS Simulator and Android Release builds launch without Metro.
  `package.json#expo.autolinking` excludes React Native SVG and the dev-client
  family. Source-map audits show that ECharts contains no Victory/SVG sources
  and Victory contains no Wuba/ECharts/zrender/SVG sources.
- Release sizes: ECharts 125,651,811-byte APK and 27,876,515-byte zipped iOS
  simulator archive; Victory 124,549,851-byte APK and 27,108,558-byte archive.
  The small deltas are cost evidence, not a quality verdict.
- Both finalists visibly render the normal fixture on both simulators. The
  iPad mini screenshots expose a parity defect: ECharts omits the ending
  `12 AM` label even though the catalogue requires both endpoints always shown.
  A shared renderer-independent tick selector now retains both visible
  endpoints for both adapters; a fresh Release rebuild and 100%/10% capture is
  still required before this row can pass. Different intermediate label
  spacing is acceptable overlap hiding, not by itself a semantic difference.
- Both exports emit a `tslib/tslib.js` exports-fallback warning. ECharts also
  emits React Native Skia deprecated-path API warnings at runtime; this is a
  maintenance-risk item to resolve or price before selection.

One-off `gfxinfo` and `meminfo` files in the manifest are smoke diagnostics,
not results. The frozen protocol requires randomized order, at least seven
repetitions, common external metrics and JS-sensitive tracing for every
significant variant × normal/dense/ceiling combination. None of those cells is
complete, so there are no Run 2 medians, tails, freeze counts or memory-return
claims yet.

### Corrected iOS Release follow-up

The shared axis correction has now been rebuilt in both isolated iOS Release
apps. Both show the required starting and ending `12 AM` labels at 100%, and
both regenerate readable labels at maximum zoom. Android rebuild proof remains
pending.

That verification found a separate Victory adapter defect before measurement:
the first pinch centred correctly, while a second cumulative pinch moved both
Victory variants toward 10 PM–midnight. The failed screenshots remain in the
evidence store. The installed Victory gesture composes later pinches around a
raw screen focal point as though it were still an untransformed chart point.
The harness now provides the cumulative pinch through Victory's public custom
gesture input, with pure tests for focal invariance and zoom/pan clamping. A
fresh isolated iOS Release build plus recordings of four repeated centred
pinches verify that both `relayout` and `matrix` remain centred and stop at the
10% floor. No performance cell was scored while the variants had different
interaction meaning.

The final recommendation also remains blocked by the observed-heavy QA fixture
and release-like runs on a physical mid-range Android, modern Android, iPhone
and tablet. Simulator/emulator checks cannot satisfy §6a's decision gates.

---

Commit measured: `db04811` (harness) on `main`. Protocol: `PROTOCOL.md`.
Builds: iOS **Release** on iPhone 17 Pro simulator (iOS 26.5, MacBook Air);
Android **release** on `Horcery_Pixel` (API 36 arm64 emulator, same machine).

> **These numbers rank the renderers relative to each other on this machine.
> They do not certify a customer's phone.** No frame here hit 16.7 ms on the
> emulator for any renderer, including the trivial normal week — the emulator's
> GPU path is not a phone's. The physical mid-range Android run decides.

## 1. Parity (all three renderers, both platforms)

| Fixture | ECharts · SVG | ECharts · Skia | Victory · Skia |
|---|---|---|---|
| normal / dense / quiet | ✓ | ✓ | ✓ |
| no-data overlay | ✓ | ✓ | ✓ |
| partial-today (row stops at now) | ✓ | ✓ | ✓ |
| overnight (edge-to-edge split) | ✓ | ✓ | ✓ |
| daylight-saving spring / fall (7 AM aligned) | ✓ | ✓ | ✓ |
| worst-case 6 720 renders and zooms | ✓ (slow) | ✓ | ✓ |
| pinch-zoom 10–100 %, pan | native (dataZoom) | native | hand-written clamp, after gesture |
| hour axis regenerates on zoom, overlaps hidden | native | native | hand-written |
| tap bar → exact tooltip text | native (`trigger:'item'`) | native | hand-written hit-test |
| seven day labels | ✓ | ✓ | needed `tickCount` |
| accessibility: bars in the a11y tree | ✗ (SVG nodes, unlabelled) | ✗ (canvas) | ✗ (canvas) — **all three need an overlay; not built** |
| near-tap "Zoom to click" hint | not ported | not ported | not ported |

## 2. iOS Release — Instruments (argent native profiler), gesture set on plot

| Renderer · load | First paint | UI hangs | JS thread CPU over the set | Main thread |
|---|---|---|---|---|
| SVG · dense (374) | 55 ms | **0** | ~318 ms | quiet |
| SVG · worst (6 720) | 838 ms | **4 microhangs, ~260 ms each** | ~681 ms | **hot 2.3 s** (SVG node materialisation) |
| Skia · dense | 61 ms | 0 | ~346 ms | ~141 ms |
| Skia · worst | 906 ms | 0 | ~557 ms | quiet |
| Victory · dense | (no readout — see note) | 0 | ~236 ms | ~234 ms |
| Victory · worst | (no readout — see note) | 0 | ~450 ms + GC ~125 ms | ~197 ms |

Normal week, all three: first paint 18–46 ms (ECharts), 0 hangs.

Two harness faults in this run, both mine, both fixed in code afterwards and
not yet rebuilt: (a) Victory's first-paint reporter had been deleted by an
earlier edit, so its "first paint" never showed — that is why the cells above
are empty, not a Victory property; (b) Victory re-rendered once a second on the
stats tick (~30 ms each) because the chart element was not memoized, inflating
its idle JS by ~3 %.

## 3. Android release — `dumpsys gfxinfo` over the gesture set

`total` = frames the app actually produced during the ~5 s (9 s at the ceiling)
set — a proxy for how often the chart visually updated. `p50/p90/p99` = frame
render time. Janky = frames over the 16.7 ms deadline.

| Renderer · load | frames | janky | p50 | p90 | p99 | slow UI thread |
|---|---|---|---|---|---|---|
| SVG · normal | 41 | 100 % | 32 ms | 48 | 73 | 35 |
| SVG · dense | 35 | 100 % | 32 ms | 40 | 48 | 32 |
| SVG · worst | **5** | 100 % | 150 ms | **900** | 900 | 3 |
| Skia · normal (run 1 / run 2) | 40 / 52 | 100 / 98 % | 61 / 42 ms | 150 / 53 | 250 / 77 | 11 / 2 |
| Skia · dense | 50 | 98 % | **17 ms** | 38 | 69 | 4 |
| Skia · worst | **10** | 100 % | 32 ms | 53 | 53 | 2 |
| Victory · normal | **158** | 97 % | 34 ms | 61 | 93 | 64 |
| Victory · dense | **312** | 96 % | 32 ms | 48 | 77 | 122 |
| Victory · worst | **355** | 97 % | 34 ms | 93 | **300** | 154 |

Read together: the ECharts back-ends update the picture only ~8–10× a second
during a pinch (layout is computed in JS, then handed to native), and at the
ceiling almost not at all — but each frame Skia paints is cheap. Victory
redraws continuously (30–70 frames a second produced) at ~32 ms a frame with
the UI thread doing real work each time; at the ceiling its tail reaches 300 ms.

Android first paint (harness readout, release): SVG normal 170 ms · dense
106–222 ms · worst 1 830 ms. Skia normal 54–210 ms · dense 59–414 ms · worst
1 389 ms. Victory: no readout (harness fault, see §2); mount cost measured indirectly below.

## 4. Reliability / memory — Remount ×50 on dense-week (Android, PSS)

| Renderer | before | after | after 2nd cycle | loop duration | notes |
|---|---|---|---|---|---|
| ECharts · SVG | 383 MB | **542 MB** (held at 543 after 25 s) | 490 MB | ~7 s | +110–160 MB high-water retention, does not grow further — not a leak, but not returned either |
| ECharts · Skia | 418 MB | 374 MB | — | ~7 s | flat; last remount was blank for ~1 s while JS caught up, then drew |
| Victory · Skia | 455 MB | 452 MB | — | **~45 s** | flat; **~0.8 s per mount** of 374 bars (JS fps 3 during the loop) |

No crashes on any renderer at any load on either platform.

## 5. Renderer-independent finding

`buildOccupancyTimeline` cost 200 ms on the iOS simulator and **2.2–2.6 s on
the Android emulator** per fixture — it calls luxon per sample (13 440 calls a
week). Day boundaries can be computed once and samples bucketed by arithmetic.
Must be fixed in `src/charts` before any chart ships, whatever the renderer.

## 6. Reading as written on the day (provisional — superseded, see the status block at the top)

- **ECharts · SVG — reject.** It is what the current app uses. Main-thread
  hangs and a 900 ms p90 at the ceiling on Android, +160 MB retention on
  remount, and the fewest updates per second of the three.
- **ECharts · Skia — leads on this evidence.** *[Withdrawn 2026-08-16: it is a
  finalist, not a leader — see the status block.]* Cheapest per frame (p50 17 ms
  dense), no hangs, flat memory, fast mount, and it gives zoom limits, axis
  regeneration, overlap hiding and item tooltips for free. Against it: the
  JS-bound update rate during a pinch (~10/s here; unknown on a phone), and
  Wuba's use of Skia APIs that Skia has deprecated for removal.
- **Victory · Skia — viable challenger, on a condition.** *[Corrected
  2026-08-16: a finalist on equal footing; its Run 1 mount/idle numbers are
  contaminated by the two harness defects in §2.]* It is the only one
  that redraws continuously through a gesture, which may *feel* smoother on a
  real GPU — that is exactly what the physical Android test must answer. Its
  costs are certain: ~0.8 s mounts on the emulator, 300 ms tail at the
  ceiling, and every axis/tooltip/zoom-limit behaviour is code we own.
  (Not tried: drawing bars inside Victory's transformed canvas group — pure
  UI-thread zoom, at the price of corner-radius distortion. Worth one more
  measurement before writing Victory off on smoothness.)

**Gates before a decision (unchanged):** the anonymised real QA response as
the observed-heavy load; a release build on a physical mid-range Android; the
accessibility overlay proven on the finalists.
