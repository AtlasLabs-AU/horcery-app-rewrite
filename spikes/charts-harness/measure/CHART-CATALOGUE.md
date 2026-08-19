# Horcery chart catalogue and scalability gate

Read-only survey of the shipping app on 2026-08-16. This is evidence for the
renderer decision, not a plan to copy the legacy generators.

## Verified footprint

- 17 option-generator files under `packages/charts/src/generators/options`.
- 41 widget source files import `@acme/charts` directly.
- The generators cover custom intervals, line, scatter, stacked/mixed bar and
  line, ordinary and simple bars, pie, gauge, progress, liquid, avatar and
  rotating-card presentations.
- Cross-cutting behavior includes time/category axes, data zoom, legends,
  tooltips, overlays, missing data, thresholds/mark lines, tablet layout and
  mixed series.

These numbers describe the legacy implementation footprint. They do not mean
the rewrite should create 17 new generators or 41 adapters.

## Technical archetypes

| Archetype | Legacy examples | Capabilities the winner must support | Evidence status |
|---|---|---|---|
| Interval timeline | `compound-bar-chart`; People In Stall and stall occupancy | Custom intervals, two series, exact boundaries, zoom/pan, hit-testing, DST, large-data LOD | Run 2 in progress |
| Continuous time series | `line-chart`, `stacked-line-chart`; ambient/climate, activeness, earnings | Irregular/missing samples, multiple series, time axis, thresholds, units, zoom, live append | Representative slice required |
| Mixed and annotated Cartesian | `scatter-chart`, `scatter-line-chart`, `stacked-bar-and-line-chart`, trend line-and-bar; feed/water/refill and trend widgets | Scatter + line + bar, stacking, marks/thresholds, the shipping app's single value scale, exact tooltip joins | Representative slice required |
| Aggregated categorical | `bar-chart`, `simple-bar-chart`, trend bars; alerts, cleaning, projected revenue | Categories, stacked values, labels, empty buckets, scrolling/zoom, deterministic aggregation | Covered partly by mixed slice; capability fixture required |
| Compact summary / radial | `pie-chart`, `gauge-chart`, `progress-bar`, `liquid-chart`; last 24 hours, intake, daily activity, water | Arcs/radial labels, percentage/domain bounds, compact cards, animation restraint, no-data semantics | Bounded feasibility slice required; water remains a mandatory replacement |
| Bespoke card visuals | `bar-and-avatar-chart`, FYP rotating bars; consumption/occupancy and behavior cards | Images/avatars, compact responsive geometry, card lifecycle, reduced-motion behavior | Architecture/cost review required; do not force into a generic chart abstraction |

## Bounded representative slices

The spike adds only enough code to expose renderer-wide costs. It does not
rebuild product screens.

1. **Continuous observations:** two time series with irregular gaps, a threshold,
   organization-zone labels, unit formatting and a high-point-count fixture.
2. **Mixed observations:** stacked bars plus a line and sparse event markers,
   with an exact joined tooltip and missing categories.
3. **Compact summary:** one bounded gauge or donut with exact percentage/domain
   behavior and no-data state.

All three receive renderer-independent domain inputs and golden expected values.
The same accuracy rule as People In Stall applies: LOD or rendering may reduce
geometry, never values or meaning.

## Legacy traceability and bounded exclusions

The inventory is 17 option-generator files: 13 at the options root, one FYP
rotating-bar generator and three trend generators. The representative slices
above trace directly to those files; the count does not imply 17 new adapters.

No shipping generator uses two differently scaled units in one plot. The only
array of y-axes is `stacked-line-chart`, where each row receives its own grid
and axis for the same observation family. Dual-unit/two-axis support is therefore
a documented library capability, not work or a rejection gate in this spike.
Re-open it only if a new cloud/product contract requires it.

## Scalability rejection gate

A finalist is rejected if any representative slice requires:

- screen or feature code importing the renderer;
- duplicated zoom, tooltip, state or formatting machinery per chart;
- raw PromQL or legacy API response types in presentation code;
- a bespoke general-purpose chart framework maintained by Horcery;
- inaccurate aggregation, gap filling, thresholds, units or timezone handling;
- both renderer engines in the production bundle;
- unacceptable build/runtime warnings or an unmaintained native dependency.

