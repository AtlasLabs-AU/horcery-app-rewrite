# Horcery chart engineering standard

- **Agreed:** 2026-08-19
- **Authority:** `PRINCIPLES.md`, requirements §6a, and
  `docs/decisions/CHART_RENDERER_DECISION.md`
- **Applies to:** every graph, timeline, distribution, trend, progress visual and
  chart-like score in the Horcery mobile application
- **Renderer:** Victory Native 41.x on Skia, behind the Horcery chart boundary

This is the canonical standard for chart work by people, Claude and Codex. It
defines how a chart earns its place, where its meaning lives, what the phone may
calculate, and what must be proved before the chart is considered complete.

The legacy app is evidence of customer behaviour and historical intent. It is
not the implementation standard.

## 1. The rule above all others

**Every chart must answer one useful customer question, in one sentence.**

If that sentence cannot be written, or if a number or short sentence answers the
question more clearly, do not build a chart. Reproducing a legacy chart is not a
reason by itself.

Examples:

- Good: “When was a person detected in this stall during the selected week?”
- Good: “Is this horse's resting time changing compared with its normal range?”
- Not enough: “Show the activeness data.”

## 2. Ownership boundary: meaning before presentation

**Data Science and the backend own what the data means. The mobile app owns how
that meaning is presented.**

| Layer | Owns | Must not own |
|---|---|---|
| Data Science | calculation, aggregation, thresholds, classifications, sensor interpretation, missing-data rules, scientific validity | phone layout, pixels, gestures |
| Backend observation API | authenticated access, entity selection, bounded time windows, query execution, response versioning, canonical units, resolution, provenance | screen layout or Victory configuration |
| Mobile domain layer | contract validation, explicit presentation models, user-unit conversion, barn-time formatting, honest states | PromQL, scientific inference, thresholds invented in the client |
| Chart component | axes, labels, geometry, tooltips, gestures, rendering efficiency | changing values, filling gaps, choosing among ambiguous entities |
| Feature screen | customer context and placement | importing Victory, reading Prometheus, parsing chart responses |

The phone may perform presentation-only work: canonical-unit conversion to the
user's preference, locale-aware number/date formatting, mapping timestamps to
screen positions, and culling geometry that is outside the visible window. These
operations must not change the domain meaning.

The phone must not:

- combine sensor values into a new behaviour or health conclusion;
- invent, tune or silently override a threshold;
- treat missing data as zero;
- interpolate or extend an interval unless the approved contract says to;
- silently choose the first result when several entities or sensors answer;
- perform large chart-specific calculations on every gesture frame;
- expose PromQL, Prometheus URLs or raw Prometheus response shapes to a screen.

## 3. Data architecture

### Target architecture

The production destination is a **versioned observation API** owned by the
backend. The app asks for a named observation, entity and bounded time range. It
does not author or download PromQL.

```text
Feature screen
  -> chart domain hook
    -> observation service
      -> backend observation API
        -> reviewed Data Science query
```

The response contract must identify at least:

- observation/chart identifier and contract version;
- entity identifier and type;
- requested and effective time range;
- organization/barn timezone;
- canonical unit and series meaning;
- resolution or aggregation interval;
- generated/observed timestamps;
- data-quality or missing-data state;
- points or intervals in a bounded, documented shape.

### Temporary rebuild adapter

A temporary adapter may execute a version-controlled query while the observation
API is unavailable, but only to unblock rebuild development and internal testing.
It must:

- live in the service layer, never a feature screen;
- use a reviewed query recorded in the chart-and-query register;
- return the same domain contract the future API will return;
- have characterization tests and real-data fixtures;
- name its owner, reason and removal condition;
- never accept a Firebase/Remote Config query override;
- require an explicit, dated product exception before it can ship to customers.

Remote Config may control rollout visibility—whether a chart is enabled and for
which organizations. It must not change query text, thresholds, units,
classifications or missing-data meaning. A rollout switch may hide a chart; it may
not silently make it answer a different question.

