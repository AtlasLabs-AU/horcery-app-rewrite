# Parity sweep (agent output, verbatim) — 2026-08-18

I have enough. Writing the report.

## Feature‑parity audit — Home/For You, Snapshots & live video, Review cards & history, Clips, Feedback, Sandbox

**Compared:** OLD `84-horcery-app-react-native` @ working tree · NEW `horcery-app-rewrite` @ branch **`rnd`**, HEAD `53080ec` ("Slice 4b: recorded playback…"). Docs read first: Requirements §2, §4e, §6, §6a, §6b, §6c; For You Rebuild Notes; Review History Scope; docs/README.

---

### 1. For You / Home tab

| Capability | Where in old app | Status | Where in rewrite / evidence | Notes / risk |
|---|---|---|---|---|
| "Hello \<first name\>" greeting from the user record | `packages/widgets/src/named-navigation-bar-widget/index.tsx:58` (`Hello ${capitalizeFirst(user.first_name)}`) | **PARTIAL** | `src/components/for-you/header.tsx:22` default `greeting = 'Hello Horcery'`; `(tabs)/index.tsx:77` passes no `greeting` | Always renders the literal "Hello Horcery". Personalisation lost; also a hardcoded English string (violates §4b). |
| Header **Search** → `/show-me?from=fyp` | `for-you/index.tsx:231`, `navigation-bar/index.tsx:121` | **INTENTIONALLY REMOVED** (§6 Show Me retired) | `header.tsx:37` still renders a dimmed, unwired Search icon | The *route* is correctly gone, but the icon remains as a permanently dead affordance for a retired feature — should not render at all. |
| Header **Customize** → FYP widget sheet (per-widget toggles, Select‑all, at‑least‑one validation, saved to `UserMetaData.fypWidgets`) | `customize-fyp-widget/index.tsx` (270 lines) | **MISSING** | `header.tsx:43` icon dimmed, `onCustomize` never passed; no sheet, no `fypWidgets` read anywhere in `src/` | §6b finding 5 explicitly requires restoring saved widget preferences before any parity claim. Still open. |
| Header **Menu** (sidebar/org switcher) | `navigation-bar/index.tsx:141` | **BUILT** | `(tabs)/index.tsx:68` → `/menu` | |
| Notifications **bell** | `navigation-bar/index.tsx:126` — `show: false` | **N/A (already dead in old app)** | absent | No parity obligation. |
| FYP section visibility from **feature flags + device inventory** (`showFypCharts`, `hasStallDevices/Feed/Water/Locations`) | `for-you/index.tsx:120-215`, `use-alerts-charts-flags` | **PARTIAL** | `use-for-you-data.ts` derives `hasFeedDevices/hasWaterDevices/hasStallDevices/hasLocations`; `(tabs)/index.tsx:118,130` gate only the two intake cards | Remote Config org‑ID gating (`FYP_CHARTS_ORG_IDS`) is not read; `hasStallDevices`/`hasLocations` are computed and never used. §6b finding 5 open. |
| Pull‑to‑refresh with working spinner | `for-you/index.tsx:91-114` (bug B1 — spinner never shows) | **BUILT + FIXED** | `use-for-you-data.ts` `useIsFetching({predicate})`, `(tabs)/index.tsx:86` | Genuine improvement. |
| Refresh also forces snapshot URL / tracker time refresh | `for-you/index.tsx:66-70` (`snapshotRef.forceRefresh()` etc.) | **PARTIAL** | `refresh()` invalidates keys only | Snapshot frame epoch is derived from data identity, so invalidation does move it; behaviour-tracker "current time" refresh has no equivalent. |
| Focus refresh (`useFocusEffect` → force refresh) | `for-you/index.tsx:45-51` | **PARTIAL** | `(tabs)/index.tsx:59-64` uses focus only to set `isFocused` for pausing video | No refresh-on-focus. |
| Deferred/lazy mounting of below-the-fold sections | not in old app (P2 problem) | **BUILT (new)** | `components/for-you/deferred.tsx`, used at `(tabs)/index.tsx:110,119,131` | |
| Org card: name, cog → Manage Organization (web, Firebase token) | `organization-details-widget/index.tsx:311-322`, `gotoAccountSettings` | **PARTIAL** | `organization-card.tsx:57` cog rendered dimmed, `onManageOrganization` never passed from screen | Dead-but-disabled per §6b rule; capability itself missing. |
| Org card: **Switch organization** | old: opens full sidebar | **BUILT (reworked)** | `organization-card.tsx:71` native `Menu` over `organizations` from `use-for-you-data.ts` | Works; different affordance, allowed by §2 "freedom of organization". |
| Org card: live clock in **org timezone**, ticking | `organization-details-widget:170-198` | **BUILT** | `use-organization-now.ts` + `use-for-you-data.ts` `localTime` | |
| Org card: temperature + humidity from weather service, °C/°F per user unit preference | `organization-details-widget:200-243` (weather mutation on first location, `celsiusToFahrenheit`) | **MISSING** | `(tabs)/index.tsx:99-100` passes temp/humidity **only** when `preview` is on (sample data); `services/api/weather-data-ingress/weather.ts` exists but is never called | Real customers see no conditions row at all. |
| Org card: alert status dot + text (`not_set` / `normal` / `N active alerts`) | `organization-details-widget:245-262` | **BUILT + IMPROVED** | `hooks/use-alert-status.ts`, `organization-card.tsx:130-166` | Adds `loading` / `unavailable`; wording corrected to "N alerts today" per §6b second review. |
| Org card: **See History** → alert-scoped review history (`?eventTypes=9&showFilters=true&hideBehaviorFilter=true`) | `organization-details-widget:264-277` | **PARTIAL** | `(tabs)/index.tsx:69` → `/review-history` with **no params** | Deliberate per §6c ("one screen, alerts included by default"), but the alert-only context is lost — you land on an unfiltered day. |
| Org card: "AI watching N metrics" + **Manage Alerts** (permission-gated) | `organization-details-widget:392-424`, `executeWithPermission(Permission.EDIT)` | **PARTIAL** | `organization-card.tsx:113-126` renders the banner and count; `onManageAlerts` not passed from For You | `/alerts` exists (reachable from More). Wire-up missing; no permission gate on this entry. |
| Org card: **AlertNotificationCarousel** (recent alert cards inline) | `organization-details-widget:390`, `for-you-alerts/alert-notification-carousel` (287 lines) | **MISSING** | no equivalent in `src/components/for-you/**` | Not mentioned as removed in any doc. Real gap. |
| Org card: skeleton while loading | `organization-details-widget/skeleton.tsx` | **PARTIAL** | Only the status line has a spinner; name/time render empty strings first | |
| Weather card carousel widget | `weather-card-carousel` (imported and never rendered — bug B3) | **N/A** | absent | Dead in old app. |
| Behavior Tracker: Daily/Weekly, behaviour selector, per-entity cards, Animal/Stall view mode (persisted), deviation tags, Prometheus queries, ⋮ menu, loading/error/coming-soon states | `for-you-charts/behavior-tracker-widget/**` (~1,750 lines) | **SCOPED-NOT-BUILT** (charts) / **MISSING** (the rest) | `components/for-you/behavior-tracker-card.tsx` — 4 hardcoded behaviours, `ChartPlaceholder`, ⋮ items `disabled: true`, "Switch to Stalls" unwired, **no view-mode toggle, no data, no per-entity list** | Chart renderer deferral is sanctioned (§6a). The *non-chart* parts — Animal/Stall view mode persisted in the auth store, the FlashList of entity cards, deviation tags, org chart-start-time window — are not deferred by any doc. |
| Water Intake / Feed Intake charts (Stall/Horse scope, Average vs Today legend) | `for-you-charts/{water,feed}-intake-chart-widget`, `prometheus-based-chart-widget` | **SCOPED-NOT-BUILT** | `components/for-you/intake-card.tsx` — shell + `ChartPlaceholder` | Sanctioned by §6a. |
| Scroll-end sentinel / `ScrollEndProvider` | `for-you/index.tsx:56-64,246` | **N/A** | absent | Internal plumbing for chart lazy-loading; superseded by `Deferred`. |
| Tablet columns (2/3/4/6) + orientation re-layout | `animal-snapshot-widget:167-175`, `review-cards-widget:263-274` | **MISSING** | `MediaCarousel` is a fixed 0.62-of-screen carousel; no tablet/orientation branch | §6b "legacy fixes to characterise" lists tablet rotation. Not addressed. |

