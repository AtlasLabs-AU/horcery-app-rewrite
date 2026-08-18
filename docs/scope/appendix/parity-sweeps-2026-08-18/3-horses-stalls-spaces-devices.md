# Parity sweep (agent output, verbatim) — 2026-08-18

# Feature-parity audit — Horses / Stalls / Spaces / Devices / Sharing

**Old (shipping):** `/Users/inakshi/AI Projects/Horcery/84-horcery-app-react-native`
**New (rewrite):** `/Users/inakshi/AI Projects/Horcery/horcery-app-rewrite`

Scope docs read first: requirements §2 (Record + Special Instructions removed), §4e (camera frames, Horses page), §6 (Show Me RETIRED, permissions PARKED), `Horcery_Horse_Details_Scope.md` D1–D8, `Horcery_Horses_Parity_Gaps.md` A–F, both `Horses_*.md` handovers, `docs/README.md`.

Legend: **BUILT** · **PARTIAL** · **MISSING** (no decision recorded — needs a ticket) · **REMOVED** (deliberate) · **SCOPED** (decided, slice assigned, not yet built).

---

## 1. Horses list — `(tabs)/animals`

| Capability | Old app (file) | Status | Rewrite (file) / evidence | Notes / risk |
|---|---|---|---|---|
| Paginated horse list, name + thumbnail | `packages/widgets/src/animal-list-widget/index.tsx:169` | BUILT | `src/app/(tabs)/horses/index.tsx:231`, `src/hooks/use-horses.ts:57` | Rewrite adds stall name (parity C1) |
| Group filter chips + "All Horses" | `animals-group-filter-widget/index.tsx:93` | BUILT | `src/components/horses/group-chips.tsx:33`, `src/hooks/use-horse-groups.ts` | Rewrite follows pagination (C6) |
| Group-chip skeleton while loading | `components/core/filter-skeleton` | BUILT | `group-chips.tsx:42` (E5 closed) | |
| Leading round **+** at head of group row | `animals-group-filter-widget/index.tsx:111` | REMOVED | D1 decided 2026-08-17: single ⋮ | Function covered by `group-chips.tsx:87` menu |
| Add Horse / New Group / Edit Groups actions | `add-new-options/index.tsx`, `edit-group-widget` | SCOPED (write side) | `group-chips.tsx:94-116` — all `disabled: true` with description | A2 |
| Group edit via **long-press** on chip | `animals-group-filter-widget/index.tsx:83` | REMOVED | Replaced by visible ⋮ (C4) | |
| Groups CRUD (create / rename / delete) | `group-name-widget`, `edit-group-widget/index.tsx` | SCOPED (write side) | Disabled menu rows only; no name sheet (D2) | |
| Auto-select newly created group | `animals-group-filter-widget/index.tsx:52-60` | SCOPED | B6 — capture with New Group work | Absent by design |
| Per-horse ⋮ menu: Edit / Manage Groups / Remove | `animal-stall-options-widget/index.tsx:155-186` | PARTIAL (visible, disabled) | `src/components/horses/horse-card.tsx:83-106` | Labels don't flip to View/View Groups — permissions PARKED (B1) |
| **Share** in the ⋮ | `animal-stall-options-widget/index.tsx:157` defined, `:207` filtered out before render | REMOVED | Correctly not carried (A4) | Old `handleOnShare` is only `debug()` — never a real capability |
| Favourite star on card | `animal-stall-card` (rendered `hidden`) | REMOVED | A3 | |
| In/Out-of-Stall pill on the card | `animal-stall-card/index.tsx:188,509` | REMOVED from list | Moved to detail — `horse-status-strip.tsx` | A1; also retires old frozen-clock bug (C7) |
| Search | Navbar magnifier → `/show-me?from=animals` (`screens/animals/index.tsx:12`) | BUILT (restructured) | Native header search, `horses/index.tsx:219-227` | Cross-entity Show Me RETIRED (§6 / B3) |
| Server-side search across all pages | Show Me only | BUILT | `use-horses.ts:65` passes `search` | Ahead of old (C3) |
| Pull-to-refresh | `animal-list-widget/index.tsx:249` | BUILT | `horses/index.tsx:238` | |
| Pull refreshes the camera frame | `queryRefreshedAt` (`animal-list-widget:113`) | BUILT | `use-horses.ts:50,133` → `joinHorseRow` `?v=` | B5 closed for the list (**not** for the detail — see Bug 1) |
| Refresh also invalidates Prometheus + groups | `animal-list-widget/index.tsx:254-262` | N/A | No Prometheus on the list by design | E11 |
| Prefetch detail on tap | `animal-list-widget/index.tsx:85-104` | BUILT | `horses/index.tsx:195` `prefetchAnimalDetailPage` | B4 closed |
| Double-navigation guard | `animal-list-widget/index.tsx:277` `isNavigatingRef` | BUILT | `horses/index.tsx:49,187` | B7 closed |
| Loading / error / empty states | `list-loading`, `list-error`, `list-empty` | BUILT (ahead) | `horses-states.tsx` — 5 distinct states (C5) | |
| Offline state with auto-recovery | `ListEmpty` → No-Internet screen | BUILT | `HorsesNoInternet` + `horses/index.tsx:121-136` | E1 closed |
| Contact Support on error | every error state | BUILT | `horses-states.tsx:47,87` | E2 closed |
| Illustrated per-page artwork | `empty-horses.svg` etc. | REMOVED | E4 — small glyph by decision | |
| Thumbnail: Feed Unavailable vs No Profile Image | `list-item-thumbnail/index.tsx` | BUILT | `horse-card.tsx:55,60` — `No camera` tag / `cameraOff` glyph | E8 closed |
| Load-more skeleton | `ListLoading isLoadMore` | PARTIAL | `horses/index.tsx:260` spinner, not a card skeleton | E6, cosmetic |
| Empty-state **Add Horse** button | `animal-list-widget:381` | SCOPED | Text only (E3) | Correct while read-only |
| Toast layer | `components/core/toast` | BUILT | `src/components/ui/toast.tsx` (used in `horses-states.tsx`) | E7 closed |
| Crash safety (error boundary, +not-found) | none | BUILT | `src/components/app/app-error.tsx`, `src/app/+not-found.tsx` | E9 closed |
| Tablet 2/3-column grid | `animal-list-widget/index.tsx:138` | BUILT | `horses/index.tsx:101` | |
| Header notification bell / sidebar button | `navigation-bar` | MISSING (app-wide) | `src/app/menu.tsx` exists; no bell anywhere | D6 — not a Horses gap, but unhomed |

