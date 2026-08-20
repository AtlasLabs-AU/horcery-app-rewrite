# Chart review checklist

Use this quick checklist for every new or changed chart. It complements the
full `CHART_ENGINEERING_STANDARD.md` and chart specification; it does not replace
them.

## 1. Does the chart tell the truth?

- [ ] Write the one customer question the chart answers.
- [ ] Confirm a chart is clearer than a number, sentence or table.
- [ ] Confirm Data Science's approved query, calculation, thresholds and
      missing-data rules. Do not infer them from the legacy UI.
- [ ] Confirm the entity, time range, timezone, aggregation and canonical unit.
- [ ] Run the approved query against representative real data before trusting
      fixtures. Check for empty, duplicate, phantom and mislabelled series.
- [ ] Confirm every visible value, unit, label, timestamp and verdict can be
      traced back to the approved contract.

**Stop:** unknown units, meaning, thresholds, entity selection or missing-data
behaviour block implementation. Never guess.

## 2. Check the recurring accuracy bugs

- [ ] Missing data stays missing; it is never converted to zero.
- [ ] A real observed zero remains distinguishable from no observation.
- [ ] Partial or stale data is labelled and never presented as complete/current.
- [ ] Future timestamps are ignored and a day in progress is not extended into
      the future.
- [ ] Today's incomplete value is not compared like a completed day.
- [ ] Barn-day boundaries use the organization's timezone and configured start
      time, including midnight crossings and daylight-saving changes.
- [ ] Timestamps from different series are joined by timestamp/entity, never by
      array position.
- [ ] Multiple or ambiguous entities fail closed instead of silently choosing
      the first result.
- [ ] Threshold edges are explicit: exactly on, just below and just above.
- [ ] A badge, direction or colour agrees with the numbers shown. Contradictory
      inputs produce an unknown state, not a confident claim.
- [ ] The app does not interpolate, extend, average or classify data unless the
      approved contract explicitly allows it.

## 3. Check visual honesty and readability

- [ ] The visual form matches the meaning: lines for change, bars for discrete
      periods, intervals for events, and composition charts only for a real
      fixed whole.
- [ ] Axes, baselines and ranges do not exaggerate or hide change.
- [ ] Units and time ranges are visible and consistent in labels and tooltips.
- [ ] Missing days/intervals look absent, not like zero-height readings.
- [ ] Incomplete periods look incomplete rather than unusually low.
- [ ] Reference lines and “usual” ranges are labelled and visually secondary to
      the actual reading.
- [ ] Colour uses chart tokens, survives light/dark mode and is never the only
      carrier of meaning. Red remains reserved for real alerts.
- [ ] The chart remains understandable without tapping, pinching or panning.

## 4. Present every data state honestly

- [ ] Loading
- [ ] Refreshing while existing data remains visible
- [ ] No data
- [ ] Out of stall / not applicable
- [ ] Stale, including the age of the last reading
- [ ] Partial / incomplete coverage
- [ ] Unavailable or malformed response
- [ ] Unsupported device/model
- [ ] Ambiguous entity/result

Blocking states must hide misleading values, plots and verdicts. Non-blocking
states such as refreshing, stale or partial may retain the last valid chart, but
must clearly label its condition.

## 5. Keep the code reusable and bounded

- [ ] Fetching, domain meaning, state presentation, shared layout and drawing are
      separate modules.
- [ ] Feature screens import neither Victory nor Prometheus/query code.
- [ ] Victory/Skia stays behind the shared Horcery chart adapter.
- [ ] Daily, weekly and other variants reuse shared shells, state surfaces,
      formatting, axes and tokens rather than copying large components.
- [ ] Chart-specific meaning remains in a tested domain model, not in drawing
      code or a generic UI helper.
- [ ] No hardcoded colours, spacing, type sizes or unbounded data ranges.
- [ ] A new chart family does not quietly become a second private charting
      framework. Escalate substantial bespoke drawing before multiplying it.

## 6. Test the failure modes, not only the happy path

- [ ] Contract tests: version, entity, unit, malformed and unexpected responses.
- [ ] Domain tests: null versus zero, partial/stale, threshold boundaries,
      conflicting inputs, timezone, barn midnight and DST.
- [ ] Series tests: misaligned timestamps, duplicate series, changed response
      order and ambiguous sensors/entities.
- [ ] Component tests: values, labels, units, legends, states and tooltips.
- [ ] Fixtures: normal real data, realistic dense data, empty, partial, stale,
      current incomplete period and justified maximum supported data.
- [ ] Add a regression test for every bug found before fixing it.
- [ ] Run the full project checks; do not accept new warnings.

## 7. Verify the real experience

- [ ] Inspect the complete API/query → domain model → chart → interaction path.
- [ ] Check light and dark mode.
- [ ] Check default text, one size larger and one accessibility size; labels must
      wrap or reflow rather than truncate.
- [ ] Check the target phone layout and applicable tablet layout.
- [ ] Test all charts on the destination screen together, not only one in a
      harness.
- [ ] Use realistic production volumes first; label synthetic extremes as
      stress tests and do not let them outweigh reality.
- [ ] Use a release-like build on the mid-range Android gate phone and a physical
      iPhone. A simulator verifies layout, not shipping smoothness.
- [ ] Confirm the chart visibly responds before trusting frame-time numbers; a
      frozen chart can produce deceptively “perfect” performance metrics.
- [ ] Check repeated navigation for crashes and memory that does not settle.

Manual VoiceOver and TalkBack remain the agreed pre-release gate, not an
early-slice blocker.

## 8. Close the review properly

- [ ] Update the chart specification and `CHART_AND_QUERY_REGISTER.md`.
- [ ] Store traceable fixtures, screenshots, device/build details and test
      results.
- [ ] Record unresolved risks, owners and removal conditions; do not describe an
      untested item as passed.
- [ ] Do not call the chart complete until its accuracy, states, full-screen
      behaviour and physical-device experience are verified.