## 4. Accuracy is a release gate

Accuracy cannot be traded for appearance, speed or implementation cost. A chart
is rejected if the same approved input changes any of these unintentionally:

- timestamp or interval boundary;
- value or category;
- entity identity;
- canonical or displayed unit;
- threshold and whether a boundary is inclusive or exclusive;
- missing, unknown, stale, out-of-stall or unsupported meaning;
- organization timezone, midnight or daylight-saving interpretation;
- level-of-detail meaning.

Every chart specification must declare these items before implementation:

1. Customer question and approved interpretation.
2. Data Science owner and approval date.
3. Query/observation identifier and version.
4. Entity and time-range rules.
5. Canonical unit and allowed display conversions.
6. Thresholds, labels and exact boundary behaviour.
7. Missing, stale, partial and ambiguous-data behaviour.
8. Organization timezone and daylight-saving behaviour.
9. Normal, dense and maximum supported data volumes.

If any item is unknown, the chart remains blocked. The app does not guess.

## 5. Choose the simplest truthful presentation

Use the least complex visual that answers the customer question:

| Customer need | Default presentation |
|---|---|
| One current fact | Number, score card or status—not a chart |
| Events over time | Interval timeline |
| Change over time | Line or area line |
| Compare discrete categories or periods | Bars |
| Parts of a genuine, fixed whole | Composition chart, only when the total is meaningful |
| Relationship between unlike units | Separate aligned charts before considering multiple axes |

Rules:

- One primary message per chart surface.
- Titles say what is measured; axes and legends state units.
- Do not use a pie, donut, percentage ring or progress bar unless the value is a
  genuine part of a known whole.
- Avoid dual axes. If approved as an exception, each series and axis must be
  unambiguous and tested against misreading.
- Avoid decorative gradients, 3D effects, animation and unexplained colour.
- Use chart tokens; never introduce chart-specific colour literals in screens.
- Colour must not be the only carrier of meaning.
- Red and green retain their app-wide status meaning; ordinary series use the
  editorial chart palette.
- Do not copy legacy interaction or visual complexity without proving that it
  helps the customer answer the question.

## 6. Interaction is earned, not automatic

The default chart is readable without touching it. Add interaction only when it
reveals information the customer genuinely needs.

- A tooltip shows the exact timestamp/range, value, unit and series identity.
- Tap is preferred for inspection. Pinch and pan are added only when the visible
  range cannot answer the approved question.
- Zoom must be bounded, clamped and resettable. It must never expose invented
  data outside the available range.
- Gestures must not block page scrolling or compete with native navigation.
- Controls and terminology are consistent across chart families.
- A full-screen view is a separate product decision, not a default feature.
- Selection and zoom may change presentation, never underlying meaning.

## 7. Honest and consistent states

Every chart uses shared, distinguishable states:

- **Loading:** no usable value has arrived yet.
- **Refreshing:** existing data remains visible while a new response is fetched.
- **No data:** the request succeeded and the approved meaning is that no
  observations exist.
- **Out of stall / not applicable:** the chart cannot apply to the selected
  entity or period.
- **Stale:** a previously valid response is shown with its age.
- **Partial:** the backend explicitly reports incomplete coverage and the chart
  can display it without misleading the user.
- **Unavailable:** network, service, malformed response or unresolved ambiguity.
- **Unsupported:** the device/model cannot produce this observation.

These states are not interchangeable. In particular, no data is not zero, out of
stall is not an error, and unavailable is not a low reading.

## 8. Performance and scalability

The backend bounds the data before it reaches the phone. The chart specification
records volumes observed in real data and a justified ceiling; arbitrary giant
fixtures do not replace production evidence.

Required behaviour:

