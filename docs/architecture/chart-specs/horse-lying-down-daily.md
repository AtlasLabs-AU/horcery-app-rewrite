# Chart specification — Lying Down (daily)

Completed from `docs/architecture/CHART_SPECIFICATION_TEMPLATE.md`.
Complies with `docs/architecture/CHART_ENGINEERING_STANDARD.md`.

## 1. Identity and approval

| Field | Answer |
|---|---|
| Chart ID | `horse-lying-down-daily` |
| Working title | Lying Down |
| Status | `building` — implemented behind `PREVIEWS.lyingDownSampleData`, fixture-backed, not customer-reachable |
| Screens | For You → Behavior Tracker → Lying Down (Daily). One row per horse, stacked |
| Entity | horse |
| Data Science owner | Anuvathan Saththivinayagam implements the lying-down queries (data-team meeting 2026-07-23); Nadim is referenced for data-science questions. **To confirm** which of them owns this chart's meaning |
| Data Science approval | **pending** (query correction and per-horse usual curve both unapproved) |
| Product owner | Inakshi |
| Product approval | 2026-08-19 (customer question, presentation, colour rule, barn-day source) |
| Engineering owner | Claude |
| Backend owner | Unassigned — no observation API; temporary adapter, §4 |

## 2. Should this be a chart?

**Customer question:** Did this horse rest as much as it normally does today, and
if not, which way?

**Customer decision or understanding it supports:** Whether to go and look at a
particular horse this morning. Lying down is a welfare signal — a horse resting
far less than usual is often in pain (it hurts to lie down or rise); far more
often means illness or lethargy.

**Why a number, score card, sentence or table is not clearer:** A single number
answers "how long" but not "is that normal for this horse", and the answer
depends on the point in the day — two hours by breakfast and two hours by
midnight mean opposite things. The comparison against the horse's own normal is
inherently a shape over time. The badge and figure carry the answer; the chart
carries the evidence for it. On a home page with five horses the row must also be
scannable, which a table of numbers is not.

**Legacy reference:** the shipping app's Behavior Tracker daily view —
`packages/widgets/src/for-you-charts/behavior-tracker-widget/` in
`84-horcery-app-react-native` (read-only reference). It is already a cumulative
line within one day with a grey 7-day average line. Evidence only.

**Decision:** `build`

## 3. Meaning and data contract

**Definition of the behaviour (Inakshi, 2026-08-19):** "lying down" means the
horse is physically on the floor.

| Field | Approved definition |
|---|---|
| Observation/API ID | none — direct Prometheus, `horse_sitting_per_id` |
| Contract version | n/a (raw metric; no versioned observation contract exists) |
| Query version/provenance | Data Science via PR 1928 on `84-horcery-app-react-native`, **with a one-character correction, §11-E1** |
| Entity-selection rule | **All streams matching the filtered query are unioned** (highest value per instant) — see "Several streams for one stall", register, 2026-08-23. Measured on sm-1272, 8–12 July, with the query the app actually runs: 3 streams, 784 minutes with one positive, ZERO simultaneous. Union therefore equals the legacy sum here and cannot exceed a day. Opt-in per caller (`combineSameKeyStreams`); correct only for this binary signal. Data Science still owes the meaning of `id` |
| Requested time range | 7 barn days ending on the selected date |
| Effective time range | barn day = organization `chart_start_time` → same time next day |
| Organization timezone | organization `timezone`; Luxon zone arithmetic, DST-safe by construction |
| Canonical unit | seconds (domain); **display** h/min |
| Display-unit conversions | `formatDuration` (prose, "1 h 40 min"), `formatDurationCompact` (figure, "1h 40m") |
| Resolution/aggregation | 60 s samples; cumulative sum within the barn day, computed in the domain layer from bout edges |
| Thresholds/categories | deviation > 25 % from this horse's own normal ⇒ unusual. `DEFAULT_DEVIATION_THRESHOLD_PERCENT`, mirroring the shipping app's Remote-Config-overridable `DEVIATION_THRESHOLD_<SUFFIX>` |
| Missing-data meaning | `null`, **never zero**. Enforced by type (`totalSeconds: number \| null`) and by test |
| Partial-data meaning | monitor stopped reporting mid-window ⇒ that day is `null`, not a short day |
| Ambiguous/multiple results | more than one series for a horse is not resolved by guessing; the row renders `unknown` |
| Freshness/staleness | **PENDING** — no staleness rule agreed, §11-R2 |