## 2. Horse details — `(details)/animals/[id]`

| Capability | Old app (file) | Status | Rewrite (file) | Notes / risk |
|---|---|---|---|---|
| Three tabs Summary / Events / Alerts | `(details)/animals/[id]/(details)/_layout.tsx:71` | BUILT | `horses/[id].tsx:81,376` | Text-only tabs (D5); icons dropped deliberately |
| Back-target memory (Show Me vs Horses) | `_layout.tsx:163` | REMOVED | F2 — Show Me retired | |
| Date toolbar, min = `created_at` | `_layout.tsx` `DateToolBar` | BUILT | `horse-date-bar.tsx`, `use-playhead.ts`, `playhead-data.ts:43` | Stepper, not a calendar picker — full picker deferred to video slice |
| Play-head cursor carried across days | `stores/animal-detail-states` play-head slice | BUILT | `playhead-data.ts:77` `cursorFor` | Page-scoped hook, not a global store (F11) |
| Statistics strip (Activeness / Temp / Noise) | `common-statistics` via `_layout.tsx:52` | BUILT (+ Humidity) | `horse-status-strip.tsx`, `use-horse-status.ts:82` | Runs on repo-baked PromQL; disclosed by `BuiltInSettingsNote` (D7) |
| **In stall / Out of stall** status | `animal-stall-card/index.tsx:188` | BUILT, ahead | `horse-status-data.ts:50` — 5 honest states | A1; live clock (C7) |
| `hide_metrics_till` suppression | `stall-card`, overlay providers | BUILT | `horse-status-data.ts:119,165` | E10 closed |
| Overlays: no-stall / metrics-hidden / unsupported | `animal-detail-overlay-provider`, `no-data-overlay` | BUILT (+ 4th) | `horse-detail-notice.tsx`, `horse-status-data.ts:147` | Adds `details-unavailable`; replaces rather than floats over |
| Auto-popping "assign a stall monitor" sheet | `summary/use-stall-monitor-not-assigned.ts` | REMOVED (D3) | Inline CTA in `horse-stall-card.tsx` | |
| Settings cog → animal-settings page | `_layout.tsx` `CogIcon`; `animal-settings-page/index.tsx` | REMOVED (D1) | Folded into passport + header ⋮ (`horses/[id].tsx:449`) | |
| Settings rows: Name / Device ID / Assigned Stall / Assigned Group | `animal-settings-details-widget/index.tsx:256+` | BUILT (folded) | `horse-detail-data.ts:85-99` | Device ID guarded against unexpanded relation (`:60`) |
| Passport: barn name, registered name, gender, DOB, breed, height, weight | `animal-passport/index.tsx:71-106` | BUILT | `horse-detail-data.ts:86-91`, `horse-passport.tsx` | Unit-aware; "Not recorded" instead of "N/A" |
| Passport pencil → edit form | `animal-passport/index.tsx:148` | SCOPED (write side) | Menu row `edit` disabled (`horses/[id].tsx:460`) | No pencil on the card — the affordance moved |
| Stall card: Re-assign / Assign link | `stall-summary-widget/index.tsx:157` | SCOPED, visible-disabled | `horse-stall-card.tsx:28` | |
| Stall row → stall detail page | `navigate-to-animal-stall-detail` | SCOPED | `horse-stall-card.tsx:35` — dimmed "Stall page coming" | Blocked on Stalls rebuild |
| Info box "Navigate to the stall…" | `stall-summary-widget` | REMOVED (S2c) | | |
| Devices card (horse + stall devices, live health) | `animal-device-assignment-widget/index.tsx` | MISSING | not present | S5 — scope says slice 3; **not in any built slice today** |
| Last-24-Hours donut + progress bars | `last-24-hours-widget` | SCOPED (slice 3) | none | Gated on §6a + §6a-i |
| Activeness / Rolling trend charts + switch + info sheet | `trend-widget`, `trend-widget-v2`, `horse-trends-info-widget` | SCOPED | none | |
| 5 stall charts (Occupancy, Lying Down, Human In/Near Stall, Activeness) | `assigned-stall-chart-widget` + `*-prometheus-chart-widget` | SCOPED | none | People-In-Stall is the §6a first slice |
| Environment charts (Climate, Ambient) | `environment-charts` | SCOPED | none | |
| Intake charts (water/feed consumption + refills) | `intake-widget`, `water-chart`, `feed-*-chart` | SCOPED (deferred past slice 4) | none | Old water chart is a runtime-downloaded WebView — "replaced regardless" |
| Water / Feed summary rows | `water-feed-summary-widget` | SCOPED | none | Bucket-meter gated |
| **Special Instructions** block | `special-instructions-card-widget`, event type 7 | REMOVED | D8 / req §2 | Old one is a stub (hard-coded "Buttercup", `debug()` handlers) |
| Feedback card | `feedback-card` | REMOVED (D4) | | |
| Export all data | `export-all-data-widget/index.tsx` | SCOPED (G2) | none | Org-gated in old app |
| Delete Horse (destructive + confirm sheet) | `animal-settings-page/index.tsx:104` | SCOPED, visible-disabled | `horses/[id].tsx:473` menu row | No confirm-sheet pattern exists yet in the rewrite (D5 of parity doc) |
| Events tab: 10-day per-horse feed | `animals/animal-details/feeds/index.tsx` | BUILT | `horses/[id].tsx:146`, `use-review-history.ts` (`windowDays: 10`) | Manual event types already excluded |
| Event card → jump to that timestamp | `feeds/index.tsx:63-81` `handleGoToAnimalStallDetails` | MISSING | `EventCard` rendered without an onPress (`horses/[id].tsx:308`) | **E2 in the scope doc, slice 2 — not built.** The card is a dead surface today |
| Events tab own header card | `feeds` `CardHeader` | REMOVED (E3) | Tab is the header | |
| Alerts tab: Manage Alerts row | `alerts-widget/index.tsx:69` | PARTIAL, visible-disabled | `horses/[id].tsx:487` | Never gated on `MANAGE_ALERTS_ORG_IDS` — will need it when enabled |
| Alert Frequency chart | `alert-frequency-chart` | SCOPED | none | |
| Alert list (infinite) | `alert-list-widget` | BUILT | `horses/[id].tsx:152` | |
| Video hero: live HLS, HD/SD, audio | `detail-video-player-widget` (345 L) | PARTIAL | `horses/[id].tsx:322` MediaTile live + recorded | No HD/SD toggle, no mute control, no fullscreen (V2/V3) |
| Recorded playback at cursor | same | BUILT | `horses-data.ts:90` `stallRecordedStreamUrl` | 60-min window matches old |
| Scrubbable timeline (zoom, segments, momentum) | `horizontal-timeline-widget` (1060 L) | SCOPED (slice 4c, D2 = full port) | none | Largest single remaining piece; Android parity unproven |
| Create Clip from player | `create-clip-widget` | MISSING | no control on the page | Scope V6 says "must exist, dimmed" — it does not |
| "Adjust your monitor" overlay + Adjust Now | `video-controls-overlay` | MISSING | none | Scope V7 slice 4a |
| Fullscreen / pinch-to-zoom | `full-screen-view-widget` (749 L) | SCOPED → native fullscreen (V3) | none | |
| Playback speed | `video-controls-overlay` wrapped in `{false && …}` | REMOVED from live; SCOPED for recorded (V8) | | Never shipped in old app |
| Download video | regular-controls variant | REMOVED (V9) | belongs to clips | |
| Pull-to-refresh | `_layout.tsx` `REFRESH_QUERY_KEYS` | PARTIAL | `horses/[id].tsx:193` | See Bug 3 — spinner lies |
| Content skeleton until animal + stall resolved | `content-layout-skeleton-loader` | BUILT | `horses/[id].tsx:270` | |
| Offline / error / not-found | none (old app) | BUILT, ahead | `horses/[id].tsx:261-298` | |
| Sample/preview horse | none | BUILT (ahead) | `config/sample/horse-detail-sample.ts` | X7 |

