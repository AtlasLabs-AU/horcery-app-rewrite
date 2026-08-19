# Run 2 protocol — People In Stall renderer decision

Frozen before Run 2 device numbers. Requirements authority:
`Horcery_App_Rewrite_Requirements.md` §6a. Run 1 is preflight only.

## Candidates and variants

- Finalists: ECharts · Skia and Victory Native · Skia. SVG remains rejected.
- Shared LOD is measured off and on for both finalists.
- ECharts: progressive defaults and the declared tuned variant.
- Victory: React relayout and transformed-matrix variants.
- Final bundle/cold-start comparisons use isolated single-renderer builds.

No variant may reduce labels, legend, tooltip meaning, zoom limits, domain
meaning, or any fixture to make its library look faster.

The legacy near-tap “Zoom to click” hint is deferred to the shared production
chart surface. It remains a shipping-parity requirement but is not duplicated
inside both throwaway adapters and does not block renderer selection.

## Accuracy gate

Accuracy is evaluated before performance and is never averaged into a score.
Both finalists must consume the same domain objects and preserve timestamps,
interval boundaries, counts, units, thresholds, missing/quiet/error meaning,
organization-zone and DST behavior, and full-detail semantics through LOD.
Any material mismatch rejects that finalist regardless of smoothness or cost.

## Whole-catalogue scalability

People In Stall is necessary but not sufficient. Before renderer selection:

1. Inventory the legacy chart families and their capabilities.
2. Group them into reusable technical archetypes.
3. Implement bounded representative slices for at least continuous time series
   and mixed/annotated series, using renderer-independent inputs.
4. Record adapter-only code, duplicated behavior, unsupported capabilities,
   large-data behavior, bundle impact and maintenance warnings.

A finalist fails scalability if other chart families require a bespoke chart
framework, repeated interaction/state machinery, or changed domain meaning.
The shipping inventory has no dual-unit/two-value-axis chart, so that capability
is documented rather than implemented unless a new product contract requires it.

## Inputs

- All deterministic fixtures, including normal, dense, empty, overnight,
  spring/fall DST and the 6,720-interval ceiling.
- The anonymised observed-heavy QA response when supplied through 1Password.
- Same chart width, height, colours, axis grammar and device orientation.

## Build and devices

- Release builds only for decision evidence.
- Supporting matrix: current iOS simulator and Android emulator.
- Decision gates: physical mid-range Android, modern Android, real iPhone and
  physical tablet. Simulator/emulator results do not substitute for these.

## Repetition and ordering

For every finalist × significant variant × normal/dense/ceiling scenario:

1. Force-stop and relaunch the isolated build.
2. Allow one unrecorded warm-up interaction.
3. Reset platform counters.
4. Run the fixed gesture sequence below.
5. Capture raw frame and memory evidence immediately.
6. Repeat at least seven times.

Rotate finalist and variant order between repetitions. Report the median and
tail, never the best run alone.

## Fixed gesture sequence

- Pinch in: normalised points 0.15 → 0.60 over 700 ms.
- Rest 800 ms.
- Pan left: 0.75 → 0.25 over 400 ms.
- Rest 800 ms.
- Pan right: 0.25 → 0.75 over 400 ms.
- Rest 800 ms.
- Pinch out over 700 ms.
- Rest 800 ms.

Argent must `describe` before interaction and verify the selected
renderer/scenario/variant from the post-action frame. Emulator delays between
steps are at least 800 ms.

## Timing definitions

The harness's `render signal` is a diagnostic library callback only:

- ECharts `rendered` or `finished`, if Wuba propagates it; otherwise an
  explicitly labelled rAF fallback.
- Victory `onChartBoundsChange`, explicitly labelled a layout signal.

None is called "first paint" or used as visible-presentation evidence.
End-to-end presentation is measured externally from data/scenario selection
through domain build, renderer preparation and the first presented native
frame (`gfxinfo framestats` on Android; Instruments/signpost or equivalent on
iOS).

## Metrics

- Produced-frame count and cadence.
- Inter-frame gaps, including periods in which no frame was produced.
- Input-event to presented-frame latency.
- p50, p90, p95 and p99 rendered-frame duration.
- Count and duration of freezes over 100 ms.
- CPU and memory high-water mark.
- PSS after clean-launch baselines and after 10, 25 and 50 remounts.
- Cold start, domain preparation, renderer preparation and visible frame.
- App size, native dependency/build cost and warnings for isolated builds.
- Accuracy, behavioural, scalability and visual evidence pointers.

## Raw evidence

Raw files live outside git under:

`/Users/inakshi/AI Projects/Horcery/spike-evidence/run2/<device>/<renderer>/<scenario>/`

Git stores only `RUN2-MANIFEST.md`: path, device, build commit, timestamp,
SHA-256 and what the artefact proves. No number enters the scorecard without a
raw evidence pointer.

## Decision rules

Rejection gates are applied before scoring. A finalist is rejected for changed
domain meaning or inaccurate output, a
crash/unbounded memory, missing required behaviour, any interaction freeze over
100 ms, unsmooth worst-case pan/zoom, delayed useful content, memory that does
not substantially return, or an architecture that does not scale across the
representative chart families.

**Product clarification, approved 2026-08-17:** the 6,720-interval payload must
be accepted safely, but 6,720 literal bars are not a readable full-week user
interface. The worst-case gate is satisfied only by an explicitly labelled,
accuracy-preserving bounded overview that retains separate series meaning and
restores original intervals on zoom. It is not satisfied by dropping,
mislabeling, or visually merging series. The original raw-bar run remains a
diagnostic comparison and cannot override this user-facing contract.

Only passing finalists are scored: smoothness 30%, reliability/memory 25%,
whole-catalogue scalability 20%, behavioural parity 15%, implementation cost
10%. If neither passes, the outcome is "neither passed", not a forced winner.

Manual VoiceOver and TalkBack validation is deferred by product decision. The
shared native semantic layer and its automated tests remain, but spoken
screen-reader testing is a pre-release shipping gate rather than a blocker for
this renderer decision.