- charts never delay the first useful screen content;
- below-the-fold charts mount only when needed;
- no unbounded request, point count, interval count or time range;
- pan, zoom and tooltips avoid chart-wide React state updates per frame;
- level of detail reduces drawing work without changing totals, boundaries or
  event meaning;
- no interaction freeze over 100 ms on the agreed mid-range Android gate device;
- no crash or unbounded memory growth over repeated navigation;
- memory substantially returns after ten mount/unmount cycles;
- multiple charts on one screen are tested together, not only in isolation.

Performance evidence comes from release-like builds on physical devices. A
simulator proves layout, not customer smoothness. The minimum chart acceptance
set is the agreed mid-range Android plus a physical iPhone; tablet layout remains
a pre-beta check when the chart appears on tablet.

## 9. Shared architecture and code boundaries

- Victory Native/Skia is imported only inside the shared chart adapter boundary.
- Feature screens consume renderer-independent Horcery models such as interval
  events, observation series, thresholds and display metadata.
- Fetching, domain transformation and drawing remain separate modules.
- Shared axes, legends, tooltips, state surfaces, gesture policy and formatting
  are reused; chart-specific meaning is not hidden inside generic UI utilities.
- Do not build a private chart framework. If a new chart family requires another
  substantial bespoke renderer, apply the reversal conditions in the renderer
  decision before continuing.
- The legacy chart package remains read-only evidence. Characterize required
  behaviour before reimplementing it.

## 10. Required evidence and tests

Before code:

- complete `CHART_SPECIFICATION_TEMPLATE.md`;
- add the chart to `CHART_AND_QUERY_REGISTER.md`;
- obtain Data Science approval of meaning/query and product approval of the
  customer question/presentation;
- capture representative real responses safely and anonymize stored fixtures.

Automated evidence:

- contract tests for response version, unit, entity and malformed data;
- pure domain tests for thresholds, intervals, timezone/DST and missing data;
- deterministic fixtures for normal, dense, empty, partial, stale, ambiguous and
  maximum-supported cases as applicable;
- component tests for labels, units, states and interaction boundaries;
- architecture tests preventing screens from importing Victory or Prometheus;
- regression tests for every defect found during implementation.

Device evidence:

- real-data rendering in light and dark;
- realistic dense interaction on the mid-range Android gate device;
- physical-iPhone confirmation;
- repeated navigation/memory check when the chart is stateful or heavy;
- all charts on the destination screen exercised together.

Automated semantics and a readable text summary are required from the start.
Manual VoiceOver and TalkBack validation remains the previously agreed pre-release
shipping gate rather than a renderer-selection or early-slice blocker.

## 11. Change control and ownership

- Data Science approves calculations, queries, thresholds, classifications and
  scientific interpretation.
- Product (Inakshi unless delegated) approves the customer question, wording,
  visual form and whether the chart should exist.
- Engineering owns the contract, implementation, performance and test evidence.
- Backend owns authenticated delivery, versioning and operational reliability of
  the observation API.

A change to a query, threshold, unit, category, aggregation, resolution or
missing-data rule changes what the customer is told. It requires a new version,
review, fixtures and acceptance evidence. It is not a silent configuration edit.

## 12. Definition of done

A chart is complete only when:

- its one-sentence customer question is still answered clearly;
- its specification and `CHART_AND_QUERY_REGISTER.md` entry are current;
- all meaning and ownership fields are approved;
- the app performs presentation work only;
- every visible unit, label, timestamp and state is correct;
- normal, real-heavy and failure fixtures pass;
- the full screen remains smooth on the gate devices;
- light/dark and applicable phone/tablet layouts are verified;
- automated checks pass without warnings;
- evidence is stored and traceable;
- any temporary adapter or exception has an owner and removal condition.

## 13. Exceptions

An exception must name the rule, reason, owner, date, expiry/removal condition and
tests that contain the risk. Convenience and legacy parity are not sufficient
reasons. Undocumented exceptions are defects.