## 3. Stalls

The shipping Stalls detail has **Summary + Alerts only**: Operations is commented out of the tab config (`(details)/stalls/[id]/(details)/_layout.tsx:82-84`) and History is a placeholder printing the raw id (`history/index.tsx:16`). Treat the two as non-capabilities.

| Capability | Old app (file) | Status | Rewrite | Notes / risk |
|---|---|---|---|---|
| Stalls tab / list with live video cards | `stall-list-widget/index.tsx`, `stall-card/index.tsx` (573 L) | MISSING | No `stalls` route or tab — `src/components/app-tabs.tsx:23-59` has Home/Horses/Protos/More | **Entire feature area unbuilt.** Only `src/app/proto-stalls.tsx`, a design prototype with hard-coded stalls and public `test-videos.co.uk` MP4s |
| Stall group filter chips | `stalls-group-filter-widget` | MISSING | none | |
| Stall card In-Stall / Out-of-Stall tag honouring `hide_metrics_till` | `stall-card/index.tsx:188,509` | MISSING | none | Same frozen-clock design as horses — do not port |
| Stall card ⋮ (Settings / Manage Groups / Remove) | `animal-stall-options-widget` (`itemType='stall'`) | MISSING | none | |
| Stall detail Summary (assigned horse, monitor compat, environment charts, device assignment) | `stall-summary-widget/index.tsx`, `stall-device-assignment-widget` | MISSING | none | |
| Stall detail Alerts tab | `stalls/stall-details/alerts/index.tsx` | MISSING | none | Alerts domain layer exists (`src/domain/alerts/**`) but is not mounted per-stall |
| Stall detail **Operations** (Daily Activities, Routine Breakdown, Stall Cleaning) | `stall-details-operations-widget/index.tsx:19` — "All data on this page is manually recorded" | REMOVED | — | Record family, req §2. Also already unreachable in the shipping app |
| Stall detail **History** tab | `history/index.tsx` | REMOVED (never real) | — | Stub |
| Stall settings page: Name / Device ID / Assigned Horse / Assigned Group | `stall-settings-page`, `settings-details-widget/index.tsx:229-247` | MISSING | none | Mirror the D1 fold when Stalls is scoped |
| Stall settings toggles: Audio Recording | `stall-settings-widget/index.tsx:132`, `config/constants/setting-items.ts:24` | MISSING | none | Only Audio Recording is live; Noise/Indicator/Rentals are commented out |
| Rental-dependent toggles (Video Streaming, People-Based Metrics, Horse Behavior Metrics, Operational Data) | `setting-items.ts:47-68` | MISSING (dark in old app) | none | `stall-settings-page/index.tsx:110` hard-codes `stallRentalsState = false`, so these never render |
| Export all data (stall) | `export-all-data-widget` | MISSING | none | |
| Remove Stall Monitor | `stall-settings-page/index.tsx:238` | MISSING | none | |
| Assign horse → stall / assign stall → horse | `assign-animal-to-stall-widget`, `assign-stall-to-animal` | MISSING (write side) | none | |
| Unassign horse/stall + confirm | `unassign-stall-horse-widget/index.tsx:138-144` | MISSING | none | |
| Re-assign (existing horse vs new horse) | `reassign-animal-widget/index.tsx:78-89`, `reassign-stall-widget` | MISSING | Only a dimmed "Re-assign" label on the horse page | |
| Manage Stall menu (Edit / Re-assign / Un-assign) | `manage-stall-widget/index.tsx:89-103` | MISSING | none | |
| Stall-monitor pairing / device assignment | `stall-device-assignment-widget/index.tsx` | MISSING | none | |
| Stall list pull-to-refresh re-times Prometheus | `stall-list-widget:210-224` (3 pulls in 10 s re-bases `now`) | MISSING | none | Odd heuristic — do not port |

