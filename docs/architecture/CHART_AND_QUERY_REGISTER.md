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
| `horse-lying-down-daily` | For You → Behavior Tracker → Lying Down (Daily), one row per horse | Did this horse rest as much as it normally does today, and if not, which way? | Cumulative line across the barn day, dashed usual reference, observation-coverage strip, verdict badge | **Partial.** Detection query is Data Science's (PR 1928); the one-character label-case correction is RESOLVED on production evidence (see "Query corrections", 2026-08-23); the usual curve and the 25% threshold are the shipping app's, not re-approved. Product approved 2026-08-19 | Temporary rebuild adapter; fixture-backed behind `PREVIEWS.lyingDownSampleData`; **dev-only live preview path (Protos → Live monitors) since 2026-08-20** | Canonical seconds; displayed h/min. Axis from the organization's `chart_start_time` | Measured 2026-08-19 on sm-1275 / sm-1272 / sm-1212: 2–4 bouts a day, 14–189 min a day, 16–31 bouts a week | [`chart-specs/horse-lying-down-daily.md`](chart-specs/horse-lying-down-daily.md) | **building** |
| `horse-lying-down-weekly` | For You → Behavior Tracker → Lying Down (Weekly), one row per horse | Has this horse's week been normal for it? | Bar per day, seven days ending today; that weekday's four-week average marked on each bar; verdict badge for the week | **Partial**, as for the daily chart. The four-week weekday average is the shipping app's `weeklyLyingDownAvg`, not re-approved. Product approved 2026-08-19 | Temporary rebuild adapter; **no live path yet** — fixture-backed behind `PREVIEWS.lyingDownSampleData` | Canonical seconds; displayed h/min. Figure is the week's daily average, excluding today | Same monitors and window as the daily chart | [`chart-specs/horse-lying-down-daily.md`](chart-specs/horse-lying-down-daily.md) §12 | **building** |
| `stall-people-in-stall-daily` | For You → Behavior Tracker → People in Stall (Daily) | How much time did people spend in this stall today, and is that normal for it? | **Decided (Inakshi, 2026-08-19, "Option C"):** cumulative line + dashed usual (Lying Down layout), a visits strip beneath, and a sentence with ACTUAL visit times from the data ("3 visits · 7:05 AM, 12:40 PM, 5:15 PM") — never invented dayparts like "morning". Full spec in progress (GPT) | **meaning-blocked** overall, but the PRODUCT meaning is decided — see "Product decisions" below the table | Not started; will be fixture-backed behind a preview flag | Canonical seconds; displayed h/min | Pending | Spec in progress | **meaning-blocked** |
| `stall-people-in-stall-weekly` | For You → Behavior Tracker → People in Stall (Weekly) | Has this stall had a normal week of human attention? | To follow Lying Down weekly: bar per day, weekday-average markers, week verdict | As above | As above | As above | Pending | Spec in progress | **meaning-blocked** |
| `horse-in-stall-daily` | For You → Behavior Tracker → Horse in Stall (Daily) | How long was the horse in its stall today, and when was it out? | **Decided (Inakshi, 2026-08-20):** cumulative line + dashed usual (Lying Down layout), an in/out strip beneath, captioned by ABSENCE ("Out 8:30 AM – 1:05 PM") — see "Product decisions — Horse in Stall". A partly recorded day withholds both the absence list and the verdict (badge "Incomplete") | **meaning-blocked** overall; legacy `horse_in_stall` queries exist but the Behavior Tracker calculations are unapproved (see "Legacy defects") | Fixture-backed behind `PREVIEWS.horseInStallSampleData`; **no live path** | Canonical seconds; displayed h/min | Measured: 7.6–22.6 h in stall/day, 36–48 transitions/week | Pending | **meaning-blocked** |
| `horse-in-stall-weekly` | For You → Behavior Tracker → Horse in Stall (Weekly) | Has this been a normal week in the stall? | Lying Down weekly unchanged; tapped-day panel names the absences; a partly recorded day draws FADED and is never judged; a week missing any finished day is badged "Incomplete" | As above | As above | As above | As above | Pending | **meaning-blocked** |
| `horse-last-24-hours` | Horse Detail → Summary | How did this horse spend the 24 hours ending at the selected time? | **Decided (Inakshi, 2026-08-21, "Option B"):** one flat composition band + exact duration list; Unknown is visible; overflow refuses to draw | Shipping, feature history and the Data Science changelog now establish a latest candidate (`up`, filtered in-stall, orientation-based resting; walking removed in the latest note). It remains **meaning-blocked** until the live Firebase value, category wording/calculation, effective-dated horse identity and missing/partial rules are approved | Fixture-backed behind `PREVIEWS.last24HoursSampleData`; target is a backend observation API | Canonical seconds; displayed h/min | Legacy 25-hour contradiction measured on SM-1272/1275/1212; candidate real-data suite still required | [`chart-specs/horse-last-24-hours.md`](chart-specs/horse-last-24-hours.md) | **meaning-blocked** |
| `horse-trends-activeness` | Horse Detail → Summary → Horse Trends | How has this horse's relative activity changed over the last 24 hours / 7 days? | **Decided (Inakshi, 2026-08-21):** 24 h line breaks at monitoring gaps; unitless axis; no comparison pill until approved; 7 d view uses daily observations | Unmerged Data Science candidate `5ca4fc34` supplies explicit 24 h, 7 d and comparison queries. It is **not approval**: live Firebase values, zero/missing semantics, identity, unit/name and exact comparison wording/boundaries remain open | Fixture-backed behind `PREVIEWS.horseTrendsSampleData`; target is a backend observation API | Unitless relative index; no ×1,000 display scaling | Candidate queries recovered; real in/out/offline/assignment and physical-device evidence required | [`chart-specs/horse-trends-activeness.md`](chart-specs/horse-trends-activeness.md) | **meaning-blocked** |
| `horse-trends-rolling` | Horse Detail → Summary → Horse Trends | When did this horse roll in the last 24 hours, and how do the latest seven barn days compare? | **Decided (Inakshi, 2026-08-21):** exact-time event dots + caption for 24 h; seven daily bars with prior-week markers; tap opens Review History; IDs 103/104/105 remain Partial Rolling | Event IDs/grouping are recovered. The shipping endpoint aggregates the short view by hour, so the target still needs a versioned exact-event/count/coverage contract in organization time | Fixture-backed behind `PREVIEWS.horseTrendsSampleData`; target is backend events/observation API | Counts and exact organization-local timestamps | Legacy grouping verified; exact-event, pagination, coverage and DST fixtures pending | [`chart-specs/horse-trends-rolling.md`](chart-specs/horse-trends-rolling.md) | **data-blocked** |
| `horse-activeness-score` | Horse detail status strip | What does the monitor's current relative activity reading indicate? | Score card; exact middle label pending (`Med`/`Medium` in recovered sources, `Normal` in rebuild) | Query matches unmerged Data Science commit `d681f187`; exact value 100 and middle wording conflict between code/changelog/rebuild, so meaning is not approved | Temporary service adapter; target observation API | Unitless index; candidate bands around 100 and 900 | Characterization tests exist; representative real-data evidence pending | [`chart-specs/horse-trends-activeness.md`](chart-specs/horse-trends-activeness.md) §12 | **backfill-required** |
| `horse-temperature-score` | Horse detail status strip | **To approve** | Temperature score card | Sensor query is version-controlled; full specification/approval record still required | Temporary service adapter | Canonical °C; display °C/°F | Fixture/evidence link to backfill | Not yet created | **backfill-required** |
| `horse-noise-score` | Horse detail status strip | **To approve** | Noise Level score card | Sensor query is version-controlled; full specification/approval record still required | Temporary service adapter | Category thresholds/labels require recorded Data Science approval | Fixture/evidence link to backfill | Not yet created | **backfill-required** |