---

### 2. Snapshots & live video

| Capability | Where in old app | Status | Where in rewrite / evidence | Notes / risk |
|---|---|---|---|---|
| Snapshots list of monitored stalls | `animal-snapshot-widget/index.tsx:189-210` `stall.infiniteList` filtered `current_stall_monitor_deviceinstance__isnull=false` | **PARTIAL** | `hooks/use-snapshots.ts:41-47` uses `queries.stall.list` — **one page, no filter for "has a monitor"** | §6b finding 6 ("single-page `list` calls drop stalls in large orgs") is **still present**. Stalls without a monitor also now appear with no poster. |
| Snapshot **pagination** (`fetchNextPage` on end reached) | `animal-snapshot-widget:412-417` | **MISSING** | none | |
| Snapshot **loading skeleton / error / empty / offline** states | `SnapshotLoadingContainer`, `SnapshotEmptyContainer` (`animal-snapshot-widget:52-107,376-392`), incl. `onlineManager.isOnline()` copy | **MISSING** | `use-snapshots.ts` returns `isLoading` — never consumed; `useSnapshots` exposes **no** `isError`; `MediaCarousel` returns `null` on empty (`media-carousel.tsx:71`) | An org with zero stalls, a failed request, and a still-loading page are all the same thing on screen: a Snapshots header with nothing under it. Directly contradicts §6b "explicit loading/unavailable/error states everywhere". |
| Page dots reflecting real pages | old: `showDots` on `HorizontalScrollFlashList` (dots decorative — §6b) | **BUILT + FIXED** | `media-carousel.tsx:78-91` — one dot per rendered item | |
| Tile = 2-hour **timelapse HLS at 10×**, looping | `snapshot-preview.tsx:107-129` `getStallMonitorVideoURL(type:'timelapse')`, epoch quantised to 600s | **MISSING** (replaced by a still) | `use-snapshots.ts:100-104` builds `…/frames/<epoch>.jpeg` only | The performance swap is intended and documented. **But the UI still says "▶ 10x" and "Last 2 hours at a glance"** (`snapshots-card.tsx:104,124`) over a single JPEG from 5 minutes ago — wrong copy, see Bug #3. |
| Tile = **Live Video** mode | `snapshot-preview.tsx:109-114` `getStallMonitorLiveFeedURL` | **PARTIAL** | `snapshots-card.tsx:75-79` "Go live" menu item; only the snapped tile streams (`media-carousel` `isSnapped`) | Session-local toggle only. |
| Playback-mode **preference persisted to the server** (`snapshotPlaybackMode`, radio sheet, toast, restored on next launch) | `snapshot-options-widget`, `snapshot-playback-options-widget/index.tsx` (106 lines, `userService.updatePatch`) | **MISSING** | no `snapshotPlaybackMode` anywhere in `src/` | Blocked in part by `GenericService.assertWriteAllowed()` (writes blocked against prod), but no read of the existing preference either — a customer who chose Live in the old app loses it on switch day. |
| **Foreground refresh** of snapshot URLs when >30 min stale | `animal-snapshot-widget:243-272` (`AppState` listener) | **MISSING** | no `AppState` usage in `src/` | Named in §6b "legacy fixes to characterise". |
| **Fullscreen** snapshot (modal, backdrop, close button, orientation unlock/restore, status bar hide, tablet `supportedOrientations`) | `full-screen-view-widget/index.tsx:582-745` | **MISSING** | grep: no `Modal`, no `ScreenOrientation`, no fullscreen in `src/` outside prototypes | Whole fullscreen video path absent. |
| Fullscreen **native playback controls** (play/pause, seek bar, ±10 s skip) | `full-screen-view-widget:239-243` `nativeControls`, `skipVideo`, `onSeek` | **MISSING** | `media-tile.tsx:288` `nativeControls={false}` | |
| **Pinch-to-zoom** in fullscreen + "Tap for controls" hint | `full-screen-view-widget:90-107,700-717`, `PinchZoomView` | **MISSING** | none | |
| **Mute / unmute** | `snapshot-preview.tsx:141,155-160`; forced mute on fullscreen open/close | **PARTIAL** | `snapshots-card.tsx:83-93` menu item, disabled unless live | Fine for the still-first design; no fullscreen path to mute in. |
| Playback **speed** (preview vs fullscreen rates) | `full-screen-view-widget:487-493` `previewPlaybackRate`/`fullscreenPlaybackRate` | **MISSING** | none | |
| **PiP** | explicitly disabled (`allowsPictureInPicture: false`) | **N/A** | n/a | Not a capability today. |
| **AirPlay / Chromecast** | explicitly disabled (`allowsExternalPlayback = false`) | **N/A** | n/a | |
| Player **error state** ("Unavailable" / "No internet connection") + blurhash fallback | `full-screen-view-widget:530-548,660-672` | **PARTIAL** | `media-tile.tsx:265-275` unmounts the video on error and falls back to the poster; `snapshots-card.tsx:167-175` shows "Live unavailable" / "No live stream" tags | Better than old for live; **no offline copy** (`onlineManager` never consulted). |
| Blurhash placeholder while frame loads | `snapshot-preview.tsx` → `Blurhash` with `DEFAULT_STALL_BLUR_HASH` fallback | **PARTIAL** | `media-tile.tsx:113-121` uses `blurhash` if present; **no default fallback** | Stalls with no `stall_blur_hash` show a bare grey well. |
| Buffering loader (Lottie wave) | `full-screen-view-widget:110-128` | **MISSING** | none | |
| Timestamp overlay "Activity from H:MM to Now", tracking playback progress | `snapshot-preview.tsx:145-158,376-406` | **MISSING** | none | |
| Tile footer: horse name + avatar → animal detail; stall name → stall detail; bottom sheet when both exist | `snapshot-preview.tsx:196-300`, `review-card-helper.handleGoToAnimalStallDetails` (with prefetch) | **MISSING** | `MediaTile` receives no `onPress` from `snapshots-card.tsx` | Tiles are completely inert. Avatar chip loss is documented/accepted (§4e); the **navigation** loss is not. |
| Frozen layout while fullscreen is open (prevents reflow) | `animal-snapshot-widget:275-311` | **N/A** | no fullscreen | |
| Tablet nav-width-aware sizing | `animal-snapshot-widget:161-166` | **MISSING** | none | |
| Recorded/timeshifted playback with a play‑head | `horizontal-timeline-widget` + detail pages (adjacent area) | **BUILT (elsewhere)** | `hooks/use-playhead.ts`, `hooks/playhead-data.ts`, `(tabs)/horses/[id].tsx:225-227` `stallRecordedStreamUrl` | Exists only on Horse Details, not on For You / Snapshots. |
| Timeline scrubbing / zoomed timeline | `horizontal-timeline-widget/**` (1,060 lines incl. `zoom-context`, `timeline-segments`) | **MISSING** | no timeline component in `src/` | Day-granularity date bar only. |