## 4. Spaces

| Capability | Old app (file) | Status | Rewrite | Notes / risk |
|---|---|---|---|---|
| Spaces list + inline search + group filter | `space-list-widget/index.tsx:257-259`, `space-group-filter-widget` | MISSING | none | Whole area unbuilt; not scoped in any doc |
| Space ⋮ (Settings / Manage Groups / Remove) | `animal-stall-options-widget` (`itemType='space'`) | MISSING | none | |
| Space detail: date toolbar + video player + Human-Detected-in-Space chart | `screens/space-details/index.tsx:151,173`, `space-summary-widget` | MISSING | none | |
| Space settings + device settings + Remove Space | `space-settings/index.tsx:137`, `space-device-settings-widget` | MISSING | none | |
| Space detail overlay (no-data) | `space-detail-overlay-provider` | MISSING | none | |

**Risk:** Spaces appears in requirements §2's "~15 feature areas" but has **no scope doc** in `docs/scope/`. Nothing records what it should become.

## 5. Devices / provisioning

| Capability | Old app (file) | Status | Rewrite | Notes / risk |
|---|---|---|---|---|
| Devices list + group filter + provisioning requests | `device-list-widget/index.tsx` | MISSING | `src/app/menu.tsx:156` has a "Devices" row that is **dimmed and unwired** | Whole area unbuilt |
| Device detail: Device Details + Network Details cards | `device-details-widget/index.tsx:741,747` | MISSING | none | |
| Remove From Organization | `device-details-widget/index.tsx:785` | MISSING | none | |
| Configure Bucket Meter / calibration | `device-details-widget:727`, `calibrate-bucket-meter-widget`, `select-bucket-widget` | MISSING | none | |
| Deep links `deviceSetup` / `deviceNavigation` / `deviceConfiguration` (QR-card entry, org validation, redirect) | `apps/expo/src/app/deviceSetup/index.tsx`, `deviceNavigation/index.tsx`, `deviceConfiguration/index.tsx` | MISSING | no equivalent routes | These are the QR-code entry points printed on the device / welcome card (`smd-provisioning-widget:1218`). Losing them breaks the out-of-box flow |
| BLE provisioning: scan → pair → connectivity type → Wi-Fi networks → Wi-Fi credentials → provision → success | `smd-provisioning-widget/index.tsx:722-876`, `common-provisioning-widget/*` | MISSING | none | ~9,000 lines across SMD + BM widgets |
| Post-provision stall setup (info → video → success) | `smd-provisioning-widget:852-876`, `setup-stall-info-page`, `setup-stall-feed-page` | MISSING | none | |
| ~12 provisioning error/recovery screens (restricted internet, BLE disconnected, video not loaded, Wi-Fi timeout, restart device, API not found, request timeout…) | `smd-provisioning-widget:898-1216`, `common-provisioning-widget/ble-error-page.tsx`, `poor-wifi-connection-page.tsx` | MISSING | none | The honest-states surface with the most existing copy to reuse |
| Bluetooth-off sheet | `bluetooth-off-sheet/index.tsx` | MISSING | none | Depends on permissions, PARKED |
| New device detected / device health check / quick-setup checklist / debug pairing mode | `new-device-detected-widget`, `check-device-health-widget`, `quick-setup-checklist-widget`, `debug-pairing-mode-widget` | MISSING | none | |
| Bucket-meter provisioning + calibration | `bm-provisioning-widget/*` (2,937 L) | MISSING | none | |

