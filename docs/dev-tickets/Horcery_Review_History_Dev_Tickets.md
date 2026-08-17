# Review History — bug tickets for the dev team (shipping app)

Found 2026-08-15 during a code assessment of `/review-history` in
`84-horcery-app-react-native`. Each is reproducible from the code alone; file
and line references are to `main` as of that date. Independent of the rewrite.
Suggested owner: Vikum / mobile.

---

## HC84-XXXX · P1 · Behavior filter does nothing on the alerts "See History"

**Where:** `packages/widgets/src/review-history-widget/index.tsx:289-290`
(also 128-133, 213-222)

**What happens:** Arriving via `/review-history?eventTypes=9&showFilters=true&hideBehaviorFilter=true`
(organization card and alert-stats "See History"), or any entry that passes
`eventTypes` together with a visible Behavior chip, the user can open the
Behavior sheet, select behaviours, and see the chip badge, "N results" and
empty-state copy change — but the list does not. The query uses
`filteredEventTypes ?? selectedBehaviorFilter ?? defaultEventTypes`, and
`filteredEventTypes` (seeded from the URL) is never cleared, so it always
wins. **Reset** (`handleResetFilters`) has the same problem: it sets state
the query never reads.

**Fix:** invert precedence — `selectedBehaviorFilter ?? filteredEventTypes ??
defaultEventTypes` — and null the URL seed once the user applies the sheet.
Add a test: seed via URL, apply a different selection, assert the request's
`event_type__in`.

---

## HC84-XXXX · P1 · "Lying Down" missing from default Review History

**Where:** `packages/widgets/src/review-history-widget/index.tsx:163`

**What happens:** The default event-type set uses `eventTypeMap.sitting?.id`
= **570** ("Sitting", a raw pose type). The behaviour shown as "Lying Down"
everywhere else — and what the For You Review card queries — is
`sitting_down` = **100** (`packages/config/src/constants/event-types.ts:136,
228`; `event-helper.ts:19` treats 100 as a video type). Result: an unfiltered
History page omits Lying Down events entirely and requests a type that
likely returns nothing. For You and History disagree for the same day.

**Fix:** `eventTypeMap.sitting_down?.id`. Consider a single shared
`DEFAULT_REVIEW_EVENT_TYPES` constant used by both surfaces so they cannot
drift again.

---

## HC84-XXXX · P1 · "Partial Rolling" filter returns fewer events in History than on For You

**Where:** `packages/widgets/src/filter-widgets/behavior-filter/index.tsx:80-88`;
`review-history-widget/index.tsx:228-230` vs `review-cards-widget/index.tsx:198-202, 285-291`

**What happens:** The Behavior sheet deliberately collapses
`sternal_recumbency` (104) / `lateral_recumbency` (103) / `partial_rolling`
(105) into one "Partial Rolling" row and strips 103/104 before `onApply`.
The For You Review card re-expands the selection to all three before
querying; the History widget's `onApply` is a bare `setSelectedBehaviors`,
so it queries `event_type__in=105` only. Selecting Partial Rolling in History
drops the 103/104 events. Introduced with commit `568e35e` ("add partial
rolling"), which only updated one of the two consumers.

**Fix:** move the expansion into `packages/config/src/constants/behavior-constants.ts`
(e.g. `expandBehaviorSelection(ids)`) and call it from both widgets. Test:
select Partial Rolling → request contains 103, 104, 105.

---

## HC84-XXXX · P1 · One autoplaying video player per History card, never released

**Where:** `packages/components/src/core/review-card/index.tsx:551-568`;
`packages/widgets/src/full-screen-view-widget/index.tsx:192-209` (player
creation), `:526-530` (release **commented out**), `:159`
(`isInVisibleViewArea` declared, never used)

**What happens:** Every behaviour event with a duration mounts a
`FullScreenVideoView` with `autoPlay`, i.e. a live HLS `useVideoPlayer` per
row. There is no viewability gating and the unmount release is commented
out, so FlashList recycling leaves players alive. On a 2-column tablet with a
busy day this is many concurrent AVPlayer/ExoPlayer instances → thermal
throttling, stutter, and OOM on older Android. Same class of issue as the For
You snapshot tiles (already noted in the Android performance work).

**Fix:** (1) restore `player.release()` in the unmount effect; (2) gate
`autoPlay`/`play()` on FlashList `onViewableItemsChanged` and pause off-screen
players; (3) longer term, render a still frame and mount a player only for
the tapped/centred card. Measure with the Xcode memory gauge / Android
Profiler before and after on a day with 50+ video events.

---

## Also worth a P2 each (details in `Horcery_Review_History_Scope.md` §2)

- Pull-to-refresh on "today" replaces the list with skeletons and leaks a
  cache entry per pull (`review-history-widget:358-368`, from `c09d33e71`).
- No `page_size` on the History query (`:343-348`).
- Sort typo on For You: `'-start_time,-event type'` (`review-cards-widget:305`).
- Day boundaries in device timezone, not the organization's (`:271`;
  `api/event-management/event.ts:63`).
- Card announces itself as a button to screen readers but has no `onPress`
  (`:457-462`).
- "New" badge daily reset broken after app restart; store persists whole
  event objects (`app-usage-states/index.ts:38-42, 66-71`;
  `review-cards-widget:365-375`).
