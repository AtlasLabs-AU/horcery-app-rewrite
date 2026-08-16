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
| Mixed and annotated Cartesian | `scatter-chart`, `scatter-line-chart`, `stacked-bar-and-line-chart`, trend line-and-bar; feed/water/refill and trend widgets | Scatter + line + bar, stacking, marks/thresholds, mixed units, exact tooltip joins | Representative slice required |
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