**Risk:** requirements §5 says provisioning can only be tested next to real hardware, and no scope doc exists for it. This is the largest untouched area in my remit and the one with the longest lead time.

## 6. Sharing / rentals / sharable stalls

| Capability | Old app (file) | Status | Rewrite | Notes / risk |
|---|---|---|---|---|
| Share a horse / stall / space | `animal-stall-options-widget/index.tsx:52` `handleOnShare` = `debug()` only, and the row is filtered out at `:207` | REMOVED | — | Never a live capability (A4) |
| Rentals toggle on a stall | `setting-items.ts:38-42` commented out; `stall-settings-page/index.tsx:110` returns `false` | REMOVED (dark) | — | Unreachable in shipping |
| Rental dashboard / stall management / rental stall details | `packages/app/src/screens/rental-dashboard`, `rental-stall-management`, `rental-stall-details` | REMOVED (unreachable) | — | **No route in `apps/expo/src/app` imports them.** Dead code in the shipping app; do not treat as missing parity |
| Rental share link + QR | `rental-current-occupancy/rental-share-link.tsx:42` | REMOVED (unreachable) | — | Only QR generation in the app is here (and the printed device card) |
| Rental rates / earnings / requests / permissions widgets | `rental-*-widget`, `monthly-earnings-chart`, `weekly-projected-revenue-chart`, `stall-availability-table` | REMOVED (unreachable) | — | Same |
| Clip sharing (`is_shareable`, invitees, access) | `clip-access-widget`, `clip-invitees-widget` | Out of my remit | — | Live capability; belongs to the Clips audit |

