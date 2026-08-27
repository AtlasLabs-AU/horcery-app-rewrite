# Chart specification — Last 24 Hours

Completed from `docs/architecture/CHART_SPECIFICATION_TEMPLATE.md`.
Complies with `docs/architecture/CHART_ENGINEERING_STANDARD.md`.

This specification separates what the shipping app does, what the latest recovered
candidate proposes, and what is approved for the rebuild. A recovered query is not
an approved production contract.

## 1. Identity and approval

| Field | Answer |
|---|---|
| Chart ID | `horse-last-24-hours` |
| Working title | Last 24 Hours |
| Status | `meaning-blocked` — presentation is approved; the category/query and entity contracts are not |
| Screens | Horse Detail → Summary |
| Entity | horse, resolved through an effective-dated horse-to-monitor assignment |
| Data Science owner | Anuvathan Saththivinayagam (requirements meeting, 2026-07-23); final owner to confirm |
| Data Science approval | pending |
| Product owner | Inakshi |
| Product approval | 2026-08-21 for the customer question and Option B presentation |
| Engineering owner | Horcery mobile rebuild team/agents |
| Backend owner | unassigned — target observation contract does not exist |
| Sources searched | 2026-08-27: shipping app `development`; full local/remote git history; feature commit [`ade60d7b`](https://bitbucket.org/atlas-labs/fin-84-horcery-app-react-native/commits/ade60d7b6dee314e29e3d13b52894dff710af0a6); `automation/digest.md`; Mobile Queries; [Prometheus Query Changelog](https://docs.google.com/document/d/1BTBI90QCPTZ3ZOgD7Nk0KJbXsw9uTF8q89ryZszyA6Q/edit); monitor metadata; rewrite requirements/register/code/tests |

## 2. Should this be a chart?

**Customer question:** How did this horse spend the 24 hours ending at the
selected time?

**Customer decision or understanding it supports:** Understand the balance of
observed rest, awake/in-stall time, time out of the stall, and time the system
could not classify.

**Why a number is not clearer:** Four durations must be understood as parts of
one fixed 24-hour whole. A composition band makes contradictions visible while
the duration list carries the exact values.

**Legacy reference:**
`packages/widgets/src/last-24-hours-widget/index.tsx` and
`packages/config/src/utils/prom-utils.ts` in the shipping app. Evidence only.

**Decision:** `simplify` — replace the donut plus independent progress bars with
one composition band and one exact duration list.

## 3. Meaning and data contract

### Source ladder

| Source | What it establishes | Authority for rebuild |
|---|---|---|
| Shipping `development` | Runtime key `RADIAL_LAST_24_HOURS_QUERY_V2`; fallback returns `up`, `horse_in_stall`, `resting`; phone derives the four displayed durations | behaviour reference only |
| Feature commit `ade60d7b` | New orientation-based resting candidate and horse/foal exclusion; also includes a `walking` series | unmerged candidate only |
| Prometheus Query Changelog | Latest recorded candidate uses `up`, filtered in-stall, orientation-based resting; latest footnote removes walking | strongest recovered Data Science record, still needs named approval/live-value comparison |
| Rebuild | Validates server-supplied category seconds and makes the remainder Unknown | approved presentation, not approved semantics |

The shipping phone currently calculates:

- Out of Stall = `up - horse_in_stall`
- Awake = `horse_in_stall - resting`
- Resting = `resting`
- Offline = `24 - up`

Those formulas explain the current product. They are not authorization to copy
semantic calculation into the rebuilt mobile client.

| Field | Target definition / gate |
|---|---|
| Observation/API ID | proposed `horse.last_24_hours.v1`; backend name pending |
| Contract version | pending |
| Query version/provenance | latest candidate in the Prometheus Query Changelog; must be compared with the live Firebase value and approved by Data Science |
| Entity-selection rule | exact horse ID plus the monitor assignment effective for each instant; multiple adult horses or overlapping assignments fail closed |
| Requested time range | exactly 86,400 elapsed seconds ending at the selected instant |
| Effective time range | no rounding to midnight or end-of-day; response echoes `starts_at` and `ends_at` |
| Organization timezone | organization IANA zone for labels only; elapsed window remains 86,400 seconds across DST |
| Canonical unit | integer seconds |
| Display-unit conversions | h/min formatting only |
| Resolution/aggregation | backend-owned; response returns category durations and observation coverage, not raw samples |
| Thresholds/categories | candidate labels: Resting, Awake, Out of Stall; Unknown is the unclassified remainder. Final wording and calculation pending |
| Missing-data meaning | Unknown/unavailable, never Awake, Out of Stall, Resting, or zero |
| Partial-data meaning | known category seconds plus explicit unknown seconds and coverage; never scale a partial window to 24 h |
| Ambiguous/multiple results | unavailable with reason `ambiguous_assignment`; never choose the first relation/series |
| Freshness/staleness | response includes `generated_at`; maximum age and stale copy pending |

Proposed response fields consumed by mobile: `contract_version`, `horse_id`,
`starts_at`, `ends_at`, `organization_timezone`, `categories[{id,seconds}]`,
`unknown_seconds`, `observed_seconds`, `generated_at`, `state`, `reason`.
Invariants: all durations finite non-negative integers; known plus unknown equals
86,400 within a 60-second rounding tolerance; duplicate category IDs, wrong horse,
wrong version, or overflow fail closed.

## 4. Ownership boundary

**Data Science/backend:** metric selection; resting/awake/out classification;
horse-monitor identity; coverage; duration aggregation; missing-data reasons.

**Allowed on mobile:** schema/invariant validation, duration formatting, Unknown
remainder validation, and chart geometry.

**Forbidden on mobile:** inferring awareness from posture; subtracting raw sensor
signals into customer categories; interpreting absent series as out of stall;
selecting the first assignment; normalising an overflow.

**Delivery path:** backend observation API. Until it exists, the current fixture
path remains preview-only; no temporary direct-query production exception is
approved.

## 5. Presentation

| Decision | Answer |
|---|---|
| Chart family | composition |
| Primary message | the observed 24-hour whole and what remains unknown |
| Series | approved categories plus Unknown |
| Axes | none |
| Legend | duration list doubles as the legend |
| Tooltip | none; exact values are always printed |
| Colour/token roles | semantic chart tokens only; Unknown uses the dashed neutral treatment |
| Reference/threshold lines | none |
| Phone layout | one full-width flat band; exact list beneath |
| Tablet layout | same information; width may expand, meaning does not change |
| Text summary | `24 hours ending 2:30 PM`, followed by each duration and Unknown |

The flat band is simpler than the legacy donut and guarantees that every visible
part belongs to the same whole.

## 6. Interaction

No tooltip, zoom, pan, toggles, or full-screen mode. The selected Horse Detail
time controls the window. Linking a segment to events/video requires separate
product approval.

## 7. Honest states

| State | Display and behaviour |
|---|---|
| Loading | stable skeleton for band and rows |
| Refreshing with cached data | keep values visible; show refresh affordance |
| No data | `No observations for this period`; no empty band or zero durations |
| Out of stall / not applicable | show only when the approved contract explicitly classifies it |
| Stale | keep values with age label once the freshness threshold is approved |
| Partial | render known parts plus visible dashed Unknown |
| Unavailable/error | explanatory unavailable state and retry; no derived fallback |
| Unsupported device/model | `This monitor cannot provide this breakdown` |
| Ambiguous entity/results | unavailable; never use the first stall/series |

## 8. Real data and scalability

The legacy 25-hour contradiction was measured on sm-1272/sm-1275/sm-1212 and is
the primary regression case. Before approval, capture the live Remote Config
query and representative responses for a normal day, partial/offline window,
horse-out window, stall move, DST boundary, and multiple/ambiguous assignment.

**API/request bound:** one response, one horse, one 86,400-second window, at most
the approved category count plus metadata. **Level of detail:** one segment per
category, not raw samples. **Full-screen chart count:** one.

## 9. Acceptance evidence

- [x] Domain tests reject negative, non-finite, duplicate and overflowing fixture data.
- [x] The rebuilt domain shows Unknown remainder instead of normalising it away.
- [ ] Version/entity/unit and exact category-boundary contract tests.
- [ ] Live Remote Config value reconciled against the changelog candidate.
- [ ] Real normal, partial, out, offline, ambiguous-assignment, DST and maximum fixtures.
- [ ] Light/dark, large text, VoiceOver/TalkBack, physical iPhone and mid-range Android.
- [ ] Destination screen tested with all sibling charts mounted.

Current fixture tests are implementation evidence, not Data Science approval.

## 10. Decision and change history

| Date | Change/decision | Approved by | Evidence/version |
|---|---|---|---|
| 2026-08-21 | One composition band plus duration list; Unknown visible | Inakshi | product review, register |
| 2026-08-23 | Posture→awareness and missing→out conclusions withdrawn | engineering review | register correction record |
| 2026-08-27 | Shipping, history and changelog reconciled; latest candidate recovered without claiming approval | Codex, factual audit | this specification |

## 11. Exceptions and remaining risks

No production exception is approved. Remaining gates are: live Firebase value;
named Data Science approval of the category query/wording and walking removal;
effective-dated horse identity; missing/partial/stale rules; versioned backend
response; representative real-data and physical-device evidence.