### Queries

Detection (corrected — see §11-E1):

```promql
round(clamp_max(avg_over_time(horse_sitting_per_id{animal_type="horse"}[1m30s:30s] offset -1m),1))
```

Observation coverage (the denominator — when the monitor could see the horse):

```promql
horse_in_stall
```

Usual curve: the shipping app's `dailyLyingDownAvg` — 7-day average cumulative
lying-down time at the 6/12/18/24-hour marks. Deviation: the shipping app's
`lyingDownDeviationPercentage`. **Both are consumed as shapes, not yet ported.**

## 4. Ownership boundary

**Data Science/backend calculations:** detection of lying down; the horse's usual
cumulative curve; the deviation percentage; the unusual threshold.

**Allowed mobile presentation transformations:** unit conversion and formatting;
cumulative summation within the barn day from returned samples; geometry.

**Calculations explicitly forbidden on the phone:** deciding *whether* a day is
unusual (threshold ownership stays with Data Science); inventing a spread around
the usual curve; treating absent data as zero.

**Deliberate exception — direction of deviation.** `lyingDownVerdict` decides
Low vs High on the phone, by comparing today's total with this horse's own
normal. Data Science's query wraps its result in `abs()` and so cannot express
direction. This is arithmetic over two values already displayed to the customer,
not a second opinion about whether anything is wrong. See §11-E2.

**Delivery path:** temporary rebuild adapter.

- Reason: no observation API exists for this behaviour.
- Query location: `src/config/constants/prometheus-queries.ts` (**not yet added** —
  the row is fixture-backed; see §11-R1).
- Owner: Claude.
- Removal condition: when the observation API ships, or when Remote Config wiring
  is decided (requirements §6a-i).
- Production exception approved: **no.** The chart is preview-gated and must not
  ship to customers in this state.

## 5. Presentation

| Decision | Answer |
|---|---|
| Chart family | line (cumulative within one day) |
| Primary message | is this horse's rest normal for it today |
| Series | (1) today's cumulative lying-down time; (2) this horse's usual cumulative progress, dashed; (3) observation coverage strip |
| Axes | x = barn day, five ticks from `chart_start_time`; y = hidden, 0 → 1.15 × max(today, usual, average) |
| Legend | none. Three visually distinct elements, each explained by adjacent text; a legend on a 60 pt row would cost more than it returns |
| Tooltip | none — see §6 |
| Colour/token roles | `chartData` (reading), `chartDeviation` (reading when Low/High/Unusual), `chartReference` (dashed usual), `chartTrack` (coverage strip), `chartDeviationBed`/`chartDeviationInk` (badge). No literals; `no-color-literals` enforces |
| Reference/threshold lines | the dashed curve is this horse's own usual progress. When no curve exists, one dashed rule at the daily average. No threshold line is drawn — the threshold is expressed as the badge, not as geometry |
| Phone layout | full card content width, measured via `onLayout`; 60 pt plot, 6 pt strip |
| Tablet layout | not applicable yet — For You tablet layout is undecided |
| Text summary | horse name, badge, today's figure, this horse's average, and in-stall total are all present as text; the chart is evidence, not the only carrier |

**Why this over the alternatives.** A per-day bar chart across the week answers
"how much" but loses "is this normal *by now*", which is the question at 7 am
with the day half gone. A bout strip (when the horse was down) reads more
directly for one horse and shows restless cycling, but does not compare against
normal and does not scan across five stacked horses; it is the right chart for
the horse detail screen, not for here. A filled area was tried and rejected on
2026-08-19: it turned the curve into a staircase that had to be explained before
it could be read.

## 6. Interaction