---

# Bugs / suspicious code in the rewrite (files I read)

1. **The horse detail's frame "cache-buster" does nothing** — `src/hooks/use-horse-detail.ts:20-23`. `quantisedEpoch` returns `floor(now/300)*300 + refreshToken`, and the URL builder floors to a **10-second** grid (`src/config/utils/stall-monitor-video-helper.ts:118`). Tokens 1–9 collapse back to the same `.../frames/<epoch>.jpeg`, so pull-to-refresh never fetches a new frame; token 10 jumps to a 10 s bucket that probably has no frame. The comment at `:164` ("Bump only on an explicit pull…") describes behaviour that does not exist — the exact failure mode the rework instructions §2.1 called out for the list. The list does it correctly with a `?v=` suffix (`horses-data.ts:133`); the two paths disagree.

2. **Detail hero asks for a frame slice the list deliberately avoids** — `use-horse-detail.ts:21` uses `DateTime.now()`, while `use-horses.ts:117` and `use-snapshots.ts:91` both use `DateTime.now().minus({ minutes: 5 })` with a comment saying the newest slice is not always flushed. The detail page can therefore show an empty hero for a horse whose list row showed a frame.

3. **Pull-to-refresh spinner stops early** — `src/app/(tabs)/horses/[id].tsx:193-198,312`. `refreshing` is bound to `horse.isRefreshing` alone, but `onRefresh` also fires `status.refetch()` / `events.refetch()` / `alerts.refetch()`, which are not awaited. The spinner reads "done" while the list is still loading — the same finding that produced the separate `isRefreshing` flag in `use-horses.ts:49`.

