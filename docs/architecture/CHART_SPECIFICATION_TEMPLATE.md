# Chart specification template

Copy this file for every proposed chart before implementation. Replace all
bracketed text. Unknown meaning, units, thresholds or ownership blocks the chart;
do not guess.

**Before writing PENDING or unknown anywhere in this document, search the sources
named in `AGENTS.md` under "Check before you record ignorance", and record which
ones you searched in §1.** An unknown that was written down without looking is
worse than no entry: it reads as an established fact, and it sends someone to ask
another team a question they have already answered.

The completed specification must comply with
`docs/architecture/CHART_ENGINEERING_STANDARD.md`.

## 1. Identity and approval

| Field | Answer |
|---|---|
| Chart ID | `[stable-id]` |
| Working title | `[customer-facing title]` |
| Status | `proposed / meaning-blocked / data-blocked / approved / building / verified / shipped / backfill-required / retired` |
| Screens | `[where it appears]` |
| Entity | `horse / stall / space / organization / other` |
| Data Science owner | `[name]` |
| Data Science approval | `[date or pending]` |
| Product owner | `[name]` |
| Product approval | `[date or pending]` |
| Engineering owner | `[name/agent]` |
| Backend owner | `[name/team]` |
| Sources searched | `[which of the shipping app, the transcript digest, Drive sheets and repo docs were actually searched, and when]` |

## 2. Should this be a chart?

**Customer question:** `[one sentence]`

**Customer decision or understanding it supports:** `[plain English]`

**Why a number, score card, sentence or table is not clearer:** `[answer]`

**Legacy reference, if any:** `[path/screenshot/behaviour; evidence only]`

**Decision:** `build / simplify / combine / replace with non-chart / remove`

## 3. Meaning and data contract

| Field | Approved definition |
|---|---|
| Observation/API ID | `[name]` |
| Contract version | `[version]` |
| Query version/provenance | `[Data Science source and date]` |
| Entity-selection rule | `[exactly which horse/stall/etc.]` |
| Requested time range | `[range and maximum]` |
| Effective time range | `[rounding/boundary rules]` |
| Organization timezone | `[source and DST rule]` |
| Canonical unit | `[unit]` |
| Display-unit conversions | `[metric/imperial rules]` |
| Resolution/aggregation | `[interval and owner]` |
| Thresholds/categories | `[values, labels, inclusive/exclusive boundaries]` |
| Missing-data meaning | `[not zero unless explicitly approved]` |
| Partial-data meaning | `[rule]` |
| Ambiguous/multiple results | `[fail-closed rule]` |
| Freshness/staleness | `[maximum age and label]` |

Attach or link the versioned response schema. List every field consumed by the
mobile domain layer and every invariant it validates.

## 4. Ownership boundary

**Data Science/backend calculations:** `[all semantic calculations]`

**Allowed mobile presentation transformations:** `[unit conversion, formatting,
geometry/culling only]`

**Calculations explicitly forbidden on the phone:** `[list]`

**Delivery path:** `backend observation API / temporary rebuild adapter`

If temporary:

- Reason: `[why the API is unavailable]`
- Query location: `[version-controlled service-layer path]`
- Owner: `[name]`
- Removal condition/date: `[specific milestone]`
- Production exception approved: `[no, or date + approver]`

## 5. Presentation

| Decision | Answer |
|---|---|
| Chart family | `score / interval / line / area / bar / composition / other` |
| Primary message | `[one thing]` |
| Series | `[names and meanings]` |
| Axes | `[labels, units, bounds]` |
| Legend | `[required or why not]` |
| Tooltip | `[exact content and formatting]` |
| Colour/token roles | `[tokens; no screen literals]` |
| Reference/threshold lines | `[meaning and labels]` |
| Phone layout | `[dimensions/placement]` |
| Tablet layout | `[placement or not applicable]` |
| Text summary | `[equivalent plain-language summary]` |

Explain why the selected visual is simpler and more truthful than the reasonable
alternatives.

## 6. Interaction

| Interaction | Required? | Reason and bounds |
|---|---:|---|
| Tap inspection | `yes/no` | `[answer]` |
| Tooltip | `yes/no` | `[answer]` |
| Pinch zoom | `yes/no` | `[why static range is insufficient]` |
| Pan | `yes/no` | `[limits]` |
| Reset zoom | `yes/no` | `[method]` |
| Series toggle | `yes/no` | `[why needed]` |
| Full screen | `yes/no` | `[separate product approval]` |
| Link to video/event | `yes/no` | `[destination and timestamp rule]` |

Document scroll/gesture conflict handling and how every interaction changes
presentation without changing meaning.

## 7. Honest states

Define the exact customer-facing result for each applicable state:

| State | Display and behaviour |
|---|---|
| Loading | `[answer]` |
| Refreshing with cached data | `[answer]` |
| No data | `[answer]` |
| Out of stall / not applicable | `[answer]` |
| Stale | `[answer, including age]` |
| Partial | `[answer]` |
| Unavailable/error | `[answer]` |
| Unsupported device/model | `[answer]` |
| Ambiguous entity/results | `[answer; never guess]` |

## 8. Real data and scalability

| Fixture/load | Source | Volume/shape | Expected behaviour |
|---|---|---:|---|
| Normal | `[real monitor/date]` | `[count]` | `[answer]` |
| Realistic dense | `[real monitor/date]` | `[count]` | `[answer]` |
| Empty | `[source]` | `0` | `[answer]` |
| Partial/stale | `[source]` | `[count]` | `[answer]` |
| DST/midnight | `[source/constructed from contract]` | `[count]` | `[answer]` |
| Maximum supported | `[justification]` | `[count/bytes/range]` | `[answer]` |

**API/request bound:** `[maximum range, points/intervals and response size]`

**Level-of-detail rule:** `[how drawing work is reduced without changing meaning]`

**Full-screen chart count:** `[how many mount together on the destination screen]`

## 9. Acceptance evidence

### Automated

- [ ] Contract version/entity/unit validation
- [ ] Threshold and exact-boundary tests
- [ ] Missing/partial/ambiguous-result tests
- [ ] Organization timezone, midnight and DST tests
- [ ] Normal, dense and maximum-supported deterministic fixtures
- [ ] Labels, units, legend, tooltip and honest-state component tests
- [ ] Feature screen imports neither Victory nor Prometheus
- [ ] Regression test for each implementation defect found

### Physical devices

- [ ] Release-like mid-range Android: real data and realistic dense interaction
- [ ] Physical iPhone confirmation
- [ ] Light and dark
- [ ] All destination-screen charts mounted together
- [ ] Repeated navigation and memory settlement where applicable
- [ ] Phone and applicable tablet layout before beta
- [ ] Manual VoiceOver/TalkBack before release (may remain deferred during slice)

Evidence paths and build identifiers: `[links/paths/hashes]`

## 10. Decision and change history

Record approvals and every later change to query, threshold, unit, category,
aggregation, resolution, missing-data rule or presentation meaning.

| Date | Change/decision | Approved by | Evidence/version |
|---|---|---|---|
| `[date]` | `[initial decision]` | `[Data Science + Product]` | `[link]` |

## 11. Exceptions and remaining risks

For every exception, state the rule, reason, owner, date, expiry/removal condition
and tests that contain the risk. Write `None` when there are no exceptions.
