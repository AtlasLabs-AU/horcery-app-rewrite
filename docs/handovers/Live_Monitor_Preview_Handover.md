# Live Monitor Preview — handover

- **Written:** 2026-08-20 (Claude), for the implementing agent
- **Goal owner:** Inakshi — "I want to see how the data looks on the new charts
  we have built in the For You page", with the video feed alongside
- **Branch:** `rnd`. Stage by explicit path only — other agents share this
  checkout. Never `git add -A`.

## 1. What you are building, in one paragraph

A **dev-only preview screen** (Protos tab) showing three real production stall
monitors side by side: each one's **live video feed** and, beneath it, the
**same Lying Down chart component the For You card renders** — fed by real
Prometheus data fetched from that monitor, instead of the fixture the card uses
today. No changes to the For You page itself. The entire point is that the
chart pixels Inakshi sees are produced by the very component that will ship,
drawing the very data production emits.

## 2. Ground truth — verified 2026-08-20, do not re-derive

All three endpoints answer **without authentication**. Measured live:

| Monitor | Prometheus base | Live video manifest | Last-24 h lying down |
|---|---|---|---|
| sm-1275 | `https://n1.dat.use.wg0.horcery.com/sm-1275` | `https://api.horcery.com/stream_management/live_stream/video/1275/6/manifest.m3u8?quality=low` | **no series** (horse observed out of stall) |
| sm-1272 | `https://n1.dat.use.wg0.horcery.com/sm-1272` | `.../video/1272/6/manifest.m3u8?quality=low` | 199 min |
| sm-1212 | `https://n1.dat.use.wg0.horcery.com/sm-1212` | `.../video/1212/6/manifest.m3u8?quality=low` | 171 min |

sm-1275 is not an error to route around. It is the register's
"`no-observations` must never be drawn as zero" rule occurring in production,
and the preview exists partly to show that state rendered honestly. If your
screen shows sm-1275 as "0 min", you have built the exact bug this chart's
model was designed to make impossible.

The API shape is standard Prometheus:

- Range query: `GET {base}/api/v1/query_range?query=…&start=…&end=…&step=60`
- Response: `{"status":"success","data":{"resultType":"matrix","result":[{"metric":{…},"values":[[epoch,"0|1"],…]}]}}`
- `data.result` **is already** the `PrometheusRangeSeries[]` the chart model
  takes. You decode, you do not transform.

### The two queries (spec-approved forms — copy exactly)

Detection (`docs/architecture/chart-specs/horse-lying-down-daily.md` §3,
including the one-character `animal_type="horse"` correction of §11-E1 —
**do not "fix" the casing back**; the PR 1928 form returns zero series on
every monitor):

```promql
round(clamp_max(avg_over_time(horse_sitting_per_id{animal_type="horse"}[1m30s:30s] offset -1m),1))
```

Coverage denominator:

```promql
horse_in_stall
```