The three status-strip rows record existing implementation honestly; they do not
retroactively approve its meaning. Activeness now has a recovered-source contract;
Temperature and Noise still need completed specifications and approval records.

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

## The "usual" line: what a comprehensive check settled (2026-08-23)

Inakshi asked whether we already had what we needed to decide how the charts'
dashed "usual" reference is calculated. Checked: legacy queries, the team
digest, the Mobile Queries sheet, this repo's docs, and — decisively — the
three production monitors.

**Established, no longer open:**

1. **The legacy average queries WORK.** `dailyLyingDownAvg` run against
   production returns plausible values: 2.32 h (sm-1275), 3.04 h (sm-1272)
   average daily lying down, inside the measured 14–189 min/day range. This is
   not a broken query; it is a query with a coverage assumption.
2. **The work is already assigned.** Anuvathan owns "implement the lying-down
   count / average-value query" (action item, 2026-07-23), lying-down queries
   are FIRST in the agreed build order, and the data team offered on
   2026-07-10 to return computed levels rather than have the app threshold
   them. This is not a new ask; it is a scope note on work in flight.
3. **Prometheus returns a point for EVERY day**, so a day with no readings
   comes back as exactly `0`, not as absent. Measured: 31/31 days returned on
   all three monitors, with 3–5 days a month reading exactly zero.