| Interaction | Required? | Reason and bounds |
|---|---:|---|
| Tap inspection | no | the row's whole job is to be readable without touching it |
| Tooltip | no | the two numbers a tooltip would show are already printed above the chart |
| Pinch zoom | no | fixed 24-hour domain; nothing to zoom into |
| Pan | no | as above |
| Reset zoom | no | no zoom |
| Series toggle | no | three series, all always relevant |
| Full screen | no | separate product approval; not requested |
| Link to video/event | **PENDING** | a plausible future ("show me the rest at 2 am"), not specified |

No gesture conflict handling needed: the row consumes no gestures, so the parent
scroll view keeps them all.

## 7. Honest states

| State | Display and behaviour |
|---|---|
| Loading | **PENDING** — fixture-backed today, so no loading state has been designed (§11-R1) |
| Refreshing with cached data | **PENDING**, as above |
| No data | badge "No data", figure "—", no line drawn at all. Never a flat zero line |
| Out of stall / not applicable | the coverage strip shows the gap; the in-stall total is printed beneath, so a flat morning reads as "unobserved", not "refused to lie down" |
| Stale | **PENDING** (§11-R2) |
| Partial | day renders `null` rather than a short day; monitor-offline fixture covers it |
| Unavailable/error | **PENDING** (§11-R1) |
| Unsupported device/model | not applicable |
| Ambiguous entity/results | badge "No history"; no verdict asserted |
| Contradiction — lying-down exceeds in-stall time | `inStallDisagrees` withholds both the in-stall figure and the strip and prints "In-stall time unavailable". An impossible denominator is never rendered |
| Contradiction — query says unusual, figures agree | verdict `unusual`; direction is not guessed |
| Barn day just rolled over | **OPEN QUESTION** — every horse currently reads 0 with badge "Usual", asserting a verdict on no observations. §11-R3 |

## 8. Real data and scalability

Measured against live monitors sm-1275, sm-1272 and sm-1212 on 2026-08-19.

| Fixture/load | Source | Volume/shape | Expected behaviour |
|---|---|---:|---|
| Normal | measured, sm-1275/1272/1212 | 2–4 bouts/day, 14–189 min/day, 16–31 bouts/week | `typicalWeek`, `settledSleeper` |
| Realistic dense | measured worst case | 350 transitions/week | well inside budget; the renderer spike's 6,720 "ceiling" was ~19× anything real |
| Empty | constructed | 0 series | `noData` — renders "No data", never zero |
| Partial/stale | constructed | truncated mid-week | `monitorWentOffline` |
| DST/midnight | contract-derived | n/a | Luxon zone arithmetic; barn-day boundary is not midnight, so a night is never split |
| Maximum supported | 7 days × 1 min samples | 10,080 samples/horse | domain reduces to bout edges before any drawing |

**API/request bound:** 7 days at 60 s step per horse per query.

**Level-of-detail rule:** the domain layer reduces samples to bout edges, so the
drawn polyline has roughly one point per bout edge (single digits per day), not
one per sample. The dashed reference is drawn at 24 samples regardless of input.

**Full-screen chart count:** one row per horse on For You. Four in the preview;
five is the stated design target; no upper bound has been agreed — **§11-R4**.

## 9. Acceptance evidence

### Automated

- [ ] Contract version/entity/unit validation — no versioned contract exists (§3)
- [x] Threshold and exact-boundary tests — `lyingDownVerdict`, including exactly-on-threshold
- [x] Missing/partial/ambiguous-result tests — `lying-down.test.ts`
- [x] Organization timezone, midnight and DST tests — `lying-down.test.ts`, `occupancy-timeline.test.ts`
- [x] Normal, dense and maximum-supported deterministic fixtures — `src/charts/fixtures/lying-down.ts`
- [x] Labels, units, legend, tooltip and honest-state component tests — `lying-down-row.test.tsx`
- [x] Feature screen imports neither Victory nor Prometheus — `architecture-boundaries.test.ts`
- [x] Regression test for each implementation defect found — colour-by-verdict, absence-is-not-deviation, `inStallDisagrees`, `comparisonDisagrees`, `dayStartHourFrom` fallbacks

### Physical devices

