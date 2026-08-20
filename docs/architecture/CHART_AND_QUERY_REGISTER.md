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
| `horse-lying-down-daily` | For You → Behavior Tracker → Lying Down (Daily), one row per horse | Did this horse rest as much as it normally does today, and if not, which way? | Cumulative line across the barn day, dashed usual reference, observation-coverage strip, verdict badge | **Partial.** Detection query is Data Science's (PR 1928) but carries a one-character correction they have not signed off; the usual curve and the 25% threshold are the shipping app's, not re-approved. Product approved 2026-08-19 | Temporary rebuild adapter; **no live path yet** — fixture-backed behind `PREVIEWS.lyingDownSampleData` | Canonical seconds; displayed h/min. Axis from the organization's `chart_start_time` | Measured 2026-08-19 on sm-1275 / sm-1272 / sm-1212: 2–4 bouts a day, 14–189 min a day, 16–31 bouts a week | [`chart-specs/horse-lying-down-daily.md`](chart-specs/horse-lying-down-daily.md) | **building** |
| `horse-lying-down-weekly` | For You → Behavior Tracker → Lying Down (Weekly), one row per horse | Has this horse's week been normal for it? | Bar per day, seven days ending today; that weekday's four-week average marked on each bar; verdict badge for the week | **Partial**, as for the daily chart. The four-week weekday average is the shipping app's `weeklyLyingDownAvg`, not re-approved. Product approved 2026-08-19 | Temporary rebuild adapter; **no live path yet** — fixture-backed behind `PREVIEWS.lyingDownSampleData` | Canonical seconds; displayed h/min. Figure is the week's daily average, excluding today | Same monitors and window as the daily chart | [`chart-specs/horse-lying-down-daily.md`](chart-specs/horse-lying-down-daily.md) §12 | **building** |
| `stall-people-in-stall-daily` | For You → Behavior Tracker → People in Stall (Daily) | How much time did people spend in this stall today, and is that normal for it? | **Decided (Inakshi, 2026-08-19, "Option C"):** cumulative line + dashed usual (Lying Down layout), a visits strip beneath, and a sentence with ACTUAL visit times from the data ("3 visits · 7:05 AM, 12:40 PM, 5:15 PM") — never invented dayparts like "morning". Full spec in progress (GPT) | **meaning-blocked** overall, but the PRODUCT meaning is decided — see "Product decisions" below the table | Not started; will be fixture-backed behind a preview flag | Canonical seconds; displayed h/min | Pending | Spec in progress | **meaning-blocked** |
| `stall-people-in-stall-weekly` | For You → Behavior Tracker → People in Stall (Weekly) | Has this stall had a normal week of human attention? | To follow Lying Down weekly: bar per day, weekday-average markers, week verdict | As above | As above | As above | Pending | Spec in progress | **meaning-blocked** |
| `horse-activeness-score` | Horse detail status strip | **To approve** | Score card: Low / Normal / High | Latest Data Science query is version-controlled; full specification/approval record still required | Temporary service adapter | Category boundaries exist in code; semantic wording review remains | Tested during implementation; fixture/evidence link to backfill | Not yet created | **backfill-required** |
| `horse-temperature-score` | Horse detail status strip | **To approve** | Temperature score card | Sensor query is version-controlled; full specification/approval record still required | Temporary service adapter | Canonical °C; display °C/°F | Fixture/evidence link to backfill | Not yet created | **backfill-required** |
| `horse-noise-score` | Horse detail status strip | **To approve** | Noise Level score card | Sensor query is version-controlled; full specification/approval record still required | Temporary service adapter | Category thresholds/labels require recorded Data Science approval | Fixture/evidence link to backfill | Not yet created | **backfill-required** |

These three rows record existing implementation honestly; they do not retroactively
approve its meaning. The first register work should complete their specifications,
then inventory the chart surfaces in the Data Science sheet and legacy app.

## Product decisions — People in Stall (Inakshi, 2026-08-19)