4. **Wrong copy: "end of day"** — `horses/[id].tsx:398`. For a past day the label says `${dayLabel}, end of day`, but `playhead-data.ts:77 cursorFor` deliberately carries the **time of day** across a day change (and its own comment at `:70-75` records that an earlier end-of-day version was corrected). The MediaTile tag two lines of code away says the truth (`:334`, `From 2:32 PM`). The strip contradicts it on the same screen.

5. **Event cards on the horse page are dead controls** — `horses/[id].tsx:308` renders `<EventCard event={item} />` with no press handler. The shipping app's per-horse feed jumps to that event's timestamp (`feeds/index.tsx:63-81`), and scope item E2 assigns this to slice 2 (shipped). Violates "every visible control navigates, acts, or is visibly disabled with a reason" (§6b item 3) — a card that looks tappable and isn't.

6. **`inStallCutOff` is unreachable** — `src/config/constants/prometheus-queries.ts:55-61` + `horse-status-data.ts:66-70`. The exclusion band 0.3–0.7 is tested first, so the 0.5 cutoff can only ever apply to values already excluded. Faithfully ported from the shipping app (`packages/config/src/constants/thresholds.ts:55-59`), but the rewrite hard-codes it where the old app reads Remote Config overrides (`animal-stall-card/index.tsx:151-165`) — so §6a-i will land on a constant that is already dead.

7. **`ACTIVENESS_LEVELS` has a duplicate threshold** — `prometheus-queries.ts:69-73`: `Med` and `Low` are both `0.01`, so `categorise`'s `find` can never return `Low` (it only appears via the fallback at `horse-status-data.ts:97`). Same defect as the shipping app; worth fixing rather than porting.

8. **`retry` identity churns every render** — `horses/index.tsx:116-119` depends on `horses` and `groupsQuery`, both fresh objects each render, so the offline-recovery effect at `:121-136` re-runs on every render. Harmless today (guarded by `wasOfflineRef`), but it is a re-entrancy hazard the moment anything else is added to that effect.

9. **Sample-mode decision via `setTimeout(…, 0)`** — `horses/index.tsx:76-81`. A zero-delay timer to defer a `setState` is a race workaround, not a rule; it also fires on every dependency change including `horses.rows.length`.

10. **`hasNoStall` is computed and never consumed** — `use-horse-detail.ts:187`. `[id].tsx` uses `deriveOverlay` instead. Dead field on a public interface.

11. **Status errors are silent** — `use-horse-status.ts:145-146` exports `isLoading`/`isError`, and `horses/[id].tsx` reads neither. If the sensor query fails, `readings` is simply empty and the strip shows nothing where temperature/noise should be — the "renders nothing for three different facts" failure the file's own doc comment (`horse-status-strip.tsx:22-25`) says it exists to avoid. Only the in-stall query has an honest failure state.

12. **Date-bar double tap loses a step** — `horse-date-bar.tsx:49` computes `day.minus({days:1})` from the prop, and `use-playhead.ts:56` captures `day` from the same render. Two taps inside one render batch both resolve to the same target day.

13. **`canGoBack` is permissive when `createdAt` is unknown** — `playhead-data.ts:96`. On a cold deep-link (row served from the selection cache, `animal.created_at` not yet loaded) the back arrow will page indefinitely into empty days, which is precisely what the minimum-date rule exists to prevent.

14. **`Devices` menu row is dimmed with no reason** — `src/app/menu.tsx:156`. `MenuRow` greys unwired rows but shows no explanatory text, unlike every other disabled control in the Horses area, which carries a `description`.

15. **Prototype ships public third-party video URLs** — `src/app/proto-stalls.tsx:40-42` hits `test-videos.co.uk` and is reachable from the Protos tab (`(tabs)/explore.tsx:106`). Fine for R&D; must not survive into a beta build.