---

### 3. Review cards (For You) and review-card detail

| Capability | Where in old app | Status | Where in rewrite / evidence | Notes / risk |
|---|---|---|---|---|
| Review card list — today's events, `page_size 50`, infinite scroll, **60 s auto-refetch** | `review-cards-widget/index.tsx:289-318` | **MISSING** | `components/for-you/review-card.tsx` renders `children ?? previewEvents ?? empty state`; `(tabs)/index.tsx:106` passes **no children and no query** | The For You Review card has **no data path at all**: on a real org it always shows the empty state. This is the single biggest For You gap. |
| Per-card content: type icon, title, `dd LLL yyyy hh:mm a`, autoplaying 2× muted video (behaviour events) or text panel | `components/core/review-card/index.tsx:263-620` | **PARTIAL (design only)** | `review-card.tsx:80-95` `ReviewPreviewTile` → `MediaTile`, sample data only | |
| Card footer: horse/stall name → detail at that timestamp; type tag | `review-cards-widget:159-176` | **MISSING** | no press handler | |
| Footer **comment** icon → notes sheet (note threads) | `review-card/index.tsx:773-790`, `sheets.tsx:145` `notes-sheet` | **MISSING — decision needed** | no notes/comments anywhere in `src/` | §2 removes "manually entered notes fields in Review cards" but does **not** name the comment/note-thread feature. Ambiguous: either confirm it falls under the Record removal or it is a real gap. |
| Footer share / save-clip icons | `review-card/index.tsx:793-802` — `className='hidden'` | **N/A** | absent | Hidden in old app. |
| **Behavior filter** sheet (multi-select), funnel badge with count, "N filters applied" + Reset, **persisted to `UserMetaData.reviewCards.visibleEventTypes`** | `review-cards-widget:399-460,479-508` | **MISSING** | `review-card.tsx:45-57` funnel icon rendered dimmed, `onFilter` never passed | Filter *does* exist on Review History (different screen). Persistence nowhere. |
| Filtered vs unfiltered **empty states** (two distinct copies) | `review-cards-widget:44-61` | **PARTIAL** | only the unfiltered copy, `review-card.tsx:99-110` (wording matches old exactly) | |
| **"N New" badge** (locally tracked viewed events, daily reset) | `review-cards-widget:355-392`, `app-usage-states` | **MISSING** | `stores/app-usage-states/index.ts` is vendored but unused by any For You component | Scope §3 says "'New' stays a light local hint at most" — so PARTIAL-by-decision, but nothing is built. |
| Loading skeleton | `review-cards-widget:511-521` | **MISSING** | none | |
| **See History** link | `review-cards-widget:344-352` | **BUILT** | `review-card.tsx:59-61` → `/review-history` | |
| Review-card **detail screen** `(review-card-detail)/[id]`: date title, clip player with native controls, start–end time row, comment count, animal/stall pill → detail, comments thread (banner, list, keyboard-sticky input) | `review-card-detail-widget/index.tsx`, `review-card-detail-video-widget`, `review-card-detail-actions` | **MISSING** | no route in `src/app` | **Unreachable in the old app too** (nav commented out at `review-cards-widget:118-119` and `review-history-widget:447`). Scope §6 Q2 lists "resurrect a detail screen?" as an *open question*. Treat as open, not silent loss. |
| Detail screen Save Clip / Share buttons | `review-card-detail-actions:52-83` — `className='invisible'` | **N/A** | absent | Dead in old app. |

