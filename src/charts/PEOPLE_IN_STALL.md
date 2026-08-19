# People In Stall — behaviour catalogue

The first chart the §6a renderer spikes are judged on. Everything a renderer must
do, characterised from the current app (`prometheus-bar-chart-widget-v3` +
`compound-bar-chart.ts` + `human-in-stall-prometheus-chart-widget`, read
2026-08-15, repo read-only). The data half is executable —
[`occupancy-timeline.ts`](./occupancy-timeline.ts) with
[its tests](./__tests__/occupancy-timeline.test.ts) — and both spikes render the
[fixtures](./fixtures/people-in-stall.ts). This page is the visual and
interaction half.

**What it is:** a seven-row occupancy timeline. One row per day, midnight to
midnight across; a rounded bar wherever a person was in the stall; two colours
for *with the horse* / *without the horse*; pinch to zoom the day; tap a bar for
the exact window and headcount.

---

## 1. Data

| | Current app | Rewrite |
|---|---|---|
| Source | Prometheus range query, `HUMAN_IN_STALL_DETECTION_QUERY` from Remote Config, fallback `humanInStall` in `prom-utils` | Same PromQL for now, requested through the data layer only (§6a: query ownership moves server-side) |
| Window | 7 days ending on the selected date, `start` = day-6 00:00, `end` = day+1 00:00:01 | Same. The selected date is a **calendar date** (`yyyy-MM-dd`), never an instant — see quirk 6 |
| Step | 90 s | Same |
| Series | Two, by `Event_Type`: `Human_Interaction` (**With Horse**), `Human_Presence` (**Without Horse**). Mutually exclusive at any instant | Same |
| Threshold | 0.2 (`humanInStallThreshold`) — samples ≤ 0.2 are "nobody" | Same |
| Count | `Math.round(value)` → "No. of people" | Same |
| Day boundary | **Phone's** zone (`DateTime.local()`) | **Organization's** zone (§6c) — see quirks |
| Future samples | Dropped (`t > now`) | Same |
| Open bar at day end | Synthetic close at 23:59:59.999 (today: at `now`) | Close at next midnight (today: at `now`) — 1 ms difference |

## 2. Rows and axes

- **Rows:** 7, oldest at the **top**, selected date at the bottom (`inverse: true` on the category axis). Row label `MMM dd` ("Aug 14"), colour `#64748B`, right-aligned, 20 px margin.
- **X axis:** local 00:00 → 24:00, one tick per hour, label `h a` ("12 AM" … "11 PM", "12 AM"), colour `#64748B`, first and last always shown, overlapping labels hidden. No axis line, no tick marks, no vertical grid lines.
- **Row guide:** a 1 px line the full width of each row, `#f8fafc` (barely visible on white — a subtle track).
- **Chart height:** 300 px total; grid = container width − 30 px; phone grid height auto, tablet 85 %.

## 3. Bars

