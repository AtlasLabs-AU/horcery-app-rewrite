# Review History ("See History") — Scope & Assessment

**Owner:** Inakshi · **Assessed by:** Claude · **Date:** 2026-08-15
**Status:** SCOPED, NOT BUILT. Held under the HOLD SCOPE rule (requirements
§6b) — this becomes a candidate slice once foundation hardening H1–H4 is done.
Old-app code references are to the read-only blueprint
`84-horcery-app-react-native`.

---

## 1. What it is today (customer's view)

"See History" from the For You **Review** card and from the alerts line both
open the same screen, `/review-history`, with different URL parameters. It is
also entered from twelve other places (charts, trends, Show Me, occupancy,
feed/water charts), each pre-filtering it via the URL.

- **One day at a time**: month/day strip; no date range; no grouping; future
  days selectable (always empty).
- **Filters**: Behavior (multi-select), Horse, Stall chips + "N results" +
  Reset. Hidden when arriving from a chart / Show Me.
- **List**: flat, newest first, FlashList. Each card: type icon, title,
  `dd LLL yyyy hh:mm a`, then **an autoplaying muted video** (behaviour events
  with duration) or a text panel; footer with animal/stall name (tap →
  summary at that time) and a type tag. Share/clip/comment icons exist but
  are hidden.
- **Tapping the card itself does nothing** (navigation commented out).
- **Read-only**: no mutations on this screen. "New" badges live only on For
  You, locally.
- States: skeletons, error+retry, two empty states, offline redirect.

## 2. Assessment of the current code — issues found

### P1 — customers see wrong data
| # | Issue | Where | Fix direction |
|---|---|---|---|
| D1 | **Behavior filter silently ignored** whenever `eventTypes` is in the URL (both alert entry points): chip, badge, count and empty copy respond, the query never does. Reset also inert. | `review-history-widget/index.tsx:289-290, 128-133, 213-222` | Prefer user selection over URL seed; drop the seed once the sheet is touched. |
| D2 | **Partial Rolling under-reports in history.** Filter sheet collapses 103/104/105 → For You re-expands, History never did; queries `105` only. | `filter-widgets/behavior-filter/index.tsx:80-88`; `review-history-widget:228-230` vs `review-cards-widget:198-202, 285-291` | Shared expansion helper in `behavior-constants.ts`, used by both. |
| D3 | **Lying Down missing from default history.** Uses `sitting` (570, raw pose) instead of `sitting_down` (100). For You uses 100. | `review-history-widget:163` | `eventTypeMap.sitting_down.id`. |

### P1 — stability at scale
| # | Issue | Where | Fix direction |
|---|---|---|---|
| D4 | **A live HLS player per visible card, never released**: release code commented out; `isInVisibleViewArea` declared, unused. Tablet 2-col + busy day → thermal, stutter, OOM. | `review-card/index.tsx:551-568`; `full-screen-view-widget/index.tsx:192-209, 526-530, 159` | Release on unmount; viewability-gated playback (or stills — see §3). |
| D5 | **Pull-to-refresh on "today" wipes the list**: sets date to `now()` → new query key → skeletons, lost scroll, no spinner, orphaned cache entry per pull. Introduced by the July "latest alerts missing" fix. | `review-history-widget:358-368` (commit `c09d33e71`) | Round end time to the minute (or `'now'` sentinel) + `refetch()`. |

### P2
| # | Issue | Where |
|---|---|---|
| D6 | No `page_size` sent (server default decides). | `:343-348` |
| D7 | Sort typo on For You: `'-start_time,-event type'` (space). | `review-cards-widget:305` |
| D8 | Day boundaries in **device** timezone + DST edge drop/dup; org has a timezone others honour. | `:271`; `api/event-management/event.ts:63` |
| D9 | Card is an a11y "button" with **no onPress**; nav commented out without a commit explaining why. | `:457-462, 417-424, 467` |
| D10 | Video/no-video decision differs between surfaces; helper duplicated, shared copy unused. | `:144-149` vs `review-cards-widget:123-125`; `event-helper.ts:83-87` |
| D11 | "New" store persists whole event objects; daily reset broken after any restart (DateTime rehydrates as string) → badge permanently stale, store bloats. | `app-usage-states/index.ts:38-42, 66-71`; `review-cards-widget:365-375` |
| D12 | No cache purge on org switch (only on logout). | `auth-utils.ts:57` |
| D13 | Date/filter state not reset between entries (one-shot URL effects). | `:92-126` |
| D14 | Horse/Stall chips seeded from URL show "Loading…" forever (TODO in code); double-filters `animal_id` + `animal_id__in`. | `:111-126` |
| D15 | Future dates selectable; `clamp` prop accepted and ignored. | `horizontal-calendar:54,60`; `horizontal-days:13,20` |