- [ ] Release-like mid-range Android — **not done**
- [ ] Physical iPhone confirmation — **not done.** Verified on the iPhone 17 Pro Max *simulator* only
- [ ] Light and dark — **light only.** Dark tokens exist and are contrast-checked but have not been looked at
- [ ] All destination-screen charts mounted together — partially: seen alongside Water and Feed placeholders
- [ ] Repeated navigation and memory settlement — not applicable yet (fixtures, no fetching)
- [ ] Phone and applicable tablet layout before beta — phone only
- [ ] Manual VoiceOver/TalkBack before release — deferred by prior decision

Evidence: `npm run check` green at 505 tests / 51 suites; commits `6e26f8f`,
`2dd2c84`, `2158173`, `a5af0ba`, `97a5e48`, `be2985a` on `rnd`.

## 10. Decision and change history

| Date | Change/decision | Approved by | Evidence/version |
|---|---|---|---|
| 2026-08-19 | Presentation: stacked per-horse rows ("option B"), in-stall as a strip ("V2") | Inakshi | conversation |
| 2026-08-19 | Detection query corrected `animal_type="Horse"` → `"horse"` | Claude, **unapproved by Data Science** | verified non-empty on sm-1275/1272/1212; PR 1928's form returned 0 series on all three |
| 2026-08-19 | Chart palette: denim reading, ochre deviation; "deviation may be coloured, severity may not" | Inakshi | `PRINCIPLES.md`, standard §5a |
| 2026-08-19 | Reading drawn as a line, not a filled area | Inakshi | commit `a5af0ba` |
| 2026-08-19 | Barn day taken from organization `chart_start_time`, fallback 06:00 | Inakshi | commit `97a5e48` |
| 2026-08-19 | Direction of deviation derived on the phone; threshold stays with Data Science | Inakshi | commit `be2985a` |
| 2026-08-20 | Added a dev-only, read-only live-preview path (Protos → Live monitors) using sm-1275 / sm-1272 / sm-1212. It uses the shared row and raw range adapter; on 2026-08-20 sm-1275 returned no lying-down series, while sm-1272 and sm-1212 measured 199 min and 171 min in the prior 24 h. | Inakshi / engineering | `src/app/proto-live-charts.tsx`, `src/services/prometheus/monitor-range.ts` |

## 11. Exceptions and remaining risks

**E1 — Unapproved query correction.** PR 1928 specifies
`animal_type="Horse"`. That label value does not exist; the live label is
`horse`, and the PR's query returns zero series on every monitor tested. Shipped
as written it would report "0 minutes lying down" indefinitely, with no error.
This specification records the lowercase form. *Rule:* queries are Data Science's
to define. *Owner:* Data Science. *Expiry:* on their written confirmation.
*Containment:* fixtures encode the lowercase label; the chart is preview-gated.

**E2 — Direction derived on the phone.** §4. *Rule:* semantic calculations belong
to Data Science. *Reason:* their query returns `abs()`, so Low and High —
clinically opposite — are indistinguishable. *Owner:* Data Science.
*Expiry:* when a signed deviation is available. *Containment:* the threshold call
remains entirely theirs; disagreement yields `unusual` rather than a guess.

**R1 — No live data path.** The row is fixture-backed and preview-gated; loading,
refreshing and error states are undesigned. Blocks any customer release.

**R2 — No staleness rule.** Nothing defines when a reading is too old to show.

**R3 — Verdict asserted on no observations.** In the first hours of the barn day
every horse reads 0 with badge "Usual". A verdict is being stated where nothing
has been observed. Needs a "too early" state or a minimum-observation rule.

**R4 — No agreed upper bound on rows.** Five horses is the design target; a
customer with fifty is unspecified.

**R5 — Per-horse usual curve is a stand-in.** The preview synthesises the curve
from the sample week. Production must use `dailyLyingDownAvg`, which is not yet
ported.

## What is already decided elsewhere

Found in the team-transcript digest and the Mobile Queries sheet on 2026-08-19,
after this specification first recorded several of these as unknown. Recorded
here so the same questions are not asked again.

