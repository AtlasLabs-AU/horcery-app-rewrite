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
| `horse-lying-down-daily` | For You → Behavior Tracker → Lying Down (Daily), one row per horse | Did this horse rest as much as it normally does today, and if not, which way? | Cumulative line across the barn day, dashed usual reference, observation-coverage strip, verdict badge | **Partial.** Detection query is Data Science's (PR 1928) but carries a one-character correction they have not signed off; the usual curve and the 25% threshold are the shipping app's, not re-approved. Product approved 2026-08-19 | Temporary rebuild adapter; fixture-backed behind `PREVIEWS.lyingDownSampleData`; **dev-only live preview path (Protos → Live monitors) since 2026-08-20** | Canonical seconds; displayed h/min. Axis from the organization's `chart_start_time` | Measured 2026-08-19 on sm-1275 / sm-1272 / sm-1212: 2–4 bouts a day, 14–189 min a day, 16–31 bouts a week | [`chart-specs/horse-lying-down-daily.md`](chart-specs/horse-lying-down-daily.md) | **building** |
| `horse-lying-down-weekly` | For You → Behavior Tracker → Lying Down (Weekly), one row per horse | Has this horse's week been normal for it? | Bar per day, seven days ending today; that weekday's four-week average marked on each bar; verdict badge for the week | **Partial**, as for the daily chart. The four-week weekday average is the shipping app's `weeklyLyingDownAvg`, not re-approved. Product approved 2026-08-19 | Temporary rebuild adapter; **no live path yet** — fixture-backed behind `PREVIEWS.lyingDownSampleData` | Canonical seconds; displayed h/min. Figure is the week's daily average, excluding today | Same monitors and window as the daily chart | [`chart-specs/horse-lying-down-daily.md`](chart-specs/horse-lying-down-daily.md) §12 | **building** |
| `stall-people-in-stall-daily` | For You → Behavior Tracker → People in Stall (Daily) | How much time did people spend in this stall today, and is that normal for it? | **Decided (Inakshi, 2026-08-19, "Option C"):** cumulative line + dashed usual (Lying Down layout), a visits strip beneath, and a sentence with ACTUAL visit times from the data ("3 visits · 7:05 AM, 12:40 PM, 5:15 PM") — never invented dayparts like "morning". Full spec in progress (GPT) | **meaning-blocked** overall, but the PRODUCT meaning is decided — see "Product decisions" below the table | Not started; will be fixture-backed behind a preview flag | Canonical seconds; displayed h/min | Pending | Spec in progress | **meaning-blocked** |
| `stall-people-in-stall-weekly` | For You → Behavior Tracker → People in Stall (Weekly) | Has this stall had a normal week of human attention? | To follow Lying Down weekly: bar per day, weekday-average markers, week verdict | As above | As above | As above | Pending | Spec in progress | **meaning-blocked** |
| `horse-in-stall-daily` | For You → Behavior Tracker → Horse in Stall (Daily) | How long was the horse in its stall today, and when was it out? | **Decided (Inakshi, 2026-08-20):** cumulative line + dashed usual (Lying Down layout), an in/out strip beneath, captioned by ABSENCE ("Out 8:30 AM – 1:05 PM") — see "Product decisions — Horse in Stall". A partly recorded day withholds both the absence list and the verdict (badge "Incomplete") | **meaning-blocked** overall; legacy `horse_in_stall` queries exist but the Behavior Tracker calculations are unapproved (see "Legacy defects") | Fixture-backed behind `PREVIEWS.horseInStallSampleData`; **no live path** | Canonical seconds; displayed h/min | Measured: 7.6–22.6 h in stall/day, 36–48 transitions/week | Pending | **meaning-blocked** |
| `horse-in-stall-weekly` | For You → Behavior Tracker → Horse in Stall (Weekly) | Has this been a normal week in the stall? | Lying Down weekly unchanged; tapped-day panel names the absences; a partly recorded day draws FADED and is never judged; a week missing any finished day is badged "Incomplete" | As above | As above | As above | As above | Pending | **meaning-blocked** |
| `horse-last-24-hours` | Horse Detail → Summary | How did this horse spend the 24 hours ending at the selected time? | **Decided (Inakshi, 2026-08-21, "Option B"):** one flat composition band + exact duration list drawn from the same values, subtitle "24 hours ending 2:30 PM", unknown time a visible dashed segment with a width floor. Replaces the shipping donut + four progress bars, which could show 25 h in a 24 h day | **Direction approved, query pending.** FE Requirement Gathering 2026-07-23: daily = previous 24 h, own query, approach approved, Anuvathan owns; data team offered (2026-07-10) to return categories directly. The Mobile Queries sheet marks the pie-chart query "Needed" with no replacement recorded; the candidate sits on an unmerged branch held pending Vikum (remote-config impact). Categories arrive as durations — the app derives nothing, and the remainder is always UNKNOWN, never a behaviour. Overflow (>24 h) refuses to draw | Fixture-backed behind `PREVIEWS.last24HoursSampleData`; **no live path** | Canonical seconds; displayed h/min | Legacy defects measured on SM-1272/1275/1212 (25 h day; candidate query triples "resting") | Pending | **data-blocked** |
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
   **Placement decided (Inakshi, 2026-08-20): inside the Behavior Tracker's
   overflow ("three dots") sheet**, alongside Customize and See History — not on
   the card face. **Built 2026-08-20**: "Group by Stalls" / "Group by Horses"
   rows with checkmarks; the card-face "Switch to Stalls" link is gone. The
   preference is session-state for now — persisting it (the shipping app stores
   it in the auth store) is wiring-time work.