### P3
D16 dead code in `event-helper.ts`; D17 string/number pageParam mismatch; D18
`Math.random()` keyExtractor fallback remounts players; D19 non-memoised row
renderer, no `estimatedItemSize`; D20 screen width captured at module load
(rotation); D21 stale deps; **D22 the current app exposes manual notes +
reporter names without a permission gate** (resolved for the rewrite by the
2026-08-16 decision to remove Record/manual events entirely); D23 large
commented-out block in alert-stats; D24 event type 9 hardcoded twice.

### Deliberate today (confirmed by commits/comments)
Alerts excluded from default history (`a82ca49e3`); filters hidden from
chart/Show-Me entries (`827043977`); Partial Rolling collapsed to one row;
share/clip/comment hidden (`2656305db`); no server "reviewed" state;
event-type-specific empty copy.

### Git history = characterization-test targets
Reset-button visibility on alert variant (3 commits, Jul 2026); "latest
alerts missing" (`c09d33e71`); "alert showing as video" (`31c95f84a`, never
back-ported to For You); "add partial rolling" (`568e35e`, half done);
"events for animals without a stall" (`b23307ef7`); default-event-id filter
being removed / wrong selected-count / layout glitches on For You.

## 3. Product decisions (Inakshi, 2026-08-15)

- **Purpose: both** — a catch-up timeline by default, strong filters one tap
  away.
- **Read-only log.** No synced "reviewed" state; "New" stays a light local
  hint at most.
- **Legacy Record events are excluded (decision 2026-08-16).** The rebuilt app
  has no manual data-entry/Record feature. Stall Cleaning, Stall Check, Water
  Check and similar user-authored operational records are not History content;
  reporter names and manually entered notes are not displayed. This is an
  intentional product removal, not unfinished parity.
- **Changes approved vs today:** group by day + date range (replace the
  single-day strip); **barn (organization) timezone** for day boundaries;
  **alerts included by default** with an alerts filter (one unified
  history); **stills, tap to play** — no player per row.
- **One screen, honest filters:** every entry point (14 today) lands on the
  same History with its context shown as real, editable chips. Kills the
  "filter that does nothing" class of bug (D1) by construction.
- **Dev-team tickets** for D1–D4 to be drafted separately (shipping app).

## 4. Layout options to prototype (on `rnd`, when this slice opens)

Two candidates, both on the confirmed design language (tokens, grouped cards,
tonal wells, light+dark):

**A. Timeline.** Sticky day headers, cards with a still frame + one-line
summary (horse · stall · time · type), tap → full-screen player. Filter
chips in a glass bar under the title; date range via a native picker.
Closest to today; best for "catch up".

**B. Pinned player + list (Inakshi's suggestion).** A 4:3 player fixed at
the top; beneath it a scrollable list of stills (same card anatomy). Tapping
a card loads that event into the top player and highlights the row; the
player stays put while you scroll. Familiar from YouTube, Apple TV, and
camera apps (Ring / Nest / Wyze / Arlo event history) — customers already
know it. Best for "investigate": you can flick through 20 events without
leaving the screen. Consider: auto-advance to the next event when one ends;
day headers still apply in the list; on tablet the player can sit left with
the list right (Ring's iPad layout).

Prototype both, judge on device. Performance rule either way: exactly one
player mounted, ever, on this screen (PRINCIPLES #2, tie-break smooth over
showy).

## 5. Data contract for the rebuild

- Single paginated event query, `page_size` explicit, `ordering
  '-start_time,-event_type'`, org id guarded, window built **in the org
  timezone** and sent as such; alerts (type 9) included by default; Partial
  Rolling expansion in one shared helper; date range → `start_time__gte/lte`;
  end time rounded to the minute so refresh reuses the key; `refetch()` on
  pull; org switch purges event cache; every visible chip is a query input.
- Stills come from the stall-monitor frame URL (auth header — same item as
  For You snapshots), never a mounted player.
- Fourteen entry points → one route with typed params (horse, stall, types,
  from/to); no `showFilters` heuristics; filters always visible, seeded from
  params, always editable.
- The supported event catalogue explicitly excludes legacy manually authored
  Record event types. Old route parameters cannot opt them back in.

## 6. Open questions still to settle (not blocking scoping)

1. **Auto-refresh:** For You polls every 60 s; History doesn't. Should
   "today" in History live-update?
2. **Card tap destination:** the commented-out event-detail route — resurrect
   a detail screen, or is full-screen playback the "detail"?
3. **Date range default:** last 7 days? Today only with a "load earlier"?
4. **Should charts/Show Me keep deep-linking here** with a fixed context, or
   get their own light list (Inakshi chose one screen; confirm chart-tap
   copy/labels when we get there).

## 7. Sequencing

Blocked behind H1–H4 (universal adapters, i18n, tests, honest states).
Then: prototype A and B on `rnd` with sample data → Inakshi picks → build on
`main` as a characterised vertical slice (tests for D1–D3, D5, D8, D11 as
regressions) → both-platform device validation.
