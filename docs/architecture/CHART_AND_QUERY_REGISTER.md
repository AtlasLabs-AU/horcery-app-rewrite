# Chart and query register

- **Started:** 2026-08-19
- **Standard:** `docs/architecture/CHART_ENGINEERING_STANDARD.md`

This is the controlled inventory of every chart and chart-like score in the
Horcery mobile application. It records whether the meaning, data source, units,
real-data evidence and product presentation are approved. Detailed decisions live
in a completed copy of `CHART_SPECIFICATION_TEMPLATE.md`; this register provides
the fleet-wide view and links to that evidence.

The register will be populated section by section from the Data Science inventory,
legacy reference and real monitor data. Absence from the register is not approval.

## Status meanings

- **proposed:** identified but not assessed.
- **meaning-blocked:** customer question, calculation, units or missing-data rule
  is unresolved.
- **data-blocked:** approved meaning exists but an API/query or representative real
  response is missing.
- **approved:** Data Science and Product approvals are recorded; implementation may
  start.
- **building:** implementation is in progress.
- **verified:** automated and physical-device acceptance evidence passes.
- **shipped:** released under the approved contract version.
- **backfill-required:** implementation predates this standard and cannot be called
  verified until its specification and approvals are recorded.
- **retired:** deliberately removed, with reason in the specification/history.

## Register

| ID | Surface | Customer question | Presentation | Meaning/query approval | Delivery | Units/labels | Real-data evidence | Specification | Status |
|---|---|---|---|---|---|---|---|---|---|
| `horse-activeness-score` | Horse detail status strip | **To approve** | Score card: Low / Normal / High | Latest Data Science query is version-controlled; full specification/approval record still required | Temporary service adapter | Category boundaries exist in code; semantic wording review remains | Tested during implementation; fixture/evidence link to backfill | Not yet created | **backfill-required** |
| `horse-temperature-score` | Horse detail status strip | **To approve** | Temperature score card | Sensor query is version-controlled; full specification/approval record still required | Temporary service adapter | Canonical °C; display °C/°F | Fixture/evidence link to backfill | Not yet created | **backfill-required** |
| `horse-noise-score` | Horse detail status strip | **To approve** | Noise Level score card | Sensor query is version-controlled; full specification/approval record still required | Temporary service adapter | Category thresholds/labels require recorded Data Science approval | Fixture/evidence link to backfill | Not yet created | **backfill-required** |

These three rows record existing implementation honestly; they do not retroactively
approve its meaning. The first register work should complete their specifications,
then inventory the chart surfaces in the Data Science sheet and legacy app.

## Change rule

Every change to customer question, query/observation version, threshold, unit,
category, aggregation, entity selection, time boundary or missing-data meaning must
update both this row and the linked specification in the same reviewed change.