---

### 4. Review History

| Capability | Where in old app | Status | Where in rewrite / evidence | Notes / risk |
|---|---|---|---|---|
| Route + entry from For You and org card | `apps/expo/src/app/review-history/index.tsx` | **BUILT** | `src/app/review-history.tsx` | |
| Screen title changes ("History" vs "Review History") by params | `review-history/index.tsx:18` | **MISSING** | fixed "Review History" | Minor; consistent with §6c "one screen". |
| Horizontal day strip + month/day navigation | `horizontal-calendar`, `horizontal-days` | **BUILT** | `components/review-history/day-strip.tsx` | |
| Future days **not** selectable | old: selectable (bug D15, `clamp` ignored) | **BUILT + FIXED** | `day-strip.tsx:36,86-90` | |
| Day boundaries in **organization** timezone | old: device zone (D8) | **BUILT + FIXED** | `use-review-history.ts` + `review-history-data.ts eventWindow`, `use-organization-now` | |
| **Date range / group-by-day** (approved change, §6c) | n/a | **SCOPED-NOT-BUILT** | single-day strip only | Explicitly approved in scope §3; not implemented. |
| **Alerts included by default** | old: excluded | **BUILT + FIXED** | `review-history-data.ts` `DEFAULT_EVENT_TYPES` includes `EVENT_TYPE_ID.alert` | |
| **Lying Down** in default set (old used `sitting` 570 — D3) | `review-history-widget:163` | **BUILT + FIXED** | `review-history-data.ts` `lyingDown: [100]` | |
| **Partial Rolling** expands to 103/104/105 (D2) | old: 105 only | **BUILT + FIXED** | `review-history-data.ts:36` | |
| Special Instructions (type 7) in default filter | `review-history-widget:155` | **INTENTIONALLY REMOVED** | `review-history-data.ts:41-48` documents the removal; `event-rows.ts:18-20` too | Correct per §2. |
| Behavior filter chip (multi-select) + count | `review-filters-bar` + `behavior-filter-sheet` | **BUILT** | `review-history.tsx:145-172` native multi-select `Menu` | Improved (sheet stays open). |
| **Horse** and **Stall** filter chips | `review-filters-bar`, `horse-filter-sheet`, `stall-filter-sheet` | **MISSING (visibly disabled)** | `review-history.tsx:173-174` `DimmedChip` — no reason text, no `accessibilityState` | Scope §5 requires "every visible chip is a query input". Not yet. |
| URL-param seeding (14 entry points: `eventTypes`, `animalId`, `stallId`, `selectedDate`, `from`, `showFilters`, `hideBehaviorFilter`) | `review-history-widget:69-126` | **MISSING** | `review-history.tsx` reads **no** search params | Scope §5 requires typed params; deep links from charts/alerts would land unfiltered. |
| "N results found" + Reset | `review-filters-bar:60-84` | **BUILT** | `review-history.tsx:176-194` | |
| Reset-confirmation sheet | `review-history-widget:239-251` | **MISSING** | resets immediately | Minor, arguably better. |
| Pagination (infinite scroll + footer spinner) | `review-history-widget:509-522` | **BUILT** | `review-history.tsx:216-230` | |
| Explicit `page_size` (D6) | old: none | **BUILT + FIXED** | `use-review-history.ts:19` `PAGE_SIZE = 50` | |
| Pull-to-refresh **without wiping the list** (D5) | old: reset date → new key → skeletons | **BUILT + FIXED** | `review-history.tsx:222-229` `refetch`; `eventWindow` rounds end to the minute | |
| Loading / error+retry / two empty states | `ListLoading`, `ListError`, `ListEmpty` + `event-scoped-empty-helper.ts` (126 lines of event-specific copy) | **PARTIAL** | `review-history.tsx:203-213,278-315` — one loading, one error, filtered/unfiltered empty | Event-scoped empty copy (per-behaviour wording) not carried. |
| Offline redirect / no-internet screen | `(public)/no-internet`, `no-internet-widget` | **MISSING** | `hooks/use-online-status.ts` exists, unused by this screen | |
| Event card: still frame from the stall-monitor frame URL | scope §5 requirement; old app used a live player | **MISSING** | `event-rows.ts:87-100` never sets `posterUri`; `event-card.tsx:78` passes `posterUri={event.posterUri}` = always `undefined` | Every history card renders an **empty grey 4:3 well** (blurhash at best). The "stills instead of players" decision is only half-built. |
| Tap card → play the clip | old: `onTap` commented out (D9) — dead there too | **MISSING** | `review-history.tsx:218` `<EventCard event={item} />` — no `onPress`; `event-card.tsx:78` `showPlayBadge` with `onPress` undefined | Scope §3 decided **"stills with tap-to-play"**. The play badge is drawn but nothing happens — a new dead control. |
| One player on the screen, ever | scope §3 rule | **BUILT (vacuously)** | zero players on this screen | |
| Alert tag on card | `getTagTitle` | **BUILT** | `event-card.tsx:82` | |
| Reporter name / manual notes rows | `review-card` info panel | **INTENTIONALLY REMOVED** | `event-card.tsx:98-100` still *renders* `reporter`/`note` rows; `event-rows.ts` never populates them | Fields are vestigial but unreachable. Low risk; worth deleting so §2 can't regress. |
| Tablet 2-column layout | `review-history-widget:135-141` | **MISSING** | single-column `FlatList` | Also: `FlatList`, not FlashList — §4 rider says long lists use FlashList. |