Window: 7 barn days ending today, `step=60` (spec: "7 days at 60 s step per
horse per query"). Two queries per monitor, six requests per load. No polling —
pull-to-refresh refetches; give the queries `staleTime` of 5 minutes.

## 3. The seam — where live data enters

`src/charts/lying-down.ts` exports:

```ts
buildLyingDownWeek({
  result,          // detection response's data.result — raw
  inStallResult,   // coverage response's data.result — raw
  dayStartHour,    // 6 (Horcery default; see §5 assumption A2)
  selectedDate,    // today as yyyy-MM-dd in `zone`
  zone,            // see §5 assumption A1
  now,             // DateTime.now().setZone(zone)
}): LyingDownWeek
```

Then render with the existing components, exactly as
`src/components/for-you/behavior-tracker-card.tsx` does for fixtures:
`LyingDownRow` (`src/components/charts/lying-down-row.tsx`) takes
`{ horseName, week, verdict, averageSeconds, usualCurve?, width }`;
`verdict` comes from `lyingDownVerdict(…)`, and `averageSeconds` /
`usualCurve` may be derived with the same helpers the card already uses
(`sampleUsualCurve` is fixture-only — if the card path uses it for the usual
curve, mirror the card; do not invent a new derivation).

**If a chart component cannot render the real data without modification, stop
and report it.** That is a finding — the most valuable kind this preview can
produce — not a licence to fork or patch the component locally.

## 4. Files

New:

| File | What |
|---|---|
| `src/config/constants/live-preview-monitors.ts` | The three monitors: id, label, Prometheus base URL, video manifest URL. One place, so removal is one deletion |
| `src/services/prometheus/monitor-range.ts` | `fetchLyingDownWeekInputs(baseUrl, {zone, now})` → issues the two range queries, decodes, returns `{ result, inStallResult }`. **Prometheus knowledge is confined to `src/services` + `src/config` by the default-deny lint boundary** (`eslint.config.js`); a fetch or PromQL string anywhere else will fail lint, correctly |
| `src/hooks/use-live-monitor-week.ts` | React Query wrapper per monitor: key `['live-preview', monitorId, day-slice]`, `enabled` by the flag, `staleTime` 5 min |
| `src/app/proto-live-charts.tsx` | The screen (§6) |
| tests | §8 |

Touched:

| File | Change |
|---|---|
| `src/config/previews.ts` | New flag `liveMonitorPreview: __DEV__ && optedIn`, comment in house style. Note this preview is the *inverse* of the others — it shows REAL data in a dev shell, not fake data in a real shell — and say so in the comment |
| `src/app/(tabs)/explore.tsx` | One link row, `testID="proto-live-charts-link"`, rendered only when the flag is on — follow the existing rows at lines ~99–122 |
| `docs/architecture/CHART_AND_QUERY_REGISTER.md` | `horse-lying-down-daily` Delivery column: append "dev-only live preview path (Protos → Live monitors) since 2026-08-20" — do NOT change its status; DS approval is still pending |
| `docs/architecture/chart-specs/horse-lying-down-daily.md` | §11 history line: live-preview evidence, dated, with the measured figures from §2 |

## 5. Assumptions — surfaced to Inakshi in chat, build against them unless she overrides

- **A1 — timezone.** We do not know the owning organization's timezone (the
  proper path reads it from the org record; this preview has no org). Use a
  named constant `PREVIEW_ZONE = 'America/New_York'` (the `use` in the
  hostname is Horcery's US-East node naming) and **print it on screen**:
  "Barn day assumed America/New_York · 6 AM start". A wrong zone shifts where
  the barn day cuts; saying the assumption out loud is what makes the preview
  honest instead of quietly wrong.
- **A2 — day start.** `dayStartHour: 6`, the Horcery default
  (`dayStartHourFrom(undefined)` — use the exported helper, don't inline a 6).
- **A3 — horse names.** The monitors' `id` labels are opaque
  (`some-unique-uuid`). Row titles are "SM-1275", "SM-1272", "SM-1212".
- **A4 — production URLs in the repo.** The three endpoint URLs are committed
  in a dev-only constants file in a private repo, flagged for Inakshi's
  sign-off. They contain no credentials.

## 6. The screen

Plain dev screen — Protos-tab standard, not editorial polish. Per monitor, one
block:

1. **Header row**: "SM-1272" + a live/paused indicator. Use `SplitRow`
   (`src/components/ui/split-row.tsx`) — never a bare
   `row + space-between + shrinking label`; that layout is banned by
   PRINCIPLES #13.
2. **Video**: `MediaTile` (`src/components/media/media-tile.tsx`) —
   `posterUri` unset is fine, `videoUri` + `live` when playing, muted.
   **One player at a time across the whole screen** (`playingId` state, the
   pattern of `horses/[id].tsx`'s `onToggleEvent`): three simultaneous HLS
   decoders is a memory bug, not a feature. Tap toggles; `onPlaybackError`
   clears and shows "Stream unavailable".
3. **Chart**: `LyingDownRow` fed from the hook. While loading: the existing
   chart loading state (`ChartStateSurface` via the row's own state handling —
   whatever the For You card does, mirror it). On fetch error: an error state
   with retry — **never an empty chart**, and never `null` rendered as zero.
4. A footer note: "Live production data · read-only preview · assumed
   America/New_York, 6 AM barn day".

Scroll view, pull-to-refresh refetching all six queries. Dark and light must
both be correct (tokens only — the no-color-literals test will catch you).

## 7. Traps, from this repo's own history — read before coding

- **RNTL v14 is async everywhere**: `await render(...)`, `await
  fireEvent...(...)`. A missing `await` produces "overlapping act()" noise and
  assertions against the previous tree; the console guard fails the suite.
- **React Compiler lint is an error, not a warning.** No `x.value`-style
  mutation of hook returns, no `setState` in effect bodies without cause,
  `useCallback` deps must include setters. See `scrub-timeline.tsx`'s header
  comments for the house patterns.
- **`jest.setup.js` already mocks `expo-video`** (with `addListener`). Don't
  re-mock it locally.
- **Metro/dev-client**: relaunch via the deep link
  `horceryapprewrite://expo-development-client/?url=http%3A%2F%2Flocalhost%3A8083`
  — Fast Refresh is unreliable in this project; restart the app instead
  (`docs/runbooks/Horcery_App_Agent_Runbook.md`).
- **Preview flags need the env opt-in**: `EXPO_PUBLIC_ENABLE_PREVIEWS=true`
  must be set for the Metro process or every flag is off and your screen link
  never renders.
- **The simulator device `09C755C6-BF27-4AC2-8D97-A9DA4C5E5442` (iPhone 17
  Pro) belongs to another session** — use the iPhone 17 Pro Max
  `53E8803D-9969-4B67-9130-38E560DD8622`.

## 8. Tests (all pure — no network in jest)

1. **URL builder**: `monitor-range.ts` builds the two exact query URLs for a
   fixed `now`/zone — assert query string verbatim, including the corrected
   `animal_type="horse"` (this pins §11-E1 against a well-meaning revert).
2. **Decode**: a *captured real response* (fetch one from sm-1272 during
   development, truncate to a few hundred points, save as a fixture file with
   a comment naming its origin and date) decodes to `PrometheusRangeSeries[]`
   and feeds `buildLyingDownWeek` without error; assert the day totals it
   produces.
3. **Empty result** (the sm-1275 case): `result: []` produces a week whose
   today has `coverage: 'no-observations'` and `totalSeconds: null` — never 0.
4. **Flag gating**: with `liveMonitorPreview` false the Protos link does not
   render (mirror `previews.test.ts` house style).

## 9. Acceptance — all of it, on device

- `npm run check` green (lint 0 warnings, typecheck, all tests).
- On the iPhone 17 Pro Max dev client, flag on: Protos → Live monitors shows
  three blocks; **sm-1272 and sm-1212 draw real cumulative lines whose today
  totals are plausible against §2**; **sm-1275 shows the honest no-data
  state, not a zero line**; tapping a video plays live footage; tapping a
  second stops the first; pull-to-refresh works; error state reachable
  (airplane-mode the sim or point one URL at nonsense locally to check —
  don't commit that).
- **Text-size pass (runbook §6a, mandatory)**: default, XXL, one accessibility
  size — relaunch the app after each change; no `…`-truncation anywhere on the
  screen.
- Light and dark screenshots to `outputs/live-preview/`, named
  `live-preview-{light,dark}[-size].png`.
- Register + spec updated per §4.
- Committed on `rnd` by explicit path, message in house style (what, why, what
  was verified on device, evidence paths), pushed.

## 10. Out of scope — do not do these

- Any change to the For You page, the Behavior Tracker card, or any
  `src/charts/**` / `src/components/charts/**` file. Findings there get
  *reported*, not fixed inline.
- People in Stall / Horse in Stall live wiring (their meaning is still blocked
  in the register).
- Polling, background refresh, or any write to any endpoint.
- The "real path" (org → stalls → `prometheus_url`) — that is Option B,
  blocked on an org-membership question with Inakshi.
- Recorded/scrubbing video on this screen — live manifests only.

## 11. Report back

What was built · what the three monitors actually showed (numbers) · every
deviation from this document with its reason · findings about the chart
components under real data · anything in §5 that turned out wrong.
