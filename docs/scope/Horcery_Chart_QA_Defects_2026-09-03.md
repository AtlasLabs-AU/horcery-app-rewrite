# Chart QA — confirmed defects in the rewrite (2026-09-03)

**Why this exists.** A GPT-run "master QA" pass over the chart families
reported a list of accuracy and missing-data problems. Inakshi asked for that
report to be checked. This document is the result: every claim was read
against the code at commit `52943d2` (branch `rnd`), the project gate was
re-run (72/72 suites, 660/660 tests, TypeScript and ESLint clean — the
report's gate claim is exact), and the daylight-saving claim was proved by
executing the date library against real transition dates rather than by
reasoning.

Nothing in this document changes code. Each ticket names the file and line,
what a customer would be told, the fix, and the test that should fail today
and pass afterwards. Line numbers are as of `52943d2`.

**Scope note that governs urgency.** Only the three status-strip score cards
(Activeness, Temperature, Noise Level) read live data today. Every Behavior
Tracker chart, Last 24 Hours and Horse Trends currently draw fixtures behind
development-only `PREVIEWS` flags and are labelled "Sample data — not this
horse" on screen. The defects below in those charts are therefore foundation
faults that live data will inherit, not things anyone is being told about a
horse now.

**What is NOT here.** The report's "not approved by Data Science" findings
(Activeness bands and middle word, Noise unit and 40/60 bands, Temperature
approval record, the Lying Down stream-merge rule, the Last 24 Hours
categories, the 25% deviation threshold) are already recorded, chart by chart,
in `../architecture/CHART_AND_QUERY_REGISTER.md` with statuses
`meaning-blocked` / `backfill-required`. They are the project's known state,
not new findings, and are not repeated as tickets.

---

## Priority order, in one line

Fix **CQ-1** (daylight saving) and **CQ-2 to CQ-5** (the missing-data wording)
in the shared layer first — they are a handful of lines each and every chart
inherits them — then the live score cards **CQ-6 to CQ-9**, then the rest.

---

## Shared engine — every chart inherits these

### CQ-1 · P1 · Daylight saving moves the barn-day boundary by an hour

**Status:** fixed 2026-09-03. One shared wall-clock boundary helper now covers
chart rows, Horse Trends event bucketing and the live Prometheus request window.
The three daily chart axes now also derive their labels from the actual zoned
day span, so their printed times stay aligned with 23-hour and 25-hour rows.
Spring-forward, fall-back and fractional-start regressions are pinned.

**Where:**
- `src/charts/occupancy-timeline.ts:278` — `calendarDate(...).plus({ hours: dayStartHour })`
- `src/charts/occupancy-timeline.ts:270` — `now.minus({ hours: dayStartHour })` (which day "now" is in)
- `src/charts/horse-trends.ts:134-136` — `barnDayKey` uses `.minus({ hours: dayStartHour })`

**What happens:** Adding or subtracting *hours* moves by real elapsed time, so
across a clock change it lands on the wrong wall-clock hour. Verified with the
project's own Luxon build in `America/Chicago`, barn day starting 06:00:

| Date | Intended cut | Actual cut |
|---|---|---|
| 8 March 2026 (spring forward) | 06:00 | **07:00** |
| 1 November 2026 (fall back) | 06:00 | **05:00** |

In `occupancy-timeline` the whole seven-row chart is affected when the
*selected* date is a transition day, because the other rows are walked from
that (wrong) start with calendar-safe `minus({ days })`. In `horse-trends`,
every event between 06:00 and 07:00 on 8 March is counted in the *previous*
barn day, and on 1 November events from 05:00 are counted in the new day an
hour early. Daily and weekly totals change; a row's cumulative line starts
from the wrong minute.

**Fix:** derive the boundary in wall-clock terms — `startOf('day').set({
hour, minute })` for the whole-hour case (the fractional `chart_start_time`
needs `set({ hour: Math.floor(h), minute: Math.round((h % 1) * 60) })`) — and
for `barnDayKey`, compare the instant's local time-of-day with the start hour
rather than shifting the instant. `positionInDay` already reasons about
`utcOffsetChange`; the day *bounds* need the same care.

**Test to pin it:** `occupancy-timeline.test.ts` and `horse-trends.test.ts`:
build with `selectedDate: '2026-03-08'` / `'2026-11-01'`, zone
`America/Chicago`, `dayStartHour: 6`, and assert every `day.start` formats to
`06:00` in zone; assert an event at 06:30 on 8 March buckets to `2026-03-08`.
Both fail today.

### CQ-2 · P1 · Corrupt readings count as proof the day was watched

**Status:** fixed 2026-09-03. Coverage and freshness now ignore non-finite
Prometheus values through one shared predicate used by interval building and
all three coverage scans. Regressions pin an all-`NaN` current barn day as
unobserved with no duration or headline, and mixed valid/corrupt days as
incomplete in both Horse in Stall and People in Stall.

**Where:** the original defect was in `src/charts/lying-down.ts:395-401`; the
same timestamp-only scan also existed in `horse-in-stall-behavior.ts` and
`people-in-stall-behavior.ts`.

**What happens:** Coverage ("was the monitor reporting?") is derived from
timestamps alone. The interval builder, by contrast, drops or ignores any
value that is not a finite number (`occupancy-timeline.ts` merge step, and
`Number(raw)` comparisons in `intervalsForDay`). So a day whose readings are
all `NaN` — which Prometheus does emit as text — is marked `observed` with
`totalSeconds = 0`, and the row says "0 min lying down today" or, on Horse in
Stall, "Out all day", about a day we know nothing about. This is the exact
failure the file's own comments call "the single most damaging mistake this
chart can make", and it is the sibling of the bug fixed on 2026-08-23
("scanning MORE than is read").

**Fix:** scan coverage over the same samples the intervals are built from —
skip any sample whose value is not a finite number, in both the coverage loop
and the cadence measurement.

**Tests that pin it:** `lying-down.test.ts` covers an all-corrupt day;
`horse-in-stall-behavior.test.ts` and `people-in-stall-behavior.test.ts` replace
a midday stretch with corrupt readings and require a monitoring gap plus an
`Incomplete` verdict.

### CQ-3 · P1 · An unwatched today reads "0 min so far"

**Where:** `src/components/charts/weekly-day-detail.ts:89` — `formatDuration(day.totalSeconds ?? 0)`, five lines *before* the `totalSeconds === null → "No data"` branch at `:94`.

**What happens:** Today is handled first, and the `?? 0` turns "we do not
know" into zero. A monitor that has been offline since the barn day began
shows `Today · Ongoing / 0 min so far` on the tapped-bar panel. The
file's own table (`:28`) does not have a row for this case.

**Fix:** if `day.totalSeconds === null`, return `{ title: 'Today · No data' }`
regardless of `isToday`. Add the row to the table.

**Test to pin it:** `weekly-day-detail.test.ts`: `isToday: true, totalSeconds:
null` → title contains "No data", no "so far".

### CQ-4 · P1 · "Out all day" on a day that was only partly recorded

**Where:** `src/components/charts/weekly-day-detail.ts:100-110` — the
"no stretches seen" branch (`:100`, detail "Out all day" at `:103`) is tested
*before* the `coverage === 'partial'` branch (`:110`).

**What happens:** A monitor reports for twenty minutes at 06:00, the horse is
not in the stall during those minutes, then the monitor dies for the day. The
day is `partial`, has zero in-stall stretches and a non-null total of 0, so the
panel says `Monday · 0 min / Out all day` — a confident statement about a day
that was 98% unobserved. The same ordering gives People in Stall "No visits"
for a day that was barely watched. The GPT report attributed this to invalid
readings; it is simply branch order.

**Fix:** move the `partial` check above the zero-stretches check, and give the
partial branch a word — the daily caption already says "Partly recorded", the
bar is already faded (`victory-lying-down-adapter.tsx:33,206`); the panel is
the one surface that stays silent.

**Test to pin it:** `weekly-day-detail.test.ts`: `coverage: 'partial', bouts:
[], totalSeconds: 0` → detail is not "Out all day" / "No visits".

### CQ-5 · P2 · Weekly view: "Incomplete" overwritten by "No history"

**Where:**
- `src/charts/horse-in-stall-behavior.ts:202-203`
- `src/charts/people-in-stall-behavior.ts:173-174`

**What happens:** Both weekly builders take the summary from
`buildLyingDownWeekly` and, if the entity is too new for a weekly normal,
replace *whatever* verdict it had with `'unknown'` — including `'incomplete'`.
A new stall whose week has holes in it is badged "No history" (a statement
about the stall's age) instead of "Incomplete" (a statement about the data).
The *daily* path in `people-in-stall-behavior.ts:151-168` gets the precedence
right — incomplete wins — so the two tabs disagree about why they cannot
judge.

**Fix:** only downgrade to `'unknown'` when the summary verdict is one of the
threshold verdicts (`usual`/`low`/`high`/`unusual`); leave `no-data` and
`incomplete` alone.

**Test to pin it:** `horse-in-stall-behavior.test.ts` and
`people-in-stall-behavior.test.ts`: week with a missing day, created 10 days
ago → weekly verdict `'incomplete'`.

---

## Live score cards (Horse Details status strip) — the only live path today

### CQ-6 · P1 · A stale sample is shown as current

**Where:** `src/hooks/use-horse-status.ts:135,145,154` — `cacheAgeMs` is
built from React Query's `dataUpdatedAt` (when the *phone* received the
answer). `src/services/prometheus/horse-readings.ts` returns `observedAt` (the
*sample's* own time) on every point, and nothing reads it.
`src/hooks/horse-status-data.ts:163` only consults the age when offline or
errored.

**What happens:** Prometheus answers an instant query with the most recent
sample inside its look-back window (five minutes by default for the sensor
bundle; the in-stall and activeness queries carry their own 90 s / 30 s
windows). Combined with the five-minute query grid (CQ-7) a reading can be up
to ~10 minutes old and is presented with no qualifier. The magnitude is
bounded by Prometheus's look-back, so this is minutes, not hours — but the
timestamp that would let the card say "as of 2:31 PM" is already fetched and
discarded.

**Fix:** carry `observedAt` through to `deriveScoreCardDisplay`; show the
`cached` state (`Updated N min ago`) from `now − observedAt` when it exceeds
a threshold, online or not.

**Test to pin it:** `horse-status-data.test.ts`: `observedAt` 9 minutes before
`now`, online, no error → state `cached`, detail names the age.

### CQ-7 · P2 · The strip says 2:34 PM and reads 2:30 PM

**Where:** label at `src/app/(tabs)/horses/[id].tsx:514` shows
`playhead.cursor`; the query time at `src/hooks/use-horse-status.ts:88` is
`liveSliceFor(cursor)`, floored to a 300-second grid
(`src/hooks/playhead-data.ts:140-143`).

**What happens:** On a past day the strip labels the readings with the
scrubbed time to the minute, while the readings were taken at the preceding
five-minute mark. The quantisation itself is a deliberate, documented decision
(cache keys, 2026-08-17); the label just does not say what was done.

**Fix:** label with the quantised instant when not live (`DateTime.fromSeconds(atSeconds)`), or word it "around 2:30 PM". Same for the `From …` labels at `:434,446` if they feed the same queries.

**Test to pin it:** component test on the Summary tab with cursor 14:34 →
strip label reads 2:30 PM.

### CQ-8 · P2 · Historical readings come from the horse's *current* stall

**Where:** `src/app/(tabs)/horses/[id].tsx:146,152` — `stall: horse.stall`
for every playhead date.

**What happens:** Scrub back a week and the temperature, noise and in-stall
readings are queried from the monitor in the stall the horse is in *today*. If
the horse was moved in between, the strip describes a different stall's week
without saying so. The register already names "effective-dated horse
identity" as an open contract item for Last 24 Hours and Activeness; this is
the same gap on the live path.

**Fix:** until an effective-dated assignment API exists, disable or caption the
strip on non-live days ("Readings from the current stall") rather than assert.

**Test to pin it:** none possible without the assignment history; record as a
contract dependency in the register.

### CQ-9 · P3 · Duplicate sensor series: first one wins, silently

**Where:** `src/services/prometheus/horse-readings.ts:69,78` — `results.find(
… __name__ === metricName)` for temperature and noise.

**What happens:** If the sensor bundle ever returns two series for the same
metric (two sensors, a relabelled stream), the first is used with no signal.
Activeness is already guarded — `singlePointReading` (`:56`) returns nothing
when there is more than one result — so this affects Temperature and Noise
only. The GPT report listed it as a shared risk across all three; it is two of
three.

**Fix:** apply the `singlePointReading` rule to `metricPointReading`: exactly
one match or `undefined`.

**Test to pin it:** `horse-readings.test.ts`: two `external_temperature`
series → `undefined`.

---

## Horse Trends (fixture-backed, `PREVIEWS.horseTrendsSampleData`)

### CQ-10 · P2 · Sparse readings let a long outage draw as a continuous line

**Where:** `src/charts/horse-trends.ts:83` — `limit = max(median × 4, 300)`,
no ceiling.

**What happens:** The gap rule adapts to the data's own spacing, which is
right for 30 s vs 90 s cadences and wrong for genuinely sparse data: two
readings an hour give a limit of four hours, and a six-hour hole with one
reading in it is bridged. With two points in the window the "median" is the
single gap between them, so no hole can ever register.

**Fix:** add an absolute ceiling (e.g. 30 minutes) and treat fewer than three
points as ungappable → `no-data` or a dotted line, not a solid one.

**Test to pin it:** `horse-trends.test.ts`: samples every 2 h with a 6 h hole →
`gaps` contains the hole.

### CQ-11 · P2 · Rolling counts future and duplicate events

**Where:** `src/charts/horse-trends.ts:154,187` and the caller filter at
`src/app/(tabs)/horses/[id].tsx:558` (`>= now − 24 h`, no upper bound).

**What happens:** An event timestamped after `now` (clock skew, a bad record)
draws at the right-hand edge and is counted; two records for one roll count
twice. Activeness (`:70`) does filter `at <= windowEnd`; rolling does not.

**Fix:** filter `at <= now` and de-duplicate on `(at, kind)` inside
`buildRollingWeek` / `rollingCaption`, not in the caller.

**Test to pin it:** `horse-trends.test.ts`: event at `now + 60` → caption
count excludes it; duplicate event → counted once.

### CQ-12 · P3 · 7-day bars merge both roll types under a two-colour legend

**Where:** counts merged at `src/charts/horse-trends.ts:154`; legend at
`src/components/charts/horse-trends-card.tsx:159-160` renders on both ranges;
bars at `:186` draw one merged count.

**What happens:** In the 24-hour view dots are coloured by kind and the legend
is true. In the 7-day view each bar is `rolling + partial-rolling` in one
colour, and the same two-swatch legend sits beneath it.

**Fix:** either stack the bar by kind or hide the legend's second swatch on
the 7-day range. Decide which reads better with Inakshi; the fix is small
either way.

**Test to pin it:** `horse-trends-card.test.tsx`: on `7d`, legend matches what
the bars encode.

---

## Last 24 Hours (fixture-backed, `PREVIEWS.last24HoursSampleData`)

### CQ-13 · P2 · A corrupt duration passes every guard

**Where:** `src/charts/last-24-hours.ts:95-98,110`.

**What happens:** `NaN < 0` is false and `NaN > window` is false, so a `NaN`
duration is neither rejected as negative nor as overflow. The sum becomes
`NaN`, `total` becomes `NaN`, every `share` is `NaN` and `unknownSeconds` is
`NaN` — the band renders garbage widths with state `ready`. Verified by
executing the arithmetic. Duplicate category ids (two `resting` entries) are
also accepted and summed.

**Fix:** treat any non-finite `seconds` as `null`; reject duplicate `id`s as
`unavailable` (an upstream error, like overflow).

**Test to pin it:** `last-24-hours.test.ts`: `{ seconds: NaN }` → state
`unavailable`; two segments with id `resting` → `unavailable`.

Note: the report's "accepts slightly more than 24 hours" and "written values
can total more than the band" are true but bounded — the slack is exactly
`OVERFLOW_TOLERANCE_SECONDS = 60` (`:38`), a deliberate rounding allowance.
Not a ticket.

---

## Latent — in the shared builder, reachable when live data lands

### CQ-14 · P3 · A change in head-count splits one visit into three

**Where:** `src/charts/occupancy-timeline.ts:242-243` — an interval closes and
reopens on *any* value change above threshold, which People in Stall
(`people-in-stall-behavior.ts:108`) then presents as separate visits.

**What happens:** Right for the seven-day occupancy timeline, where the count
is the point ("No. of people: 2"). Wrong for the visits caption: one person
joined by a second and left alone again reads "3 visits · 7:02 AM, 7:10 AM,
7:25 AM" though the stall was never empty. Only reachable if the eventual
People in Stall query returns a *count* rather than a `clamp_max(…,1)` binary
— which is undecided (register: `meaning-blocked`).

**Fix:** when the caller declares the signal binary
(`combineSameKeyStreams: true` is already that declaration), treat any value
above threshold as the same state and do not split.

**Test to pin it:** `occupancy-timeline.test.ts`: values `1,2,1` above
threshold with binary flag → one interval.

### CQ-15 · P3 · Presence that began before the barn day is dated to the boundary

**Where:** `src/charts/occupancy-timeline.ts:223` — the first in-day sample
opens the interval.

**What happens:** A horse that lay down at 05:40 and is still down at 06:10
gets a bout starting "6:00 AM"; a person in the stall at the boundary is "1
visit · 6:00 AM". Inherent to cutting by day; the caption should not present
the cut as an arrival.

**Fix:** flag an interval that starts at `day.start` as `carriedIn` and let
captions say "from the start of the day" rather than a clock time.

**Test to pin it:** `people-in-stall-behavior.test.ts`: presence spanning the
06:00 boundary → caption does not list "6:00 AM" as a visit time.

### CQ-16 · P3 · The "never merge different measurements" guard is bypassed by design, undocumented

**Where:** guard and rationale at `src/charts/occupancy-timeline.ts:320-327`;
bypass at `src/charts/lying-down.ts:351,358` (`seriesKey: () => 'lying-down'`
plus `combineSameKeyStreams: true`), which People in Stall inherits at
`people-in-stall-behavior.ts:108`.

**What happens:** The occupancy builder promises that `Human_Presence` and
`Human_Interaction` stay separate. The behaviour charts collapse every series
to one key and union them. For "time anyone was in the stall" that may be the
intended answer — but nothing at the merge site says so, and the fixture uses
only `Human_Presence`, so the multi-type case is untested. This is the
verifiable core of the report's "different horses or stalls can be combined";
the horse-identity half of that claim is CQ-8.

**Fix:** a decision, then a comment at `lying-down.ts:351` recording it, and a
fixture with both event types.

---

## Row order — already recorded, awaiting Inakshi

Not a new finding. `CHART_AND_QUERY_REGISTER.md` (§"DECIDED … keep it hidden
for now", final paragraph) already flags that `sortRowsByAttention`
(`src/charts/row-order.ts:24`, called at
`src/components/for-you/behavior-tracker-card.tsx:546,557,568`) still floats
rows on the withheld 25% verdict while the badge and colour are hidden. Sample
data only today. **Decision still open:** drop it (plain stall order until a
comparison is approved) or keep it and record the acceptance. Recommendation in
the 2026-09-03 briefing: drop it, on the same reasoning that hid the ochre
line.

---

## Claims in the GPT report that did not hold

- **"Accepts infinite readings."** Prometheus serialises infinity as the text
  `+Inf` / `-Inf`. `Number('+Inf')` is `NaN`, which `toNumber`
  (`horse-readings.ts:17-21`) already rejects. Verified by execution. Only a
  literal `"Infinity"` or an overflowing literal like `"1e999"` would pass,
  and Prometheus emits neither. Not a defect; a `Number.isFinite` check would
  be harmless belt-and-braces.
- **"7-day Rolling cannot distinguish missing from genuine zero."** It can:
  `buildRollingWeek` (`horse-trends.ts:166-170`) yields `null` for a day not in
  `observedDays` and `0` for a watched day with no rolls, and the bars draw
  them differently (dashed slot vs. zero-height bar). The risk would only
  arise if a future caller derived `observedDays` from the events themselves.

## Claims that were true but smaller than stated

- "A partially recorded day showing an ordinary total without 'Partly
  recorded'" — true of the tapped-day panel only (CQ-4); the bar is faded to
  45% and the daily caption says "Partly recorded".
- "Can draw a 24-hour band while its written values total more than 24 hours"
  — bounded to 60 seconds of rounding slack (see CQ-13 note).
- "None of the charts is production-verified" — correct, and it is what the
  register already says; every chart carries a status and none is `approved`.
