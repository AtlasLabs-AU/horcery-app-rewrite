# Chart specification — Activeness trend and score

Completed from `docs/architecture/CHART_SPECIFICATION_TEMPLATE.md`.
Complies with `docs/architecture/CHART_ENGINEERING_STANDARD.md`.

This file covers `horse-trends-activeness` and its score-card sibling
`horse-activeness-score` because both use the same orientation inputs. They remain
separate customer claims and require separate approval.

## 1. Identity and approval

| Field | Answer |
|---|---|
| Chart ID | `horse-trends-activeness`; sibling `horse-activeness-score` in §12 |
| Working title | Activeness |
| Status | trend `meaning-blocked`; score `backfill-required` and not meaning-approved |
| Screens | Horse Detail → Summary → Horse Trends; Horse Detail status strip |
| Entity | horse, through effective-dated monitor assignment |
| Data Science owner | Anuvathan Saththivinayagam; final owner to confirm |
| Data Science approval | pending; candidate queries recovered, not merged/approved |
| Product owner | Inakshi |
| Product approval | 2026-08-21 for trend presentation and withholding an unapproved badge |
| Engineering owner | Horcery mobile rebuild team/agents |
| Backend owner | unassigned — target observation contracts do not exist |
| Sources searched | 2026-08-27: shipping app `development`; full git history; trend commit [`5ca4fc34`](https://bitbucket.org/atlas-labs/fin-84-horcery-app-react-native/commits/5ca4fc34c8e6123261089211ed31d32badbd34ef); score commit [`d681f187`](https://bitbucket.org/atlas-labs/fin-84-horcery-app-react-native/commits/d681f1877e8eade495d48d7ae3688a1499165265); `automation/digest.md`; Mobile Queries; [Prometheus Query Changelog](https://docs.google.com/document/d/1BTBI90QCPTZ3ZOgD7Nk0KJbXsw9uTF8q89ryZszyA6Q/edit); live metric metadata; rewrite docs/code/tests |

## 2. Should this be a chart?

**Customer question:** How has this horse's relative activity changed over the
last 24 hours and seven days?

**Customer decision or understanding it supports:** See timing and direction of
change without turning an unowned index into a clinical judgement.

**Why a number is not clearer:** The shape and monitoring gaps matter. The status
strip's separate current score is a number/category and is specified in §12.

**Legacy reference:**
`packages/widgets/src/trend-widget-v2/activeness/index.tsx` and the queries in
`packages/config/src/utils/prom-utils.ts`. Evidence only.

**Decision:** `build` the line/bar trend; withhold comparison badge until approved.

## 3. Meaning and data contract

### Recovered candidate definitions

The active `development` app still falls back to the older derivative-based query
and can replace it through Firebase Remote Config. Unmerged commit `5ca4fc34`
contains the newer Data Science candidate:

| Purpose | Candidate definition |
|---|---|
| 24-hour trend | average tail-withers orientation plus average head-withers orientation over `[12m:15s] offset -8m`, restricted to filtered in-stall observations; outer step 720 s |
| 7-day trend | daily average of the same two orientation inputs over `[1d:15s]`; outer step 86,400 s |
| 24-hour comparison | current 1-hour average divided by the average of comparable three-hour windows 1, 2 and 3 days earlier |
| 7-day comparison | current 1-day average divided by the previous 3-day average offset one day |

The hourly candidate ends in `or vector(0)`. That conflates a missing/out/untracked
observation with measured zero and must not survive into the target contract.

| Field | Target definition / gate |
|---|---|
| Observation/API ID | proposed `horse.activeness_trend.v1` |
| Contract version | pending |
| Query version/provenance | candidate commit `5ca4fc34` and Query Changelog; live Firebase values and Data Science approval pending |
| Entity-selection rule | exact horse ID plus assignment effective at each sample; the legacy `data[0].stall`/adult-horse assumption is forbidden |
| Requested time range | rolling 24 hours or seven barn days ending at selected time/day |
| Effective time range | response echoes exact bounds; no phone-local midnight |
| Organization timezone | organization IANA zone; DST-safe barn-day boundaries |
| Canonical unit | unitless relative activity index; metric metadata declares no physical unit |
| Display-unit conversions | none; do not multiply by 1,000 |
| Resolution/aggregation | candidate 720 s hourly outer step and 86,400 s daily step; backend-owned and pending approval |
| Thresholds/categories | no trend badge until ratio definition, labels and exact boundaries are approved |
| Missing-data meaning | missing/null with reason, never numeric zero |
| Partial-data meaning | draw observed points and explicit gaps; withhold comparison if coverage is insufficient |
| Ambiguous/multiple results | unavailable; never aggregate unidentified horses or pick the first assignment |
| Freshness/staleness | pending; response must provide generated/observed bounds |

Candidate badge code uses `ratio <= 0.25` Lower, `0.25 < ratio <= 4` Usual,
and `ratio > 4` Higher. The changelog calls the middle band Medium and describes
overlapping endpoints. Therefore neither wording nor boundaries are approved.

Proposed response fields: `contract_version`, `horse_id`, `range`, `starts_at`,
`ends_at`, `organization_timezone`, `unit`, `points[{at,value}]`,
`gaps[{from,to,reason}]`, `coverage`, `comparison{ratio,category}` or null,
`generated_at`, `state`, `reason`. Mobile validates version, horse, finite values,
strictly increasing timestamps, bounds, non-overlapping gaps, and known unit.

## 4. Ownership boundary

**Data Science/backend:** input metrics; aggregation; assignment identity;
coverage/gaps; comparison cohort/windows; category thresholds and wording.

**Allowed on mobile:** schema validation, date/value formatting, line geometry and
point culling that preserves extrema and gaps.

**Forbidden on mobile:** ×1,000 scaling; replacing missing with zero; deriving a
badge from arbitrary difference; inventing a physical unit; choosing a monitor by
array position; editing PromQL through Remote Config in the rebuilt app.

**Delivery path:** backend observation API. Fixture-backed preview remains the only
permitted target until the contract exists.

## 5. Presentation

| Decision | Answer |
|---|---|
| Chart family | 24 h line; 7 d daily bars/line as approved in the final component design |
| Primary message | when relative activity rose/fell and where observation stopped |
| Series | one activeness series; monitoring gaps are not a second value series |
| Axes | x = organization time; y = deliberately unlabelled unitless index until naming approval |
| Legend | none, one series |
| Tooltip | selected time + raw index only; no behavioural interpretation |
| Colour/token roles | chart data/reference/gap tokens only |
| Reference/threshold lines | none until comparison contract approval |
| Phone layout | full card width; 24 hours / 7 days control |
| Tablet layout | same meaning, expanded width only |
| Text summary | title, range and honest data state; no Higher/Usual/Lower pill yet |

## 6. Interaction

Tap inspection may show time and raw index. No zoom, pan, series toggle or
full-screen mode is approved. Interaction must not bridge gaps or relabel values.

## 7. Honest states

| State | Display and behaviour |
|---|---|
| Loading | stable chart skeleton |
| Refreshing with cached data | retain chart and show refresh state |
| No data | `No activeness observations for this period`; no zero line |
| Out of stall / not applicable | explicit reason from contract; no zero line |
| Stale | retain values with approved age label; threshold pending |
| Partial | draw points separated by visible gaps; comparison withheld |
| Unavailable/error | explanatory state and retry |
| Unsupported device/model | `This monitor cannot provide activeness` |
| Ambiguous entity/results | unavailable; never merge unidentified horses |

## 8. Real data and scalability

Before approval capture active Firebase values and real responses for all three
known monitors, including in-stall, out/untracked, offline, stall move, dense 24 h,
seven days, DST and ambiguous assignment. Live metadata checked 2026-08-27 says
the head/tail orientation metrics are gauges with an empty unit.

**API/request bound:** at most 121 24-hour points at a 720-second step and seven
daily points, plus gaps/comparison metadata. **Level of detail:** preserve first,
last, extrema and gap edges. **Full-screen chart count:** Activeness and Rolling
mount together on Horse Trends.

## 9. Acceptance evidence

- [x] Rebuild domain/component tests ensure the line breaks at gaps and show no badge.
- [ ] Live Firebase values reconciled to candidate commit/changelog.
- [ ] Contract version/entity/unit, exact threshold and missing/out/offline tests.
- [ ] Real normal, dense, partial, ambiguous, DST and maximum fixtures.
- [ ] Renderer regression test proves gaps are visually disconnected.
- [ ] Physical iPhone and mid-range Android; light/dark; large text; VoiceOver/TalkBack.
- [ ] Activeness and Rolling mounted together under repeated navigation.

## 10. Decision and change history

| Date | Change/decision | Approved by | Evidence/version |
|---|---|---|---|
| 2026-08-21 | Unitless axis and hidden comparison badge until meaning is approved | Inakshi | product review/register |
| 2026-08-23 | Request-step/collapse claims withdrawn; silent-zero defect retained | engineering review | register correction record |
| 2026-08-27 | Candidate trend/tag/score definitions recovered from current repo/history | Codex, factual audit | this specification |

## 11. Exceptions and remaining risks

No production exception is approved. Gates: active Firebase query capture; named
Data Science approval; missing/out/untracked distinction; effective-dated horse
identity; unit/name; comparison wording/boundaries; backend response; real/device
evidence.

## 12. Sibling contract — `horse-activeness-score`

The rebuilt status strip already queries:

```promql
avg_over_time((horse_head_wither_abs_orientation_angle{animal_type="horse"} + horse_tail_wither_abs_orientation_angle{animal_type="horse"})[30s:5s])
```

This matches unmerged commit `d681f187`. Its code classifies `<100` Low,
`100..900` Med, and `>900` High. The changelog prose says Low `<=100`, Medium
`>100..900`, High `>900`; the rebuild currently uses Low, Normal, High and puts
exactly 100 in Normal. Exact 100 and the middle label therefore remain unresolved.

The score must use the same effective-dated horse identity and missing-data rules
as the trend. Its value is an unnamed/unitless orientation-derived index, not a
physical activity unit or clinical finding. Until Data Science and Product approve
the boundaries and wording, implementation tests are characterization only and the
register status remains `backfill-required`.