- **Build order is fixed.** Lying-down queries first, then activeness charts,
  then the behaviour-tracker resolution increase, then sleep charts
  (DRAFT-D-2026-07-23-02). Lying Down being first is deliberate, not incidental.
- **The data team has already offered to return computed levels.** For
  activeness: "thresholding currently happens in the mobile app (levels 0–3); the
  data team can instead return the levels directly" (2026-07-23). Asking them for
  a *signed* deviation, or for the verdict itself, is therefore consistent with
  an offer they have already made for a sibling chart — not a new imposition.
  This is the cleanest route out of exception §11-E2.
- **The usual curve's coarseness is a known, active workstream.** Increasing the
  behaviour-tracker resolution from six-hourly to hourly is on the backlog with
  a named obstacle — "the direct query currently returns only 4 values; 24 would
  need 24 stacked queries" — and an agreed fallback of cumulative calculation in
  the frontend (2026-07-23). Our four-checkpoint curve is that same 4-value
  limitation, and the agreed fallback is what this app already does.
- **The Mobile Queries sheet tracks this chart's query as needing change**
  (row "Shows when animal is lying down or resting", `Query_Changes: Needed`),
  but still records the OLD `horse_sitting` form and contains no per-id query, no
  `animal_type` label and no thresholds. It is a change tracker, not a
  specification — so it neither confirms nor contradicts §11-E1.
- **Lying-down queries have a track record of defects.** "Lying down events less
  than" returned incorrect results (assigned to Vikum), and the alerts test sheet
  records repeated `Fail` rows against lying-down conditions marked "Query
  Issue". This raises rather than lowers the value of checking §11-E1 before it
  ships.
- **The average-value presentation was already questioned by the team** — "line-
  down chart average-value visualization looks poor in the Figma-suggested UI"
  (2026-07-27), with a follow-up to consult on a better presentation. The
  redesign here is consistent with that, and predates neither.

**Still genuinely unknown, and not written down anywhere found:** the rationale
for the 25 % deviation threshold, a per-day threshold, the staleness rule, and
what the badge should say before enough of the barn day has elapsed to judge.

---

## 12. The weekly view (`horse-lying-down-weekly`)

The same measurement at a different grain, so it shares this specification rather
than duplicating it. Only the differences are recorded here.

**Customer question:** has this horse's week been normal for it?

**Presentation:** one bar per day, seven days ending today. Each bar carries a
marker at that weekday's four-week average (`weeklyLyingDownAvg`), so a horse
whose routine differs at weekends is compared against its own Saturday rather
than a flat weekly mean. Headline figure is the week's **daily average**,
excluding today (Inakshi, 2026-08-19: the chart shows seven days, so the number
should too). The badge judges the **week**, so badge and chart describe the same
span.

**Deliberate differences from the shipping app, both about honesty:**

- **Today is drawn hollow and never judged.** The app paints today in the
  strongest colour and fades the completed days. Today is the unfinished one; a
  solid bar beside six full days reads as a collapse at 7 am. Today is also
  excluded from the week's average for the same reason.
- **A day with no observations is an empty slot, not a zero-height bar.** The
  app defaults missing days to `0`, which is indistinguishable from a horse that
  never lay down.

**Withdrawn, with evidence — per-day colouring.** Colouring each bar by its own
verdict was the plan. On the device it turned three of six bars ochre for an
ordinary horse. A horse's lying-down time varies far more than 25 % from one day
to the next (14–189 minutes within one real week), so a 25 % per-day threshold
marks most days unusual, and `PRINCIPLES.md` is explicit that routine ochre means
the threshold is wrong rather than the palette. The per-day verdict is computed
and tested, and is not drawn.

**Open risk R6 — the per-day threshold does not exist.** The 25 % figure is
Data Science's, tuned for "today so far versus the same point in recent days",
not for whole-day totals against a weekday average. A per-day threshold is
needed before any per-day judgement is shown. This may also explain why the
shipping app's own Usual/Unusual pill is dead-coded off — worth asking.

**Open risk R7 — the four-week weekday average is not ported.** The preview
supplies each horse a single stated normal for every weekday. Production needs
`weeklyLyingDownAvg`, which has not been brought across.