4. **Those particular zeros are real.** Probing two of them found ~289 raw
   samples across the day — full coverage, the horse simply was not detected
   lying down. So the fixed divisor is not currently harming these monitors.
5. **`up` cannot be used to tell the difference.** It reads 1.0 on all 31 days
   on every series; it measures whether the scrape target answered, not
   whether horse analytics produced readings. (Same defect as the Last 24
   Hours "Offline" category.)

**The conclusion that follows, which is a finding rather than a question:**

Our own charts distinguish "observed zero" from "not observed" by scanning raw
sample timestamps, and that works. But `dailyLyingDownAvg` and
`weeklyLyingDownAvg` do their aggregation INSIDE Prometheus and return one
pre-divided number. By the time the app sees it, the coverage information is
gone — there is no query the app can write, and no metric it can join against,
that recovers how many days went into that divisor.

So the app cannot verify the usual line, however carefully it is written.

**BUILT INSTEAD, same day (Inakshi: "can't you work with what we've got?").**
We do not have to wait. The chart already fetches seven days of raw readings to
draw itself — the same window the daily average covers — so `usualWindowObserved()`
counts the observed days ourselves and downgrades the verdict to `incomplete`
when the window has holes. All three behaviour charts inherit it.

Conservative by construction, and honest about two limits: the windows are
offset by a day (ours is the six finished days on screen, the average's is the
seven before today), and it says nothing about the WEEKLY average, which runs
over four weeks the app never fetches. Both make it under-claim rather than
over-claim. Live data is unblocked for the daily charts.

**Still worth asking for eventually: one extra field, not a
recalculation.** Have the average query return the number of days actually
observed alongside the average. The app then decides whether to trust it —
using the same rule it already applies everywhere else: if the window is
incomplete, describe it, do not judge it. This is a one-number contract change
rather than a redesign, it moves no computation, and it closes the defect
permanently.

## The 25% deviation threshold: measured, and it does not survive (2026-08-23)

Same exercise as the usual line: legacy code, digest, sheet, docs, then the
three production monitors. 45 days of daily lying-down totals per monitor.

**1. No customer has ever seen this badge.** The shipping app renders the
Usual/Unusual pill inside `{false && (...)}` — hard-disabled in
`behavior-tracker-card/index.tsx:77`. The threshold is fetched, computed and
thrown away. So there is no production precedent to preserve and no customer
expectation to protect: we are choosing freely, but also with no field
evidence behind the existing number.

**2. Nobody owns the number.** `DEFAULT_DEVIATION_THRESHOLD = 25` with a
Remote Config override per behaviour. No decision in the digest, no row in the
Mobile Queries sheet, no rationale in code. It is a default that became a
value by never being questioned.

**3. Measured, 25% fires on more than half of ordinary days.**

| Monitor | median day's deviation from its own trailing 7-day mean | days flagged at 25% |
|---|---|---|
| sm-1275 | 52% | **67%** |
| sm-1272 | 33% | **54%** |
| sm-1212 | 48% | **69%** |

**CORRECTION, same day.** The figures above are inflated by days registering
ZERO lying down, which are 7–22% of all days and each score a 100% deviation.
Excluding them:

| Monitor | median deviation | days flagged at 25% |
|---|---|---|
| sm-1275 | 12% | 27% |
| sm-1272 | 19% | 39% |
| sm-1212 | 36% | 64% |

So "two days in three" was wrong; the honest range is **27–64%**, and one
monitor is far calmer than the headline suggested. The conclusion that 25%
over-fires survives — a badge firing on a quarter to two-thirds of days is
still not a signal — but it survives less dramatically, and by a margin that
differs enormously per horse.