---

### 5. Clips

| Capability | Where in old app | Status | Where in rewrite | Notes / risk |
|---|---|---|---|---|
| Clips list (`/clips`): FlashList, thumbnails, title, created date, view/download counts, expiry countdown, "Processing"/"Unavailable" thumbnail states | `video-clips-widget/index.tsx`, `video-clip-item/index.tsx` | **MISSING** | no route; `(tabs)/more.tsx:52-57` Clips row rendered **disabled with no destination** | `services/api/clip-management/*` and `services/query/clip-management/*` are vendored — data layer only. |
| Clips **search** (debounced 500 ms, cleared on org switch/focus) | `video-clips-widget:151-178` | **MISSING** | — | |
| Clips pagination, pull-to-refresh, empty/error/search-empty states | `video-clips-widget:196-262` | **MISSING** | — | |
| Clip detail `(clip-details)/[id]/details`: player, title, description, Clip Date/Time, statistics (views, downloads, expires-in) | `clip-details-widget`, `clip-information-card`, `clips-stats-card` | **MISSING** | — | |
| Clip **download** to gallery (media-library permission, background toast, per-clip lock) | `clip-information-card:148-181`, `clip-detail-states` `downloadClip` | **MISSING** | `services/api/clip-management/download-clip.ts` vendored, unused | |
| Clip **share**: allow-sharing toggle, downloadable toggle, share link + copy, Anyone-with-link / Password-protected / Invited-only, password copy, invitee picker | `clip-access-widget` (622), `clip-invitees-widget` (462) | **MISSING** | `services/api/clip-management/access-permission.ts` vendored, unused | Old app's share *icon* on the detail card is hidden (`className='hidden'`), but the access card itself is live. |
| **Create clip** (`/create-clip`): stream player, thumbnail film-strip trimmer with min/max duration, title/description form, retention duration sheet, permission-gated save | `create-clip-widget/index.tsx` (737 lines) | **MISSING** | — | Includes the clip-trim scrubbing UI. |
| **Edit clip** `(clip-details)/[id]/edit` | same widget, `type=edit` | **MISSING** | — | |
| "Create clip" button inside the video controls overlay | `video-controls-overlay:509-519` | **MISSING** | — | |

