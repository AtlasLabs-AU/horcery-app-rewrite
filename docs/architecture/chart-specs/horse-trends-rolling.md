# Chart specification — Rolling trend

Completed from `docs/architecture/CHART_SPECIFICATION_TEMPLATE.md`.
Complies with `docs/architecture/CHART_ENGINEERING_STANDARD.md`.

## 1. Identity and approval

| Field | Answer |
|---|---|
| Chart ID | `horse-trends-rolling` |
| Working title | Rolling |
| Status | `data-blocked` — product meaning/presentation are decided; target exact-event API is missing |
| Screens | Horse Detail → Summary → Horse Trends |
| Entity | horse |
| Data Science owner | event classification owner to confirm |
| Data Science approval | established legacy event types/grouping; formal target-contract approval pending |
| Product owner | Inakshi |
| Product approval | 2026-08-21 |
| Engineering owner | Horcery mobile rebuild team/agents |
| Backend owner | unassigned — cloud event/observation contract required |
| Sources searched | 2026-08-27: shipping app `development` and history; `automation/digest.md`; Mobile Queries; Prometheus Query Changelog; rewrite requirements/register/code/tests |

## 2. Should this be a chart?

**Customer question:** When did this horse roll in the last 24 hours, and how do
the latest seven barn days compare with the same weekdays one week earlier?

**Customer decision or understanding it supports:** Identify clustered or changed
rolling behaviour and open the matching reviewed events.

**Why a count is not clearer:** The count omits timing and day-to-day pattern. The
caption still prints the exact count/times so the chart is not the only carrier.

**Legacy reference:**
`packages/widgets/src/trend-widget-v2/rolling/index.tsx` and
`packages/config/src/constants/event-types.ts` in the shipping app. Evidence only.

**Decision:** `simplify` — exact-event strip for 24 hours and seven daily counts
with prior-week markers.

## 3. Meaning and data contract

The current app establishes these IDs:

| Target kind | Event IDs |
|---|---|
| Rolling | `102` rolling |
| Partial Rolling | `103` lateral recumbency, `104` sternal recumbency, `105` partial rolling |

The current 24-hour request asks the backend to aggregate `start_time` by hour.
Therefore it does **not** preserve exact event timestamps. Exact dots in the rebuild
are a deliberate improved contract, not parity already supplied by the legacy API.

| Field | Target definition / gate |
|---|---|
| Observation/API ID | proposed `horse.rolling_events.v1` |
| Contract version | pending |
| Query version/provenance | backend events; legacy IDs/grouping above |
| Entity-selection rule | exact `animal_id`; organization authorization applied server-side |
| Requested time range | exact rolling 24 hours; current seven barn days plus the matched prior seven days |
| Effective time range | inclusive start/exclusive end; response echoes bounds |
| Organization timezone | organization IANA zone and configured barn-day start; never phone zone |
| Canonical unit | integer event count; epoch/ISO timestamp for each event |
| Display-unit conversions | timestamps formatted in organization time |
| Resolution/aggregation | 24 h returns exact events; 7 d may return exact events or server-owned daily counts plus observation coverage |
| Thresholds/categories | no severity threshold; two display kinds using IDs above |
| Missing-data meaning | unobserved/null, never count zero |
| Partial-data meaning | counts/times only for observed coverage; partial day visibly marked and not compared as complete |
| Ambiguous/multiple results | duplicate event IDs deduplicated by stable event ID; wrong/missing horse fails closed |
| Freshness/staleness | event response supplies `generated_at`; maximum age pending |

Proposed fields: `contract_version`, `horse_id`, `organization_timezone`,
`barn_day_start`, `starts_at`, `ends_at`, `events[{id,type_id,kind,starts_at}]`,
`days[{key,count,observed_seconds,state}]`, `generated_at`, `state`, `reason`,
`next_cursor`. Mobile validates known IDs/grouping, horse, range, unique event IDs,
sorted timestamps, non-negative counts, and count/event consistency when both exist.

## 4. Ownership boundary