**The zero days are the more interesting finding.** Ten of 46 days on sm-1275
register no lying down at all, and probing two of them found ~289 raw samples
across the day — the monitor was reporting. So either those horses genuinely
did not lie down (which is exactly what a welfare badge SHOULD flag, and means
excluding them above understates the case) or the detection missed it (a
data-quality question that belongs with Data Science and undermines any
threshold built on this metric). Nothing in our data distinguishes the two.

**4. No fixed percentage rescues it.** Requiring a minimum absolute gap as
well (the standard fix for ratios at low values) barely helps: 50% AND a
60-minute gap still fires on 28–36% of days. To reach one day in ten you need
roughly 100–150%, and the right figure differs per horse (96% on one monitor,
151% on another).

**5. The shape is wrong, not just the value.** Each horse's own day-to-day
spread is **39–65% of its own mean**. A single global percentage cannot
separate horses whose natural variation differs that much. Comparing instead
against the horse's own spread self-calibrates:

| Rule | days flagged |
|---|---|
| beyond 1.5 standard deviations | 18–38% |
| beyond 2 standard deviations | 10–21% |
| beyond 2.5 standard deviations | **5–10%** |

**6. Weekly is meaningfully calmer than daily** — median deviation 13–36%
against 42% daily, and 25% flags 20–60% of weeks. Better, still too often on
one monitor. (Small sample: five to six weeks per monitor.)

**Conclusion.** The 25% does not survive for the daily view on any reading of
this evidence, and it is unowned. Reporting these numbers to Data Science is
worth doing regardless — it is the field evidence their threshold decision
needs, and we have it and they do not.

**DECIDED (Inakshi, 2026-08-23): keep it hidden for now.** Implemented as
`DEVIATION_VERDICTS_APPROVED = false` in `lying-down-badge.ts`, a code
constant rather than a runtime flag so that changing the meaning of a welfare
badge costs a review and a test run.

Applied to BOTH tabs, not just daily — the weekly badge rests on the same
unowned number — and to the chart LINE COLOUR as well: an ochre line says
"outside normal" as plainly as the badge does, so withholding the words while
keeping the colour would only move the unapproved claim somewhere harder to
argue with.

What still shows: the figure, the average, the dashed usual line, and the
honest data states (`No data`, `No history`, `Incomplete`). The line is
between describing what was observed and judging what it means.

**One place the hidden verdict still speaks, flagged rather than assumed:**
row ORDER. `sortRowsByAttention` floats Low/High rows to the top of the card,
and it still reads the real verdict. That is arguably useful — it surfaces the
rows worth a look — but by the same argument used for the ochre line it is the
unapproved judgement expressed as position. Left in place pending Inakshi's
call; if it goes, the card falls back to plain stall order.

## Several streams for one stall: measured, then unioned (2026-08-23)

Inakshi: "refusing to draw is not an option." Correct — a blank chart helps
nobody, and the refusal was a placeholder for a decision, not a decision.

**FIRST MEASUREMENT WAS INVALID — recorded so the mistake is not repeated.**
The original evidence (five concurrent `id` streams on sm-1275, June) was
gathered with the RAW metric `horse_sitting_per_id`. Those historical streams
carry **no `animal_type` label at all**, so the query the app actually runs —
`horse_sitting_per_id{animal_type="horse"}` — returns **zero** of them.
Verified 2026-08-23: unfiltered 5 series at that instant, filtered 0. The
conclusion happened to survive; the evidence did not support it. Caught by
Codex review.

**Correct measurement, using the query the app runs.** Over 90 days:

| Monitor | distinct `id` under `animal_type="horse"` |
|---|---|
| sm-1275 | 1 |
| sm-1212 | 1 |
| **sm-1272** | **4** (ids 0, 1, 2, 3) |

So multiple streams DO occur under the production contract — on sm-1272,
which the review generalised past by checking only sm-1275.

**The decisive measurement**, sm-1272, 8–12 July, filtered query, one-minute
sampling: three streams present; **784 minutes** where one reported lying
down; **0 minutes** where two reported it simultaneously. The union therefore
equals the legacy sum on this data, and cannot exceed a day.

Exact reproduction: `clamp_max(round(avg_over_time(horse_sitting_per_id{animal_type="horse"}[1m:30s])),1)`
against `n1.dat.use.wg0.horcery.com/sm-1272`, `start=2026-07-08T00:00 local`,
`end=2026-07-12T00:00 local`, `step=60`.

