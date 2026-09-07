# Chart specification — Lying Down timeline (Horse Details)

- **ID:** `horse-lying-down-timeline`
- **Brief:** `../../../../84-horcery-app-react-native/docs/requirements/2026-09-07-lying-down-chart-accuracy.md`
- **Built:** 2026-09-07 on `rnd`, fixture-only behind `PREVIEWS.lyingDownTimelineSampleData`
- **Decision owner:** Inakshi (presentation, 2026-09-07 mockup v3)

## 1. Customer question

When, over the last seven days, was this horse lying down — and where do we
simply not know?

## 2. Presentation

The original chart — bars on plain day rows, oldest at the top, today last, a
24-hour axis, tap a bar for its exact times and duration — plus **exactly one
addition**: a dashed **"No readings"** stretch wherever there is nothing to draw.

Decided against (mockups v1–v2): a pale "up" track, a separate "before this
stall" state, and any caption sentence. One dashed state covers both a camera
outage and the hours before the horse was assigned here; the customer's honest
statement is the same in both cases, and the chart claims no more than the data
supports.

## 3. Meaning and contract

| | |
|---|---|
| Source metric | `horse_sitting_per_id{animal_type="horse"}` — the query the app runs (the raw metric's unlabelled historical streams are excluded by that filter, verified 2026-08-23) |
| Query | `round(clamp_max(avg_over_time(horse_sitting_per_id{animal_type="horse"}[1m30s:30s] offset -1m),1))` |
| What a sample means | Metadata HELP: *"fraction of time in the prometheus window the horse was sitting (0.0–1.0)"*. With this query, a sample stamped T is the 90 s ending at T − 1 min, rounded to 0/1. A positive supports the window BEHIND it. |
| Bout end | The last positive sample. Never extended to midnight, to now, or by one step. The legacy `+89 s` at 23:58:30 (`widget-v3:146`) is not carried over. |
| Gap tolerance | Silence beyond 4 × the measured sample cadence, floor 5 min. A bout breaks at a gap; the gap draws dashed. |
| Day boundary | **Midnight in the organization's zone** — the legacy timeline's rule, decided with the mockup, not the Behavior Tracker's 6 AM. |
| Several streams | Unioned (highest value per instant), opt-in because the signal is binary. Measured 2026-08-23 on sm-1272: three streams, zero simultaneous positives. The meaning of `id` is still Data Science's. |
| Stall assignment | The assignment's `created_at` is the one fact available. Samples before it are the previous occupant's and are dropped, so the stretch reads "No readings" through the same mechanism as an outage. Stitching a KNOWN previous stall waits on the assignment-history API. |
| Visual vs measured | A bar is widened to 4 pt so a single reading can be seen and tapped; its duration is the samples' (a 30 s reading reports "30 s", not "1 min"). |
| Missing vs zero | No samples → dashed, `state: 'no-data'` for an empty response. Observed all day with no rest → a real, empty row. Never conflated. |

## 4. Acceptance (brief §4) → tests

All eight in `src/charts/__tests__/lying-down-timeline.test.ts`, expected values
written before the code ran:

1. normal bout — duration equals what the samples support
2. outage between positives — two bouts, unknown between, ≤ 2 h counted
3. recording stops while down — ends at the last sample
4. single sample and 23:58:30 — 30 s, no +89 s
5. two tracks of one horse kept; overlapping tracks count once
6. pre-assignment readings unknown, earlier days wholly unknown
7. midnight crossing through spring-forward — 4 elapsed hours, 23-hour day
8. empty → no-data; observed-never-down → zero

Component: `src/components/charts/__tests__/lying-down-timeline.test.tsx`.

## 5. Named blockers (brief §5 — do not claim complete)

- **Horse identity:** `id` is a tracking identity, not confirmed as a Horcery
  horse. Union is safe on the evidence; attribution to *this* horse is not
  proven by the data.
- **Assignment history:** only the current assignment's start is available.
  Whether earlier (soft-deleted) rows are returned is unverified.
- **Remote Config:** the legacy app can replace this query at runtime
  (`ANIMAL_SITTING_DOWN_DETECTION_QUERY`). What customers currently receive was
  not captured; the fallback was analysed.
- **Legacy PRs:** #2298 (capital-H `animal_type`) would return zero series —
  measured; #2313's interval-end change matches this spec's rule and is
  superseded by it; #2285 is unrelated. None were merged or patched here.