**Backend/Data Science:** event detection/classification; horse identity; duplicate
handling; pagination; organization-time day aggregation; observation coverage.

**Allowed on mobile:** validate, format organization-local timestamps, count a
bounded exact-event response when the contract guarantees completeness, and draw
geometry.

**Forbidden on mobile:** shifting last week's timestamps forward seven days;
treating an absent day as zero; using phone time; inventing exact times from hourly
buckets; changing the 103/104/105 group per screen.

**Delivery path:** backend event/observation API. Fixture-backed preview remains
the only target until the exact-event contract exists.

## 5. Presentation

| Decision | Answer |
|---|---|
| Chart family | 24 h event strip; 7 d bars with prior-week markers |
| Primary message | exact event timing now and comparative daily frequency |
| Series | Rolling and Partial Rolling; prior week is marker/reference |
| Axes | x = organization time/weekday; y = count for 7 d only |
| Legend | labels adjacent to kinds; no separate legend if both are self-labelled |
| Tooltip | event kind + exact organization-local time; daily count + observation state |
| Colour/token roles | semantic chart data/reference/gap tokens only |
| Reference/threshold lines | previous-week markers, not a clinical threshold |
| Phone layout | exact dots and caption for 24 h; seven compact daily slots |
| Tablet layout | same meaning, expanded width only |
| Text summary | `Rolled 3 times · 7:14 AM, 9:02 AM, 1:40 PM`; weekly counts accessible as text |

## 6. Interaction

Tapping an exact event or day opens Review History filtered to horse, date/time and
all four rolling-family IDs. No zoom, pan, series toggle or full-screen mode.
Navigation must never fabricate a timestamp from an aggregate bucket.

## 7. Honest states

| State | Display and behaviour |
|---|---|
| Loading | stable event-strip/bar skeleton |
| Refreshing with cached data | retain prior values and show refresh state |
| No data | only say `No rolling detected` when coverage is complete and count is confirmed zero |
| Out of stall / not applicable | explicit contract reason; no zero claim |
| Stale | retain with approved age label; threshold pending |
| Partial | dots/counts for observed portion plus visible incomplete state; no complete-period comparison |
| Unavailable/error | explanatory state and retry |
| Unsupported device/model | `This monitor cannot detect rolling` |
| Ambiguous entity/results | unavailable; do not merge horses |

## 8. Real data and scalability

Before implementation, capture representative backend events: no-event complete
window, one and many events, all four IDs, duplicates, pagination, partial/offline,
stall move, organization DST boundary and ambiguous identity.

**API/request bound:** one horse and maximum 14 barn days; bounded page size with
cursor pagination and a documented maximum exact-event count. **Level of detail:**
24 h draws exact events; 7 d draws at most seven bars and seven reference markers.
**Full-screen chart count:** Activeness and Rolling mount together.

## 9. Acceptance evidence

- [x] Rebuild fixture/domain tests preserve exact timestamps, 103/104/105 grouping, organization barn days and missing-day nulls.
- [ ] Version/entity/event-ID/pagination/count consistency contract tests.
- [ ] Real complete-zero, dense, duplicate, partial, DST and maximum fixtures.
- [ ] Review History navigation lands on the exact event/time and complete family filter.
- [ ] Physical iPhone and mid-range Android; light/dark; large text; VoiceOver/TalkBack.
- [ ] Activeness and Rolling mounted together under repeated navigation.

## 10. Decision and change history

| Date | Change/decision | Approved by | Evidence/version |
|---|---|---|---|
| 2026-08-21 | Exact 24-hour dots; seven-day bars with prior-week markers; Review History link | Inakshi | product review/register |
| 2026-08-27 | Confirmed legacy event IDs/grouping and that legacy hourly aggregation does not supply exact times | Codex, factual audit | shipping app source; this specification |

## 11. Exceptions and remaining risks

No production exception is approved. Remaining gates: versioned exact-event API;
formal classification/grouping owner; organization-time and coverage semantics;
pagination/maximum; freshness; real data; physical-device/accessibility evidence.
