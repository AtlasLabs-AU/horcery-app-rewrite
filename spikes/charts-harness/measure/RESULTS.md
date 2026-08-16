# Results — People In Stall renderer spike (run 1, 2026-08-16)

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

## 6. Reading (provisional — not a decision)

- **ECharts · SVG — reject.** It is what the current app uses. Main-thread
  hangs and a 900 ms p90 at the ceiling on Android, +160 MB retention on
  remount, and the fewest updates per second of the three.
- **ECharts · Skia — leads on this evidence.** Cheapest per frame (p50 17 ms
  dense), no hangs, flat memory, fast mount, and it gives zoom limits, axis
  regeneration, overlap hiding and item tooltips for free. Against it: the
  JS-bound update rate during a pinch (~10/s here; unknown on a phone), and
  Wuba's use of Skia APIs that Skia has deprecated for removal.
- **Victory · Skia — viable challenger, on a condition.** It is the only one
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