No rewrite doc marks Clips as removed or deferred — §2 lists "clips, sharing" as retained capability. This is the largest wholly-unbuilt block in my area.

---

### 6. Feedback and Sandbox

| Capability | Where in old app | Status | Where in rewrite | Notes / risk |
|---|---|---|---|---|
| Feedback survey (`/general/feedback`): PostHog survey id, 1–5 rating, comments textarea, submit + toast, name/email prefill | `packages/widgets/src/feedback-survey/index.tsx` (313) | **MISSING** | `(tabs)/more.tsx:79-92` "Give Feedback" `Pressable` with **no `onPress`** — and it *does* claim `accessibilityRole="button"` | Requirements §3 puts "support/feedback paths" in scope for the rewrite. Also a dead control that violates §6b item 3 (see Bug #1). |
| Feedback entry card on More | `feedback-card` | **PARTIAL** | card renders, button dead | |
| Sandbox (`/general/sandbox`): dev-only device/permission/network probe | `apps/expo/src/app/general/sandbox/index.tsx` | **INTENTIONALLY REMOVED** | absent; `(tabs)/more.tsx:18` comment says "Sandbox … omitted" | Documented in §4e More page entry. |

---

## Bugs and suspicious code in the REWRITE files I read

1. **Dead control that announces itself as a button — "Give Feedback".** `src/app/(tabs)/more.tsx:79-92`: `<Pressable accessibilityRole="button" accessibilityLabel="Give Feedback">` with **no `onPress`**. This is exactly the pattern `src/__tests__/no-dead-controls.test.ts` forbids, but that test only checks `more.tsx` for the `MoreRow` shape (`accessibilityRole={wired ? …}`) and never inspects this button. Screen-reader users are told there is a button; tapping does nothing.

2. **Play badge with no press handler in Review History.** `src/components/review-history/event-card.tsx:78` passes `showPlayBadge` to `MediaTile` while `onPress` is `undefined` (`src/app/review-history.tsx:218` renders `<EventCard event={item} />` with no `onPress`). `MediaTile` (`media-tile.tsx:206-213`) then renders a plain `View` with a play glyph in the centre — a universal "tap to play" affordance that is inert. Scope §3 committed to "stills, tap to play".

3. **Snapshot cards claim timelapse playback they don't do.** `src/components/for-you/snapshots-card.tsx:104` renders `▶ 10x` and `:124` "Last 2 hours at a glance", but `src/hooks/use-snapshots.ts:97-109` builds a **single JPEG** at `now − 5 min`. Nothing is playing and nothing covers two hours. Wrong copy on the page the requirements say must never overstate.

4. **Snapshots load only the first page of stalls — §6b finding 6 is still live.** `src/hooks/use-snapshots.ts:41-47` uses `queries.stall.list` (one server page) where `use-for-you-data.ts:88-96` deliberately uses `listComplete` for exactly this reason ("an organization whose only feed scale sorts onto page 2 loses its card"). Same failure mode, opposite choice, in the same feature. Also: no `current_stall_monitor_deviceinstance__isnull=false` filter, so unmonitored stalls now appear as empty tiles.

5. **Snapshots have no loading, error, or empty state.** `use-snapshots.ts:132` returns `{ snapshots, isLoading }`; `(tabs)/index.tsx:50` destructures only `snapshots`; `isError` is never even exposed. `MediaCarousel` returns `null` for an empty array (`media-carousel.tsx:71`). Loading, failed-request and genuinely-empty are indistinguishable — a header over nothing.

6. **`useAlertStatus`'s `useMemo` never memoises.** `src/hooks/use-alert-status.ts:88-102` depends on `[enabled, rules, alertsToday]`, which are fresh React Query result objects on every render. Harmless functionally, misleading as intent.

7. **Review History pulls in the entire For You data set to get a timezone.** `src/app/review-history.tsx:72` calls `useForYouData()` solely for `timezone`. That hook fires `organization.detail`, `organization.list`, `location.list` and `deviceInstance.listComplete` (`use-for-you-data.ts:36-96`) plus builds the refresh predicate — four requests this screen has no use for, on every visit. `use-organization-timezone.ts` exists in `src/hooks/` and appears to be the right seam.

8. **Stale colour-literal exception hides two real literals.** `src/__tests__/no-color-literals.test.ts:27` exempts `app/(tabs)/index.tsx` with the reason *"layout constant, no colour"* — but that file now contains `todayColor="#00B8DB"` (line 124) and `todayColor="#F0B100"` (line 136). The exception's own stated justification is false, and the test's "fails on a stale exception" claim (§9 corrections log) does not catch a *reason* going stale, only an unused key. Two hardcoded hues ship in a screen, against §4d item 9.

9. **`ForYouHeader` default greeting is a hardcoded, non-personalised, untranslated string.** `src/components/for-you/header.tsx:22`. Old app greets by first name. Combined with §4b ("no hardcoded user-visible strings, ESLint-enforced"), this is both a copy regression and a localisation-boundary violation — and i18next is still not installed anywhere in `src/`.

10. **`MediaCarousel` snap page only updates on momentum end.** `src/components/media/media-carousel.tsx:60-65` sets `page` in `onMomentumScrollEnd` only. A slow drag with no momentum leaves `page` stale, so in live mode the *previous* tile keeps streaming while a different tile is centred (and the dots lie). No `onScrollEndDrag` fallback.

11. **`TileVideo` rebuilds the player on every mute toggle.** `src/components/media/media-tile.tsx:125-133` keys the component on `muted`, tearing down and re-creating the `expo-video` player. The comment justifies it for a live stream, but `snapshots-card.tsx:165` computes `muted={muted || !snapshot.hasAudio}` — so a change in `hasAudio` (e.g. stall data refetch) also churns the player. On a recorded clip this would restart playback from zero.

12. **Snapshot frame quantisation comment contradicts the code.** `src/hooks/use-snapshots.ts:12-16` and `:99` describe a "10s slice", while `FRAME_SLICE_SECONDS = 300`. The helper (`config/utils/stall-monitor-video-helper.ts:117`) additionally floors to 10s. Two rounding layers, one wrong comment.

13. **Thumbnail auth header is unverified.** §6b finding 6 says snapshot thumbnails "don't render (auth header)". `media-tile.tsx:114-120` passes `source={posterUri}` to `expo-image` with **no `headers`**. If the frame endpoint needs auth, every snapshot and every history still is blank — and there is no error state (Bug #5) to reveal it. Flagging as a risk to verify on device, not a confirmed defect.

14. **`DimmedChip` gives no reason and no disabled semantics.** `src/app/review-history.tsx:246-254` renders Horse/Stall as a `View` with a chevron and grey text — visually a chip, no `accessibilityState={{disabled:true}}`, no "coming with…" reason. Compare `horse-stall-card.tsx:47-51`, which does it properly. §6b item 3 requires "visibly disabled **with a reason**".

15. **`filterSample` matches on display title, silently dropping rows.** `src/app/review-history.tsx:236-244` filters sample rows by comparing `row.title` to the behaviour *label*. Any sample row whose title doesn't exactly match a label (alerts, People in Stall) vanishes when any filter is on, so the dev preview misrepresents filtering. Dev-only, low severity.

16. **`review-history.tsx` results count is inconsistent under sampling.** Line 179 shows `visibleRows.length` when sampling and server `total` otherwise; `total` is the count for the *whole* filter, while the list is paginated — fine — but when sampling, "N results" counts only what's rendered. Minor, but it's the kind of number a user trusts.

17. **`(tabs)/index.tsx` refresh does not invalidate `organization.list`.** `use-for-you-data.ts:127-138` `refreshKeys` omits `queries.organization.list._def`, so a newly joined organization never appears in the Switch menu until app restart.

---

### Cross-cutting observations

- **`explore.tsx` (Protos tab) and `proto-*.tsx` are on this branch by design** — §4e branch model says R&D scaffolding stays on `rnd`. I audited against `rnd`; a parity read against `main` would show *less* built, not more.
- **Localization (§4b, hardening H2) has not started** in any file in this area — every string is an English literal.
- **Three For You capabilities are gated behind writes** (widget preferences, snapshot playback mode, review-card filter persistence) and will stay missing while `GenericService.assertWriteAllowed()` blocks mutations against the production API. That's a known constraint, but it means "parity" for For You cannot be claimed until a non-production API target exists.