**Decision: union the streams within a `seriesKey` group** — at each instant
the subject is present if any stream says so. Three reasons, in order of
weight:

1. It cannot produce the shipping app's impossible day. A union of intervals
   cannot exceed the day, whatever the streams do.
2. It is IDENTICAL to the shipping app's sum on every day measured, because
   the streams never overlap — so nothing about the numbers surprises anyone.
3. It keeps the rest that picking one stream throws away.

**Union is OPT-IN per caller** (`combineSameKeyStreams`, default off). Taking
the highest value at each instant is correct only for a BINARY signal, where
the highest of several yeses is still one yes. It is wrong for a counted one:
two streams carrying two people and three people mean five, not three. The
shared occupancy builder serves both kinds, so Lying Down and Horse in Stall
opt in and People in Stall does not — pinned by test. (Codex review, 2026-08-23:
the rule was originally added to the generic builder for every caller.)

**Recorded as our reading, for Data Science to confirm**, along with the
question their contract still owes: what does `id` mean, and why do five of
them exist simultaneously on one camera? That may be a pipeline defect rather
than an aggregation question, and these numbers are the evidence for it.

## Last 24 Hours and Activeness: evidence kept, conclusions withdrawn (2026-08-23)

The measurements below stand. The conclusions originally drawn from them in
commit `d2c095c` were overclaimed and are withdrawn. Both charts stay
**meaning-blocked**. Recorded in full because the errors are instructive.

### What was measured, and still holds

**Posture partitions observed in-stall time.** sm-1272, 7 days, 1,847 aligned
samples: sitting and standing were never both above 0.5 (0 samples) and never
both below (0 samples); 87% standing, 13% sitting. Reproduced on sm-1275 and
sm-1212.

Exact reproduction: `horse_sitting_per_id{animal_type="horse",id="0"}` and
`horse_standing_per_id{...}` against `n1.dat.use.wg0.horcery.com/sm-1272`,
7 days to 2026-08-23, `step=300`, compared at 0.5.

**The silent-zero fallback is real.** The activeness query ends
`or on(instance) (activeness_in_stall * 0)`. When the main branch drops out —
which it does whenever the horse is out of the stall — this supplies zeros, so
the chart draws a confident flat line rather than saying it has nothing. This
is a genuine defect and the one part of the original diagnosis that survives.

### What was overclaimed, and why each was wrong

**1. "Resting = sitting, Awake = standing" — WITHDRAWN.** The data shows
posture, not awareness. The team's own record (digest, 2026-07-23) anticipates
**sitting-active**, **standing-resting** and **standing-active** as distinct
states, which contradicts the mapping directly. A horse can rest standing; that
is ordinary equine behaviour. Converting a posture measurement into a
sleep/wake conclusion crosses the ownership line the chart standard draws.

**2. "Out of stall = absent readings" — WITHDRAWN.** The `_per_id` readings
stop for several reasons: horse out, horse present but untracked, identity
unassigned, monitor offline. Treating absence as "out" is the
missing-data-as-fact failure this whole standard exists to prevent, and I wrote
it into the register while claiming to guard against it.

**3. "The behaviour codes cannot be read off the data" — FALSE.** They are
published in the monitors' own metadata endpoint, which I did not check:

| Code | Meaning | | Code | Meaning |
|---:|---|---|---:|---|
| -1 | unknown | | 4 | sitting down |
| 0 | standing | | 5 | standing up |
| 1 | sternal | | 6 | sternal to lateral |
| 2 | lateral | | 7 | lateral to sternal |
| 3 | rolling | | | |

There is **no REM category**. The earlier note that this is "probably where REM
will arrive" was speculation and is removed.

**4. "The activeness answer depends on how the chart asks" — FALSE.** An
omitted subquery resolution defaults to the server's global evaluation
interval, not to the outer `query_range` step. Tested properly — same window
10:00–12:00, steps 60 and 300 — the 25 shared timestamps returned **byte-identical
values**. The original comparison changed the window AND the step together and
blamed the step.

**5. "A 300 s step collapses `deriv()` to one point, giving 100% zeros" —
FALSE.** Re-tested over a 6-hour window at both steps: 0 zeros at either. The
zeros originally seen came from a window where the horse was OUT of the stall,
so the `* 0` fallback fired — finding 3 above, not a resolution problem.