- Rounded rectangle, **16 px tall**, corner radius **4 px** (multi-series; single-series charts use 5), centred on the row.
- **Minimum width 1 px** — a 90-second visit must still be visible.
- Colours: With Horse `#0369A1`, Without Horse `#7DD3FC` (light-mode legacy hex; the rewrite maps these to tokens — token names are a design decision, not this catalogue's).
- Clipped to the plot area when zoomed.
- People In Stall does **not** use the count-graded palette (`one/two/three/fourPlus`); the sibling charts may.

## 4. Zoom and pan

- Pinch to zoom on the time axis only; drag to pan when zoomed.
- **Never narrower than 10 % of the day (2.4 h); never wider than the day.**
- Zoom does not filter data (`filterMode: 'none'`) — bars slide, they do not disappear and reappear.
- Zoom state resets when the data changes (the chart is re-keyed on width and data state).

## 5. Tooltip

- Trigger: tap on a bar. Hidden after **2 s**. Confined to the chart.
- Content, exactly:
  ```
  2026-08-14  |  7:02 AM - 7:41 AM
  No. of people: 2
  ```
  (`intervalTooltip()` produces this.) White background, no border.
- Crosshair (`axisPointer: 'cross'`, snapping) shown while the tooltip is up.
- Position: phone — 40 px above the finger; tablet — 190 px to the left and 40 px up.
- **Near-tap hint:** tapping empty row space within **1 hour** of a bar, while further zoom is possible, shows the text **"Zoom to click"** in that bar's colour for a moment. (Tiny bars are hard to hit; this tells the customer to pinch in.) `tooltip-helper.ts nearClickHandler`.

## 6. Legend (multi-series only)

- Two entries, 8 px circle swatches, 12 px text `#64748B`, padded 8 px vertically.
- Phone: centred, 1 % from the bottom. Tablet: 35 % from left, −3 % from bottom.
- Hidden in the no-data state.

## 7. States

| State | When | Shows |
|---|---|---|
| **Loading** | query in flight, or processing, or container width still 0 | ChartWrapper's loading presentation; no bars |
| **Data** | result has ≥ 1 series | rows + bars + legend |
| **Quiet** | result present, nothing above threshold | seven **empty rows** with axes and legend — this is **not** "No Data" (fixture `quiet-week`) |
| **No data** | `result` is `[]` | rounded overlay (r 12) over the plot area, text **"No Data Available"**; series, tooltip and legend cleared; tablet overlay offset 35 % from left |
| **Error** | query failed | same overlay, text **"Something went wrong.\nPlease try again later."** |

## 8. Header (around the chart, not inside it)

- Title **"People In Stall"**, with the More/export icon aligned to the title.
- **"Watch Clips"** link → `/review-history?eventTypes=204,205&selectedDate=…&from=animal|stall&animalId=…&stallId=…` (not shown for `space` relevancy).
- Selected date comes from the animal/stall/space detail store; changing it moves the seven-day window.

## 9. Legacy quirks — and what the rewrite does about them

Each is a deliberate departure, recorded so nobody "fixes" it back.

1. **Days cut in the phone's zone.** A manager travelling two zones east sees the barn's day shifted by two hours, and midnight in the wrong place. → Cut in the **organization** zone (§6c). Test: *"cuts days in the ORGANIZATION zone"*.
2. ~~Clock time projected onto a fixed 1970 date slides bars on daylight-saving days.~~ **Withdrawn (2026-08-15).** That claim was wrong. `normalizeToBaseDate` positions bars by **local clock time**, which is precisely what seven rows sharing one hour axis need — 7 AM lines up straight down the chart. **Kept, deliberately** (`positionInDay`). What clock alignment actually costs, twice a year between 1 and 3 AM, is recorded and tested rather than "fixed": on the **spring-forward** day one real hour across the gap draws two clock hours wide; on the **fall-back** day the repeated 1 AM hour **overlaps** itself and a bar spanning it draws with zero width (the renderer's 1 px minimum keeps it visible). Positioning by real elapsed time would fix both and break the vertical scan for every hour after 2 AM on that day. Tests: *"positions by CLOCK time"*, *"pays for clock alignment twice a year"*; fixtures `daylight-saving`, `daylight-saving-fall-back`.
3. **The +89 s stretch.** A bar that happens to end on the last sample of the day (23:58:30) is extended to 23:59:59 to hide a hairline gap — painting 90 s of presence that did not happen. → Dropped. Test: *"does NOT stretch a bar that ended at 23:58:30"*.
4. **The `queryFRC` `useMemo` bug** (People In Stall report to the dev team) — the query is captured before Remote Config resolves. → Not a chart concern; the data layer requests the query and the hook rule (`exhaustive-deps: error`) makes the pattern a build failure.
5. **`Number(x) > threshold` on strings** — works, but silently; the rewrite parses once and types the count.

6. **The selected date travels as an instant.** The detail stores hold a Luxon `DateTime`; converting it into the barn's zone can move it to the previous or next calendar day (midnight on the 14th in Colombo is the 13th in Chicago), so a travelling manager can be shown the wrong week. → The domain layer accepts a validated `yyyy-MM-dd` string only, interpreted in the organization zone. Tests: *"takes the selected date as a CALENDAR date"*, *"rejects anything that is not a plain yyyy-MM-dd date"*.

**Fall-back day (a fact of clocks, not a legacy quirk):** with a shared clock axis the 25-hour day's repeated 1 AM hour is drawn **once**, and anything in the second 1 AM overlaps the first. A renderer must at least draw the overlapping bars distinguishably (e.g. the later one on top with the 1 px minimum honoured) rather than merge or drop one; whether to hint at the fold — a subtle tick, "1 AM ×2" — is a design call to make once, in the adapter, and is on the parity checklist so it cannot be dodged.

Not changed, but noted for design: **oldest day at the top**. Newest-at-top may read better on a phone; that is a design decision to raise, not a spike criterion.

## 10. What the spikes measure against this

Both renderers must produce **all** of §2–§7 from the same `OccupancyTimeline`. Then, per §6a weights, on the same device and build:

- **Accuracy (rejection gate)** — identical input must retain timestamps, intervals,
  counts, series meaning, missing-data meaning, organization-zone/DST behavior and
  level-of-detail semantics. Accuracy cannot be traded for speed or cost.
- **Smoothness (30 %)** — frame rate during pinch-zoom and pan under **three loads**: `normal-week` (38 bars), **observed-heavy** (the anonymised real response — see §11; not yet captured), and `worst-case` (6 720 one-sample bars, the theoretical ceiling). The ceiling uses the approved bounded overview, then exact source intervals once the visible count is at most 1,000; rendering 6,720 literal bars at once remains a diagnostic, not a readable product state. `dense-week` (374) is a mid-point, not a ceiling. Mount time of the seven-row chart at each load.
- **Reliability / memory (25 %)** — no leak across 50 mount/unmount cycles; no crash on `no-data` → `normal-week` → `no-data` transitions.
- **Whole-catalogue scalability (20 %)** — representative continuous time-series
  and mixed/annotated-series slices reuse the same adapter architecture without
  chart-specific framework code or duplicated interaction logic.
- **Parity (15 %)** — the checklist above, ticked one by one; screenshots beside the current app.
- **Cost (10 %)** — bundle delta, native build friction, licence.

**Rejection gates:** cannot hit 60 fps on pan of `normal-week` on the mid-range Android; cannot safely accept `worst-case`, present a useful bounded overview, or restore exact intervals on zoom; falls over (crash, >1 s interaction frame, unbounded memory); cannot render `quiet-week` distinctly from `no-data`; cannot expose bounded interval pages to the accessibility tree.

**Where results count:** simulator and emulator runs establish parity, build compatibility, developer ergonomics and *large* performance differences. **They do not pick the winner.** The final acceptance is a **release build on a physical mid-range Android**; if there is no office device, borrowing or buying one is justified — the cost is trivial beside committing the whole app to the wrong chart stack.

Manual VoiceOver and TalkBack validation is deferred from this renderer spike.
The existing renderer-independent semantic layer and automated tests stay; spoken
screen-reader validation returns as a pre-release shipping gate.

## 11. Open items

- [ ] Capture **one anonymised real response** (QA org, a busy stall, 7 days) as the **observed-heavy** load. Synthetic fixtures cannot reveal missing or irregular samples, unexpected series or metric labels, Prometheus's own quirks, or the bar counts a real barn produces. Needs the QA login and a stall's `prometheus_url`. It is a **pre-beta reversal check** for the selected Victory adapter, not a reason to keep two production renderer implementations alive.
- [ ] Confirm the **mid-range Android** the final measurement runs on. The emulator ranks the two renderers; it cannot certify "no dropped frames on a customer's phone".
- [ ] Token names for the two series colours (design).
- [ ] Newest-at-top vs oldest-at-top (design; not a spike criterion).
- [ ] How the adapter shows the folded 1 AM hour on the fall-back day (design; on the parity checklist).
