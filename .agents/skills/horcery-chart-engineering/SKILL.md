---
name: horcery-chart-engineering
description: Build, change, review, or investigate charts and chart-like scores in the Horcery Expo app while preserving approved meaning, honest data states, renderer boundaries, tests, and physical-device evidence.
---

# Horcery chart engineering

When selected, use this skill for Horcery graphs, timelines, distributions,
trends, composition visuals, progress visuals, and chart-like scores. It can
support both new work and reviews of existing work without replacing verified
repository evidence or engineering judgement.

## Start from the controlled sources

Work from the `horcery-app-rewrite` repository root. Read these files before
proposing or changing chart behaviour:

1. `PRINCIPLES.md`
2. `docs/architecture/CHART_ENGINEERING_STANDARD.md`
3. `docs/architecture/CHART_AND_QUERY_REGISTER.md`
4. The chart's completed specification under `docs/architecture/chart-specs/`
5. `docs/architecture/CHART_REVIEW_CHECKLIST.md`
6. `docs/decisions/CHART_RENDERER_DECISION.md` when renderer capability,
   performance, dependencies, or a new chart family is involved

Create a specification from
`docs/architecture/CHART_SPECIFICATION_TEMPLATE.md` and update the register when
the chart does not yet have current entries. Do not treat implementation,
fixtures, legacy behaviour, or an agent's summary as approval.

Before recording an answer as pending or unknown, search every applicable source
listed in `AGENTS.md` under **Check before you record ignorance**. Cite the source
that establishes each query, unit, threshold, timezone, entity-selection rule,
and missing-data meaning.

## Use the approved renderer generation

- Horcery's approved renderer is `victory-native` **41.26.0** on Skia.
- The authoritative upstream source is
  `https://github.com/FormidableLabs/victory-native-xl`.
- Do not use examples from the older
  `https://github.com/FormidableLabs/victory` generation. Legacy APIs such as
  `VictoryChart` are not the Horcery renderer API.
- Prefer the installed package types and the existing adapters in
  `src/components/charts/` as the version-matched API reference.
- Do not add, remove, or upgrade Victory, Skia, Expo, Reanimated, or Gesture
  Handler as part of ordinary chart work. A renderer-stack change requires a
  separate decision and physical-device regression evidence.

Victory and Skia imports stay inside `src/components/charts/`. Feature screens
consume renderer-independent Horcery presentation models. Screens never author
PromQL, parse raw Prometheus responses, invent thresholds, or infer scientific
meaning.

## Decide what kind of work is authorised

### Production-bound work

Implementation may begin only when the specification and register record the
required Data Science and Product approvals. Preserve the approved observation,
contract version, entity, time range, canonical unit, thresholds, timezone,
missing-data rules, and supported volume.

### Dev-only preview or spike

Unapproved work may proceed only when the task explicitly authorises a preview
or spike. Keep it read-only, visibly dev-only, fixture-backed or behind the
approved preview boundary, and record the unresolved meaning and removal
condition. Never describe preview evidence as production verification.

### Review or investigation

Reviews are read-only unless the user also asks for fixes. Trace the complete
API/query to domain model to chart to interaction path, then work through every
applicable item in `CHART_REVIEW_CHECKLIST.md`. Report findings in severity order
with file and line evidence.

## Build in this order

1. Write the one customer question and confirm a chart is clearer than a number,
   sentence, or table.
2. Establish the approved contract and run the approved query against
   representative real data using read-only access.
3. Store safe deterministic fixtures for normal, realistic dense, empty,
   partial, stale, ambiguous, DST/barn-boundary, and justified maximum cases as
   applicable.
4. Validate and transform the contract in a pure domain module under
   `src/charts/` or the appropriate domain/service boundary. Preserve null,
   missing, partial, stale, and out-of-stall states; never collapse any of them
   into zero.
5. Draw only the renderer-independent presentation model in a shared adapter
   under `src/components/charts/`. Reuse existing state surfaces, tokens, axes,
   formatting, and interaction patterns before adding another abstraction.
6. Add contract, domain, component, architecture, and defect-regression tests.
   Keep chart meaning testable without mounting Victory.
7. Run the repository check gate. Then verify the complete destination screen,
   with all its charts mounted together, in light and dark and at default, one
   larger, and one accessibility text size.
8. Use release-like builds on the agreed physical mid-range Android device and a
   physical iPhone. Confirm the chart visibly responds before trusting frame
   measurements; simulators do not certify shipping performance.
9. Update the specification and register with the results, build identifiers,
   evidence paths, unresolved risks, owners, and removal conditions.

## Stop instead of guessing

Stop production implementation when meaning, units, thresholds, ownership,
entity selection, timezone, missing-data behaviour, or query provenance remains
unresolved after the required source search. Explain the precise blocker and the
decision or evidence needed.

Also stop and escalate when:

- several series or sensors match and the approved combination rule is absent;
- a proposed calculation changes domain meaning on the phone;
- a new chart family needs substantial bespoke drawing or a second private
  chart framework;
- the real response exceeds the approved volume, range, or contract shape;
- physical evidence contradicts automated performance results.

Never turn missing into zero, interpolate an unapproved gap, silently select the
first series, colour an unapproved verdict, or allow Remote Config to redefine a
query or threshold.

## Completion and handoff

Do not call a chart complete because it renders or because tests pass. It is
complete only when the specification and register are current, approved meaning
is preserved, honest states and accessibility are present, automated checks pass,
and traceable physical-device evidence covers the final screen.

Report to Inakshi using the headings required by `PRINCIPLES.md`: **What I did**,
**What I found**, **Decisions for you**, and **Next**. Separate completed work,
partial work, blockers, and untested items plainly.