**6. "Adding `:15s` fixes it" — WITHDRAWN.** It does not fix, it redefines.
The query uses `sum_over_time`, so a finer resolution puts more samples inside
the sum and mechanically raises the result (sm-1272 0.0032 → 0.0159). Choosing
between summing, averaging, normalising per second, or a fixed approved
resolution is exactly the meaning decision that belongs to Data Science.

**7. The wrong query may have been tested at all.** The legacy app reads
`TREND_LAST_24_HOURS_QUERY` from Firebase Remote Config and falls back to the
in-source query only when that is empty
(`trend-widget-v2/activeness/index.tsx:160`). Without the production Remote
Config values, everything above tested the fallback, not necessarily what
customers receive.

### Two further facts the metadata settles

- These metrics are **fractions of the scrape window (0.0–1.0)**, not booleans.
  The partition result above depends on comparing at 0.5, which is a threshold
  choice made here and not an approved one.
- `activeness_in_stall` is documented as "difference between the current and
  previous activeness value" — already a first difference. The query then takes
  `deriv(deriv(...))` of it, so the charted quantity is effectively a THIRD
  derivative. Whatever it is named, it is further from "how active is this
  horse" than the name suggests.

### Standing position

Last 24 Hours: **meaning-blocked**. Activeness: **meaning-blocked**, badge
hidden, axis unlabelled. The source reconciliation on 2026-08-27 narrowed the
unknowns substantially without pretending that an unmerged candidate is approved.
The exact gates now live in the linked specifications.

### Recovered current-app contracts (2026-08-27)

The shipping repository and its history contain more of the answer than the
earlier register recorded:

1. **Last 24 Hours:** active code confirms the runtime Firebase key and phone-side
   subtraction; feature commit `ade60d7b` plus the Prometheus Query Changelog
   provide the newer orientation-based candidate. The latest changelog removes
   walking. The live Firebase value and formal category/identity approval remain.
2. **Activeness trend:** feature commit `5ca4fc34` provides explicit hourly,
   daily and comparison queries. Its `or vector(0)` still merges missing/out with
   zero; the changelog and code also disagree at comparison boundaries/wording.
3. **Activeness score:** commit `d681f187` matches the rewrite query. The legacy
   code says value 100 is `Med`; changelog prose puts 100 in Low; the rewrite says
   `Normal`. This is a narrow approval question, not a reason to rediscover the
   query.
4. **Rolling:** event IDs are stable (102; and 103/104/105 grouped as Partial
   Rolling). The active short-range endpoint requests hourly aggregation, so it
   cannot supply the exact timestamps the approved rebuild design requires.
5. **Tracking identity:** Horse Detail fetches active horse/stall relations and
   takes `data[0].stall`; Prometheus candidates then filter an adult horse signal,
   not the selected horse ID. This is an implicit one-horse-per-stall assumption,
   not a safe identity contract. The target must bind observations to horse ID and
   effective assignment period and fail closed on ambiguity.

Canonical reconciliations:

- [`chart-specs/horse-last-24-hours.md`](chart-specs/horse-last-24-hours.md)
- [`chart-specs/horse-trends-activeness.md`](chart-specs/horse-trends-activeness.md)
- [`chart-specs/horse-trends-rolling.md`](chart-specs/horse-trends-rolling.md)

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

**Status: RESOLVED as a matter of fact (Inakshi, 2026-08-23 — "make the
correction yourself").** Re-verified against production that day: on sm-1275
and sm-1272, `animal_type="Horse"` returns 0 series while `"horse"` returns a
full series, and `count by (animal_type) (horse_sitting_per_id)` shows the
metric carries exactly one label value: lowercase `horse`. The data itself is
the authority on what its labels are; there is nothing left to confirm. This
app uses the lowercase form everywhere.

What remains is a courtesy, not a question: PR 1928 in the dev team's repo
still carries the capital-H form, and merged as written THEIR feature ships
reading zero forever. Whether to mention it to them is Inakshi's call — it is
outside the no-tickets decision, which covered defects our rewrite makes moot;
this one breaks a feature of theirs we don't inherit.

## Change rule

Every change to customer question, query/observation version, threshold, unit,
category, aggregation, entity selection, time boundary or missing-data meaning must
update both this row and the linked specification in the same reviewed change.