## Cost evidence to record

For each finalist and archetype, record adapter lines added, renderer-specific
tests, unsupported capabilities, native/JavaScript bundle delta, warnings,
large-data behavior and whether the common domain contracts remained unchanged.
Cost is a tie-breaker after accuracy, reliability, smoothness and scalability.

### Maintenance checkpoint — before physical measurement

Raw line counts are context, not a score; generated syntax and test code are
not equivalent maintenance burdens.

| Finalist | Current adapter/helper footprint | Renderer-specific work already exposed | Known warnings / follow-up |
|---|---:|---|---|
| ECharts · Skia | 506 adapter lines (timeline + catalogue) | Zoom-dependent truthful tick interval after four rejected axis attempts | Wuba Skia deprecated-path runtime warnings; shared `tslib` export fallback; upstream cadence check pending |
| Victory · Skia | 777 adapter/helper lines (timeline + catalogue + gesture + continuous-path helpers) | Custom hit-test tooltip; cumulative pinch, overshoot and focal rebasing; linear scale table plus custom exact-segment paths after a 2 GB adapter freeze | Shared `tslib` export fallback; upstream cadence check pending |

Defects remain evidence even after correction: they indicate which behavior
Horcery must own through future library upgrades. The final cost entry also
records renderer-specific tests, build time, bundle delta and upstream response.

## Run 2 implementation status — 2026-08-17

This is a checkpoint, not a renderer recommendation.

- A renderer-independent contract and deterministic golden fixtures now cover
  continuous observations (144 and 20,000 points), mixed/annotated Cartesian
  data, compact radial data and compact no-data. The root gate passes with 107
  tests, and the standalone harness typechecks.
- The continuous fixture now deliberately offsets the second sensor's interior
  timestamps. Victory no longer attaches one sensor's values to another's
  timestamps by array index; its tested table keeps independently sampled
  values at their original times and uses separate paths around explicit null
  gaps. This correction must be present in both fresh physical-device builds.
- The release harness no longer runs its JavaScript FPS animation loop during
  measurements. Platform traces remain the deciding evidence, without the
  harness forcing a frame and whole-screen React render every second.
- The 20,000-point fixture is built only when selected; entering an ordinary
  chart screen no longer allocates a hidden stress case.
- The first physical Victory 20,000-point attempt exposed a multiplicative
  adapter table and reached approximately 2 GB PSS. The corrected adapter uses
  a linear two-column scale table and draws exact independently timestamped,
  gap-preserving segments as Skia paths through Victory's scales and clip.
  On the Redmi Note 12 it remained responsive at approximately 220 MB PSS.
  This adds Horcery-owned rendering code and therefore counts against Victory's
  maintenance cost even though the correction passed the bounded smoke.
- Victory's Android release smoke rendered all five cases. The mixed case kept
  the missing line segment, stacked bars and event markers, and its April tap
  produced the exact joined tooltip. The compact cases visibly distinguished
  68.2% from no-data.
- The same Victory catalogue states and exact April tooltip now pass on a
  physical Redmi Note 12. ECharts rendered its static states on that phone but
  failed to show the mixed tooltip after a bounded rich-text correction.
- ECharts' first catalogue attempt produced an Android ANR while the emulator
  was at 99% total CPU (Google Play Services exceeded the chart process), so
  that run remains invalid as renderer evidence. A later isolated physical
  Release rendered all five static cases, but its mixed tooltip did not appear
  after the bounded rich-text attempt.
- The isolation scripts exposed a cache hazard: changing `HORCERY_RENDERER`
  does not invalidate Gradle's generated JavaScript-bundle task. A later APK
  silently contained the previous finalist until the on-screen renderer label
  caught it. Future runs must force the bundle task for the selected finalist
  and verify the foreground package, embedded bundle and visible renderer label
  before collecting evidence.
- The forced ECharts bundle completed but took 648,771 ms on the saturated
  host and emitted repeated `tslib/tslib.js` exports fallbacks. APK assembly was
  stopped after prolonged native rebuild work. This is provisional build-cost
  evidence and a harness defect to fix, not a runtime score.