4. **Consequence for the rewrite:** the Lying Down sample rows are currently
   horse-named and People in Stall stall-named; when real data lands, both
   default to the stall view, with horse names shown on the row when an
   assignment exists.

## Product decisions — Horse in Stall (Inakshi, 2026-08-20)

1. **Daily is the cumulative total PLUS a when-strip.** The line says how long
   the horse was in the stall; the strip beneath says when, so a low total
   explains itself ("out from 9 to 1") instead of reading as a worry. Same
   shape as People in Stall's visits strip — one interaction learned once.
2. **Entity model is the stall-first rule above**, which is where the two
   readings of this chart ("this horse was indoors" vs "this stall was
   occupied") are reconciled.
3. **The caption names the ABSENCES, not the presences.** People in Stall lists
   when someone came, because a person in a stall is an event. A horse in its
   stall is the resting state, so listing when it was in tells a customer what
   they already assumed; the useful fact is when it was out. Wording:
   `Out 8:30 AM – 1:05 PM` · `Out 8:30 AM – 1:05 PM and 4:20 PM – 5:00 PM` ·
   `Out 4 times · first 8:00 AM, last 4:00 PM` · `Out since 8:30 AM` ·
   `In all day` · `Out all day` · `Partly recorded — time out is unknown` ·
   `We can't tell where the horse was`.
4. **A gap under five minutes is not turnout.** A missed reading or a moment in
   the doorway must not announce an absence.

## Product decisions — row order and the "incomplete" state (Inakshi, 2026-08-20)

1. **Rows sort by tag: unusual to the top, everything below alphabetical.** A
   card can carry twenty stalls, and the two needing attention must not be
   buried mid-list. Sorted per TAB, because Daily and Weekly can disagree about
   the same row. `no-data` is NOT lifted — an open question, noted in
   `src/charts/row-order.ts`: a dead camera is arguably also worth the top.
2. **A partly recorded day is never given a verdict.** Found on device: a row
   said "Some readings are missing" and badged the same day "Usual". The total
   is an undercount, so it was being compared against a whole day's normal.
3. **`incomplete` is a distinct badge from `unknown`.** Both mean "not judged",
   but "No history" (a stall too new to have a normal) is the wrong reason to
   give for a day whose readings have holes in them.

4. **A week missing any finished day is not judged either** (Inakshi,
   2026-08-20, "are we overthinking this?"). The same rule as the day, one
   level up — no minimum-days threshold, because inventing one would be a
   number nobody has approved. The average over the days we DID see is still
   shown with its own count ("a day, over the 4 days we could see"): that is a
   description of what was observed, not a judgement against a normal.
   Deliberately strict — one dead day removes the week's badge. If that proves
   too strict in real barns, that is the moment to ask Data Science for a
   minimum, with evidence.

## Legacy defects: decision not to raise dev-team tickets (Inakshi, 2026-08-20)

Reviewing the shipping app's Behavior Tracker surfaced defects that are live in
production today — most seriously, an absent deviation reading presenting as
**"Usual"**, so an offline camera reassures the customer.

**Decision: no tickets to the dev team, on the explicit condition that the
rewrite does not reproduce them.** That condition is the whole basis of the
decision, so it is a standing obligation on this repo, not a one-off check:
every defect below must stay guarded, and must stay pinned by a test.

1. Absent reading must never render as a reassuring verdict.
2. "Not observed" must stay distinct from an observed zero.
3. A "usual" computed over a window with missing days must not be presented as
   a normal — coverage has to reach the divisor.
4. No silent truncation of the first bucket of the day.
5. Multiple matching series must not be blindly summed (a day cannot exceed 24
   hours); the combination rule needs Data Science sign-off.
6. The history gate must key on the entity actually being judged.
7. Day boundaries come from the organization's timezone and `chart_start_time`,
   never the phone's.
8. No runtime override may change what a chart MEANS without a release and a
   test — Remote Config may show or hide a chart, not redefine it.

## Product decisions — Last 24 Hours (Inakshi, 2026-08-21)

1. **Option B: the flat band.** Segments visibly make one whole, so totals
   cannot contradict — the donut needed repeated progress bars to be readable,
   and the repetition is where the 25-hour bug lived. The exact figures the
   old bars carried remain, as the list under the band.
2. **The category list is open.** REM joins the chart with the sleep work
   (decided 2026-07-23), so a fifth segment must be an addition, not a
   redesign. Pinned by test.
3. **Unknown is a first-class segment** — dashed, hollow, minimum visible
   width. The remainder of the day is never attributed to a behaviour.
4. **A day that sums past 24 hours is refused, not normalised.** Squeezing it
   to fit would hide the upstream error this chart exists to expose.

## QA-confirmed defects closed in the shared interval builder (2026-08-21)

From the Codex review, verified in legacy source, sign-off Inakshi 2026-08-21.
Both lived in `occupancy-timeline.ts`, so both affected every behaviour chart:

1. **An interval no longer spans a hole in the data.** "Present", four silent
   hours, "present" again used to count the silence as presence — while the
   coverage layer reported the same stretch as unobserved. Intervals now close
   at the last observed sample before a gap (measured cadence × 4, floor five
   minutes), including the synthetic close at the window edge.
2. **Sample values compare as numbers.** "1" and "1.0" are the same reading;
   comparing text split one continuous visit into two.

Regression tests in `occupancy-timeline.test.ts` ("defects the shipping app
has") were verified to FAIL against the pre-fix code.

Still open from the same review, logged for wiring time: series identity
validation (does the response belong to the requested stall/horse), naming
every outage in the caption rather than the first, and rollover-spanning
stretches reading as new visits.

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