Recorded here so the in-progress specification inherits them rather than
re-asking:

1. **Occupied time, not person-time.** Two people in the stall for ten minutes
   is ten minutes. Matches what the shipping app measures and what customers
   already see.
2. **The stall is the entity.** People visit a stall; the horse living in it can
   change. Measured per stall, presented on whichever view (horse or stall) the
   customer is using.
3. **Same badge system as Lying Down.** Usual / Low / High against this stall's
   own normal, no verdict without enough history (7 days daily, 4 weeks weekly),
   deviation coloured ochre, severity never coloured, missing data never zero.

Customer question (Inakshi, same date): "how much time did people spend inside a
stall" — time with at least one person present, never a headcount.

4. **Presentation is Option C with actual times.** The Lying Down row layout —
   cumulative line against the dashed usual — plus a strip showing WHEN people
   were there, captioned with real clock times from the query's timestamps.
   Dayparts ("morning", "evening") are forbidden: no one has defined where they
   start, and inventing the boundary is unapproved meaning. Many visits collapse
   to "8 visits · first 6:50 AM, last 9:10 PM". A monitor that stopped reporting
   says so with its offline time ("monitor offline since 9:20 AM"), never a zero.
5. **Weekly reuses the Lying Down weekly design unchanged** — bar per day,
   hollow today, weekday-average markers, one badge for the week.

## Product decisions — entity model for all behaviour charts (Inakshi, 2026-08-20)

Applies to Lying Down, People in Stall, and Horse in Stall alike. Recorded
verbatim in intent because it reverses an assumption two charts were built on:

1. **The stall (camera) is the primary entity, and the default view.**
   Customers sometimes forget to assign a horse to a stall; a horse-first list
   would silently hide that camera's data. Showing every camera/stall is also
   the familiar pattern from other camera systems. When a horse IS assigned,
   its data rides along on the stall row.
2. **The horse view exists for stitching, not browsing.** Its purpose is to
   follow one horse across stall moves (and, in the future, multiple horses in
   one stall — not supported today). It is the secondary view.
3. **The switch is a subtle, sticky preference — not a prominent per-card
   toggle.** Customers are not expected to flip it routinely; it behaves like a
   main system preference. (The shipping app's prominent "Switch to Stalls"
   button on the card is therefore not the pattern to copy.)
4. **Consequence for the rewrite:** the Lying Down sample rows are currently
   horse-named and People in Stall stall-named; when real data lands, both
   default to the stall view, with horse names shown on the row when an
   assignment exists.

## Query corrections not yet accepted upstream

Recorded here because the register is the controlled inventory of queries as well
as charts, and because a correction living only in a conversation is a correction
that gets shipped over.

### `horse-lying-down-daily` — detection, label-value case

PR 1928 on `84-horcery-app-react-native` replaces the old `horse_sitting` metric
with the per-horse one, as:

```promql
round(clamp_max(avg_over_time(horse_sitting_per_id{animal_type="Horse"}[1m30s:30s] offset -1m),1))
```

`animal_type="Horse"` matches nothing. The live label value is lowercase
`horse`. Checked against sm-1275, sm-1272 and sm-1212 on 2026-08-19: the query
above returns **zero series on all three**, while the same query with `"horse"`
returns data on all three. Merged as written, the app would report "0 minutes
lying down" indefinitely — no error, no empty state, just a confident wrong
number about a welfare metric.

The corrected form, which this app uses:

```promql
round(clamp_max(avg_over_time(horse_sitting_per_id{animal_type="horse"}[1m30s:30s] offset -1m),1))
```

**Status:** not approved by Data Science. Queries are theirs to define, so this
stands as a recorded exception (specification §11-E1) rather than as a decision
we made, until they confirm it.

## Change rule

Every change to customer question, query/observation version, threshold, unit,
category, aggregation, entity selection, time boundary or missing-data meaning must
update both this row and the linked specification in the same reviewed change.
