# Horse Details page — scope for the rewrite

**Date:** 2026-08-17 · **Author:** Claude, for Inakshi · **Status:** SCOPED — D1–D8 decided 2026-08-17 (see §6). Scoping only; nothing implemented yet
**Repo:** `horcery-app-rewrite`, branch `rnd` · **Route today:** `src/app/(tabs)/horses/[id].tsx`

This document is the result of reading every source file behind the shipping
horse details page — the layout, the three tabs, the fifteen widgets they mount,
the two stores that drive them, the video player and its timeline, the settings
page behind the cog — and comparing that against what Codex has built on `rnd`
and against every decision already recorded in `Horcery_App_Rewrite_Requirements.md`
and `PRINCIPLES.md`.

It is written for a decision, so it is opinionated. Where I recommend, I say
why. Where the call is yours, I say that too.

---

## 0. The one-paragraph version

The shipping horse details page is **not** "a horse's profile with three tabs".
It is the app's second-largest surface: a live video player with a scrubbable
timeline, a stats strip, a date bar, and a Summary tab that mounts **eleven
charts across five cards**, plus Events, plus Alerts, plus a settings page
behind a cog. Roughly **5,600 lines of source** and, on a cold open of Summary,
**~30 network requests**. What Codex has built is a header (photo, name, stall)
and three labelled placeholders — honest and correct as a seed, ~3% of the
surface. This scope proposes building it in **four slices**, in a deliberate
order, with **charts explicitly gated on the §6a renderer decision and the
§6a-i configuration decision** so that neither the horse page nor For You is
the first place a chart engine gets committed by accident.

---

## 1. What the shipping page actually is

### 1.1 The frame (present on every tab)

Source: `apps/expo/src/app/(details)/animals/[id]/(details)/_layout.tsx` (610 lines).

| Element | What it does | Notes |
|---|---|---|
| **Navbar** | Horse name, back button | Back target depends on where you came from (Horses vs Show Me) |
| **Statistics strip** | Three tiles: Activeness (flag), Temperature, Noise Level — read from the stall's Prometheus at the current cursor time | Hidden when the horse has no stall. Two Prometheus queries |
| **Settings cog** | → `/(settings)/[id]/animal-settings` | See §1.5 |
| **Date toolbar** | Day picker; minimum date = the horse's `created_at`; drives every chart and the video cursor | Sets the store's `date` |
| **Video player** | Live stream (HLS, HD/SD, audio on/off) **or** recorded playback at the cursor, with a horizontal **scrubbable timeline**, play/pause, mute, HD toggle, **create clip**, fullscreen (pinch-to-zoom); auto-pauses on blur; restores live on foreground; shows a "tilt the monitor" overlay when the stall needs adjustment | Hidden when no stall. Player 345 lines + timeline 1,060 lines + fullscreen view 749 + controls overlay 599 = **~2,750 lines** |
| **Tab bar** | Summary · Events · Alerts, with icons; sticky under the player on phone; side-by-side layout on tablet-landscape | |
| **Pull to refresh** | Invalidates stall detail, animal detail, animal→stall, event list, and resets date+cursor to now | |
| **Content skeleton** | Shown until the animal **and** its stall are both resolved | |

### 1.2 The Summary tab

Source: `packages/app/src/screens/animals/animal-details/summary/index.tsx` and its widgets.

Rendered top to bottom, each a card:

| # | Card | What's inside | Gated by | Size |
|---|---|---|---|---|
| S1 | **Summary** | (a) **Last 24 Hours** — a donut of Resting / Awake / Out of Stall / Unknown hours, plus progress bars, from three pre-aggregated Prometheus series; (b) **Water summary** and **Feed summary** rows if the horse has bucket meters; (c) **Trends** — Activeness trend line and Rolling trend chart, with a switch and an info sheet | `prom.last24Hours`, `trends.activenessHourly`, `trends.rollingHourly`, `intake.animalWater/FeedEnabled` | 264 + 346 + 100 + two chart widgets |
| S2 | **Stall** | Header with **Re-assign / Assign** link; an info box; a navigable row to the stall's own detail page (with back-and-forth memory so you can bounce between horse and stall); then **five charts**: Stall Occupancy, Lying Down, Human In Stall, Activeness, Human Near Stall — laid out 2-up on tablet | `prom.stallOccupancy`, `prom.lyingDown`, `prom.humanInStall`, `prom.activeness`, `prom.humanNearStall` | 314 + five chart widgets |
| S3 | **Environment** | Climate chart (temperature + humidity) and Ambient chart (noise + light), 2-up on tablet | `environment.climate`, `environment.ambient` | 60 + 384 + 382 |
| S4 | **Intake** | Water consumption, water refills, feed consumption, feed refills — four charts, only when the horse or its stall has the matching bucket meters | six intake flags | 60 + four chart widgets |
| S5 | **Devices** | Every device on the horse **and** on its stall (bucket meters, monitors), each with a live connection check; tap → device detail | none | 177 |
| S6 | **Passport** | Barn name, registered name, gender, DOB, breed, height, weight (unit-aware); pencil → the edit form (view-only for non-editors) | permissions | 178 |
| S7 | **Feedback** | "We'd love to hear from you" card → opens a web form; dismissible via a store flag | store flag | 81 |

**Overlays that sit across S1–S3:**

- **No stall** — "Connect Stall Monitor for data" over the chart cards.
- **Metrics hidden** — "We're getting to know your horse" until `hide_metrics_till`
  passes (typically the first N hours after provisioning).
- **Unsupported view** — when the stall's monitor placement is flagged
  `model_compatibility.is_supported === false`, the whole chart area is replaced
  by an "unsupported view" card explaining why.
- **Stall-monitor-not-assigned sheet** — pops **automatically** on Summary for
  admins/editors when the horse has no stall and hasn't dismissed it before.

**Chart count on Summary:** 1 (donut) + 2 (trends) + 5 (stall) + 2 (environment)
+ up to 4 (intake) = **up to 14 chart surfaces**, of which 11 render for a
typical horse with a monitor and no bucket meters.

### 1.3 The Events tab

Source: `packages/app/src/screens/animals/animal-details/feeds/index.tsx` (277 lines).

- Infinite list of this horse's events for the **10 days ending on the selected
  date**, newest first, filtered to `EVENT_FEED_TYPES`.
- Each is a **ReviewCard** — video preview when the event has a valid clip,
  written info panel otherwise, a tag (stall name / deleted markers), and a
  detail button that jumps to the horse-or-stall detail **at that event's
  timestamp**.
- Header "Events" card, load-more via a scroll-end sentinel, own refresh, own
  loading/empty/error states.
- Requests: one paginated `event.infiniteList`.

**This is functionally Review History filtered to one horse.** The rewrite
already has that page (`review-history.tsx`, `use-review-history.ts`,
`event-card.tsx`) with the corrected event-type map.

### 1.4 The Alerts tab

Source: `alerts-widget/index.tsx` (88) + `alert-frequency-chart` (239) +
`alert-list-widget` (192).

- A **Manage Alerts** row (shown only if the org is in `MANAGE_ALERTS_ORG_IDS`;
  gated by EDIT permission) → the manage-alerts screen.
- An **Alert Frequency** chart.
- An **alert list** — infinite `event.infiniteList` filtered to alert types.

### 1.5 The settings page (behind the cog)

Source: `animal-settings-page` (132) + `animal-settings-details-widget` (354).

- **Details** card: Name, Device ID, Assigned Stall, Assigned Group — each row
  navigable/editable.
- **Export all data** widget (date-scoped, org-gated by `EXPORT_ALL_DATA_ORG_IDS`).
- **Delete Horse** — destructive, permission-gated, confirm sheet.

### 1.6 The state that holds it together

`useAnimalDetailStore` = an **animal/stall slice** (id, animal, stall,
hasNoStall, isAnimalResolved, isStallResolved) + a **play-head slice** (date,
timeOfDay, computed cursor and query bounds, `scrubTo`, clamping to now-minus-
buffer). Every widget reads from this store rather than props. `setStall` blanks
`prometheus_url` when the stall has no monitor, which is how "has a stall but no
camera" is modelled.

### 1.7 Cold-open cost

Counting `useQuery` / `useInfiniteQuery` on the Summary path with a monitored
stall and no bucket meters: layout 2 + stats 2 + last-24 1 + water/feed summary
3 (fires even when disabled by flag? — no, gated) + trends 6 + activeness 1 +
environment 4 + devices 2 + stall card 1 + not-assigned hook 1 + five bar-chart
widgets ≈ 5–8 = **~30 requests**, plus the HLS stream, plus the timeline's
segment fetches. Several are the *same* `animalStall.list` key (15 files import
it) and are deduplicated by React Query — but the widgets don't know that, and
each one independently decides "loading".

---

## 2. What the rewrite has today

`src/app/(tabs)/horses/[id].tsx` (190 lines), after Codex's 14:48 restore:

- Loads the animal by id (falls back to the list cache; cold-start fetch works).
- **MediaTile** hero (stall frame or profile photo, 4:3, tokens).
- Name (large title) + stall name.
- Surface-layer **SegmentedControl** with Summary / Events / Alerts.
- Each tab: a title and one honest sentence saying what it will hold.
- Loading, error, not-found states.

Nothing else. No store, no date, no cursor, no video, no charts, no events, no
alerts, no settings, no overlays. That is correct for a seed and the honesty is
right — but it means everything in §1 is unbuilt.

---

## 3. Decisions already taken that constrain this page

These are settled. The scope must respect them, not re-open them.

| Decision | Where | Effect on this page |
|---|---|---|
| **Record / manual logs removed** | Req §2 | Events tab shows no manual event types; no "Record" affordance anywhere on the page |
| **Editorial palette; purple only on control fills** | Req §4d, PRINCIPLES "Colour" | Chart palettes must be derived from tokens; the old indigo/pink/cyan chart colours do not carry over. **The Water Intake cyan is already flagged as out-of-palette on For You** |
| **One camera frame — MediaTile, 4:3, overlay caption** | Req §4e | The video hero must be a MediaTile with `videoUri` + `live`, not a fourth player treatment |
| **Charts: renderer decided by the §6a spike; never two engines; feature screens never author PromQL or import a chart lib** | Req §6a | **Every chart on this page waits for the renderer decision.** The domain layer (`IntervalEvent`, `ObservationSeries`, `Threshold`) is what this page consumes |
| **§6a-i open: where chart config (queries, HIDE_* flags, org lists, thresholds) lives** | Req §6a-i, task #13, GH issue #1 | The 14 chart surfaces here are all flag-gated and all read Remote Config query strings. **Cannot wire them until decided** |
| **Read-only against production** | standing | Re-assign stall, Passport edit, Delete Horse, Manage Alerts, Create Clip, feedback dismiss — all disabled-with-reason until the write side |
| **Every visible control navigates, acts, or is visibly disabled with a reason** | Req §6b item 3 | No dead pencils, no dead cogs |
| **No frozen clock** | Req §6b, Horses parity C7 | The old In/Out pill and `hideMetricsTill` used a `useState(DateTime.now())` frozen at mount. The rewrite has `useOrganizationNow` — the store's `now` must be live |
| **In Stall / Out of Stall status lives HERE, not on the list** | Horses parity A1 | This page owes the user that status, from a live clock |
| **Bottom sheets, not dropdowns; blur behind, no shrink** | Req §4e | Re-assign, clip, info sheets → surface `Menu`/sheet |
| **Honest states — offline, error, empty, "running on defaults"** | Req §6b, Horses parity E | Every card needs its own honest empty/error, and the page needs offline |
| **Android is first-class** | Req §4 | Universal components only; the old timeline is heavily gesture-handler + reanimated and was iOS-tuned |

---

## 4. Everything to build, keep, change, or remove

Legend: **BUILD** = new in the rewrite · **REUSE** = exists in the rewrite already · **CHANGE** = shipping behaviour, deliberately altered · **REMOVE** = shipping behaviour, deliberately not carried · **DEFER** = carried later, with a reason · **DECIDE** = needs Inakshi

### 4.1 Frame

| # | Item | Verdict | Notes |
|---|---|---|---|
| F1 | Native header with horse name, back | **REUSE** | Already there. Keep `headerBackButtonDisplayMode: 'minimal'` |
| F2 | Back-target memory (return to Show Me vs Horses) | **REMOVE** | Show Me is undecided (Horses parity B3); native stack back is correct by default. Revisit only if Show Me returns |
| F3 | Statistics strip (Activeness / Temperature / Noise) | **BUILD** — slice 2 | Two Prometheus point queries at cursor. Small, high value, no chart engine needed (they are numbers). Needs §6a-i for the query text |
| F4 | Settings cog → settings page | **BUILD** — slice 3 (read-only version) | See §4.6 |
| F5 | Date toolbar (day picker, min = created_at) | **BUILD** — slice 2 | Native date picker via `@expo/ui` DateTimePicker (universal). Drives cursor for stats, charts, events |
| F6 | Live/recorded video hero with timeline | **BUILD** — slice 4, **as a MediaTile in live mode first** | See §4.7 for the split |
| F7 | Tab bar Summary · Events · Alerts | **REUSE**, **CHANGE** | Keep SegmentedControl. **Add** the tab icons? — no: editorial rule says text tabs (already decided for review history). Text only |
| F8 | Sticky tab bar under player on phone; side-by-side on tablet-landscape | **BUILD** — slice 2 (sticky), **DEFER** tablet split | Tablet layout is a pre-beta check per §6a device-scope decision |
| F9 | Pull to refresh (invalidates the page's queries, resets cursor to now) | **BUILD** — slice 1 | Own `refreshing` state (the correct semantics from the Horses review) |
| F10 | Content skeleton until animal + stall resolved | **BUILD** — slice 1 | Use the horses skeleton pattern |
| F11 | `useAnimalDetailStore` (zustand, two slices) | **CHANGE** | Do **not** port the global store. Page-scoped React context or plain hooks: `useHorseDetail(id)` (animal + stall + derived flags) and `usePlayhead()` (date, cursor, clamping). Same behaviour, no global singleton, no cross-page leakage — the old store is shared with Stall details and leaks state between them |
| F12 | Blur/focus video pause, foreground restore | **BUILD** — slice 4 with the player | Belongs to the MediaTile live variant |
| F13 | Overlays: no-stall, metrics-hidden, unsupported-view | **BUILD** — slice 2 | One `DetailOverlay` component with the three copy variants, from tokens; live clock for `hide_metrics_till` |
| F14 | Auto-popping "assign a stall monitor" sheet | **CHANGE** → **do not auto-pop** | Replace with an inline call-to-action row inside the Stall card ("No stall assigned — Assign", disabled-with-reason). Auto-popping a sheet on page open is the kind of interruption the principles reject; the information is the same |

### 4.2 Summary tab — S1 Summary card

| # | Item | Verdict | Notes |
|---|---|---|---|
| S1a | Last 24 Hours donut + bars | **BUILD** — slice 3, **after §6a** | Chart. Domain input: three `ObservationSeries` → four derived hours. Good second chart after People In Stall |
| S1b | Water / Feed summary rows | **DEFER** to the Intake slice (§4.5) | Only renders with bucket meters; QA org has none |
| S1c | Activeness trend + Rolling trend + switch + info sheet | **BUILD** — slice 3, **after §6a** | Two line charts. Info sheet → surface sheet |
| S1d | Special-instructions block | **REMOVE** — decided | The Summary card holds a stub (hard-coded "Buttercup" text, add/delete only `debug()`) of a real half-built feature: event type 7, unmounted `special-instructions-card-widget`, a Review History filter. **Inakshi, 2026-08-17: out.** A special instruction is customer-typed text, so it is part of the **Record** family removed on 2026-08-16 (req §2). Not a deferral — a removal. Review History's default type list no longer requests type 7 |

### 4.3 Summary tab — S2 Stall card

| # | Item | Verdict | Notes |
|---|---|---|---|
| S2a | Stall row → stall detail (with bounce-back memory) | **BUILD** — slice 1 (row) ; **DEFER** navigation | Row shows stall name or "No stall assigned". Navigation waits for the Stalls page to exist; until then the row is disabled-with-reason "Stall page coming" |
| S2b | Re-assign / Assign link | **BUILD** disabled-with-reason — slice 1 | Write side |
| S2c | Info box "Navigate to the stall…" | **REMOVE** | Instructional chrome; the row's own label carries it |
| S2d | **In Stall / Out of Stall status** | **BUILD** — slice 2 | **This is A1 from the parity doc.** One Prometheus point query at *live now*, refreshed on interval; state names: In stall / Out of stall / No camera / Checking / Unknown — five honest states, unlike the old pill that vanished for three of them |
| S2e | Stall Occupancy chart | **BUILD** — slice 3, after §6a | |
| S2f | Lying Down chart | **BUILD** — slice 3, after §6a | |
| S2g | Human In Stall chart | **BUILD** — slice 3, after §6a | This is **People In Stall — the §6a first slice.** It lands here and on For You from the same domain layer |
| S2h | Activeness chart | **BUILD** — slice 3, after §6a | |
| S2i | Human Near Stall chart | **BUILD** — slice 3, after §6a | |
| S2j | 2-up tablet layout | **DEFER** | Pre-beta check |
| S2k | Unsupported-view card | **BUILD** — slice 2 | Part of F13 |

### 4.4 Summary tab — S3 Environment card

| # | Item | Verdict | Notes |
|---|---|---|---|
| S3a | Climate chart (temp + humidity) | **BUILD** — slice 3, after §6a | Continuous time series — one of the "capabilities People In Stall does not exercise" that §6a says must be proven before renderer selection. **This chart is a good candidate for that proof** |
| S3b | Ambient chart (noise + light) | **BUILD** — slice 3, after §6a | Same family as S3a |

### 4.5 Summary tab — S4 Intake, S5 Devices, S6 Passport, S7 Feedback

| # | Item | Verdict | Notes |
|---|---|---|---|
| S4 | Intake — four charts, bucket-meter gated | **DEFER** — own slice after S3 | Water Intake is already on For You (cyan, out of palette — fix there first). Needs a horse with meters to test; QA org may not have one. **Also see the water chart in §6a: "replaced regardless" because it's a runtime-downloaded WebView chart** |
| S5 | Devices card with live connection checks | **BUILD** — slice 3 (list) ; **DEFER** connection ping | The list is two cheap queries and honest information. The per-device Prometheus "is it connected" ping is N more requests; carry it as a later enhancement with a stale indicator |
| S6a | Passport fields | **BUILD** — slice 1 | Pure display from the animal record we already have. Unit-aware via user preferences |
| S6b | Passport pencil → edit form | **BUILD** disabled-with-reason — slice 1 | Write side; view-only for non-editors is moot until then |
| S7 | Feedback card | **REMOVE** from this page | It's a marketing card in the middle of a data page. If feedback belongs anywhere it's More. Note it, don't carry it |

### 4.6 Settings page (behind the cog)

| # | Item | Verdict | Notes |
|---|---|---|---|
| G1 | Details: Name / Device ID / Assigned Stall / Assigned Group | **CHANGE** → fold **into the Passport card** on Summary | These are four more read-only fields about the horse. A separate page behind a cog to show them is a navigation cost with no benefit. Passport becomes "About this horse" — barn name, registered name, gender, DOB, breed, height, weight, **stall, group(s), device ID** |
| G2 | Export all data | **DEFER** | Org-gated (`EXPORT_ALL_DATA_ORG_IDS`); a write-adjacent action (generates and sends). Carry with the write side |
| G3 | Delete Horse | **BUILD** disabled-with-reason — slice 1 | Belongs in the ⋮ on the list card (already there) and in the header ⋮ here. Not a full-width red button at the bottom of a page |
| G4 | The cog itself | **REMOVE** if G1–G3 land as above | With Details folded in, Export deferred and Delete in the ⋮, the cog has nothing left to open. Replace with a header **⋮** (Edit · Manage Groups · Remove — same menu as the list card) |

### 4.7 Video (the big one)

The shipping player is ~2,750 lines and is the most iOS-specific code in the app
(gesture-handler timeline, reanimated, custom fullscreen). It is also where the
"premium" feel is most visible to a customer. Recommendation: **split it in
three, and do not attempt the whole thing in one go.**

| # | Item | Verdict | Notes |
|---|---|---|---|
| V1 | **Live stream in the MediaTile** (HLS, poster, LIVE badge, tap-to-play/pause, mute) | **BUILD** — slice 4a | `MediaTile` already accepts `videoUri` + `live`. This is the same treatment For You Snapshots gets. Auto-pause on blur, restore on foreground |
| V2 | **HD/SD toggle, audio on/off from stall `UserMetaData.audio_enable`** | **BUILD** — slice 4a | Small; part of V1's controls |
| V3 | **Fullscreen with pinch-to-zoom** | **CHANGE** → native fullscreen | `expo-video`'s `VideoView` has native fullscreen on both platforms with system controls. Use it. Do not port the 749-line custom fullscreen view |
| V4 | **Recorded playback at cursor** (60-minute window from cursor) | **BUILD** — slice 4b | Same MediaTile, `live=false`, `videoUri` = recorded URL at cursor. Cursor comes from the date toolbar (F5) initially |
| V5 | **Horizontal scrubbable timeline** with zoom, segments, live-buffer detection, momentum | **BUILT — slice 4c, 2026-08-19.** Verified on iOS against SM-93 (drag, momentum, detented pinch, day-change follow, return-to-live, recorded playback at the scrubbed instant). **Android still unmeasured** — see D2 | 480 lines across two files, not 1,060 across six. Drag, momentum and clamping run on the UI thread; the JS thread is asked only for a new tick window and the scrub bubble. **Zoom now works, which it never has in the shipping app** — see the §4.7a finding below |
| V6 | **Create Clip** from the player | **BUILD** disabled-with-reason — slice 4a | Write side (clip creation is a mutation). But the button must exist so the composition is judged whole |
| V7 | **"Adjust your monitor" overlay + Adjust Now** | **BUILD** — slice 4a (overlay) ; **DEFER** action | Overlay is honest state from `AppMetaData.adjustment_direction`. The action opens a reposition sheet — write side |
| V8 | **Playback speed** | **REMOVE from live**; **BUILD in 4b (recorded)** | Shipping code wraps it in `{false && …}` with a `/* no-op */` handler — a placeholder icon, never wired. Useless on a live stream; genuinely useful on recorded playback and clips (1.5×/2× to skim the night). `expo-video` supports it natively with one property — a small addition to slice 4b, not a feature to design |
| V9 | **Download video** | **REMOVE** from this page | Exists in the regular-controls variant only (clip playback), not the live variant. Belongs to clips |

### 4.7a The zoom D2 chose does not work in the shipping app

Found while building slice 4c, and worth recording because D2 was a decision to
take *more* work in exchange for parity, and the parity was not there.

In `84-horcery-app-react-native`, the timeline's zoom is dead code:

- the pinch gesture is commented out (`horizontal-timeline-widget/index.tsx`,
  lines 577–593);
- `ZoomProvider` is mounted with `initialZoom={1}`;
- nothing in the app calls `setZoom` or `updateZoom` — grep across `packages/`
  and `apps/expo/src` returns only the widget's own definitions.

So the shipping timeline runs at zoom 1 for its entire life, and six of the
seven rungs of its tick ladder are unreachable. There is a likely reason it was
abandoned: the widget renders thirteen fixed six-hour segments and draws every
tick in each, so zoom 100 asks for roughly 9,400 tick views. The repository
still carries the branches from the fight — `zoom-timeline-test`,
`zoom-timeline-test-1`, `zoom-timeline-testing`, `timeline-desyncing--issue`,
`timeline-ticking-background-state`.

A literal "full port" would therefore have reproduced an inert feature. What
was built instead ports the ladder **and makes pinch work**, by rendering only
the ticks in view — which keeps the count near-constant at every zoom rather
than exploding. Pinch moves between seven detents, one per rung, so every step
visibly re-ladders and the JS thread redraws at most once per step.

**This is more than the shipping app has, not less.** Flagged rather than
quietly delivered, because it changes what "parity" means for this control: if
Inakshi wants the timeline to behave exactly as customers see it today, the
answer is to remove the pinch, not to add it.

### 4.8 Events tab

| # | Item | Verdict | Notes |
|---|---|---|---|
| E1 | 10-day event feed for this horse ending on selected date | **REUSE** Review History → **BUILD** thin wrapper — slice 1 | `useReviewHistory` with an `animalId` param and the date window from the play-head. `EventCard` renders each. Manual event types already excluded by the corrected type map |
| E2 | Detail button → open at event timestamp | **BUILD** — slice 2 | Sets the play-head cursor to `event.start_time` and switches to Summary. No navigation needed — we're already on the horse |
| E3 | Own header card, refresh, load-more sentinel | **CHANGE** | Drop the "Events" card header (the tab is the header). Standard FlashList `onEndReached`, not a sentinel-in-view hack |
| E4 | Tablet 2-column | **DEFER** | |

### 4.9 Alerts tab

| # | Item | Verdict | Notes |
|---|---|---|---|
| A1 | Manage Alerts row (org-gated, EDIT-gated) | **BUILD** disabled-with-reason — slice 1 | Write side. Show for everyone, dimmed with reason, until permissions (Horses parity B1) land — then gate |
| A2 | Alert Frequency chart | **BUILD** — slice 3, after §6a | Chart |
| A3 | Alert list (infinite, alert event types) | **REUSE** Review History → **BUILD** thin wrapper — slice 1 | Same as E1 with the alert type filter. `EventCard` already handles the alert card shape |

### 4.10 Cross-cutting

| # | Item | Verdict | Notes |
|---|---|---|---|
| X1 | Offline state for the page | **BUILD** — slice 1 | Codex's `HorsesNoInternet` + `useOnlineStatus` from the list — reuse |
| X2 | Error boundary | **REUSE** | Root `ErrorBoundary` exists now |
| X3 | Toasts | **REUSE** | `ToastHost` exists now |
| X4 | Permissions (ADMIN/EDITOR/VIEWER/GUEST/RESTRICTED) | **DEFER** — Horses parity B1 | Affects: Re-assign, Passport pencil, Delete, Manage Alerts, Create Clip, Adjust Now. Until B1: all disabled-with-reason for everyone |
| X5 | i18n | **DEFER** — H2 | Strings hard-coded like the rest of `rnd` for now; H2 sweeps them |
| X6 | Request budget | **BUILD** — measure — slice 1 | Target on cold open of Summary **before charts**: animal (cached from list) + animal→stall (cached from list) + stats 2 + status 1 + events 1 = **≤ 5 requests**, versus ~30. Charts add one per chart. Report the number, as we did for the list |
| X7 | Sample data mode | **BUILD** — slice 1 | `PREVIEWS.sampleHorsesData` already seeds `sample-*` ids; the detail must render a full sample horse (photo, passport, status, events) so the page can be judged in design review without a QA org horse that has everything |
| X8 | Tests | **BUILD** — every slice | Hook tests for play-head clamping (the old store's clamp-to-now-minus-buffer logic is subtle and worth locking), status derivation (five states), passport formatting (units); component tests for the overlay variants; the no-dead-controls sweep extended to this file |

---

## 5. Proposed slices, in order

The order is chosen so that **each slice is a page a customer could use**, and
so that nothing depends on a decision that hasn't been made yet.

### Slice 1 — "The honest horse page" (no charts, no video, no clock)

Passport (with stall/group/device-id folded in) · Stall row (disabled nav) ·
Events tab (real, via Review History) · Alerts tab list (real) · Manage Alerts,
Re-assign, Passport edit, Delete — all disabled-with-reason · header ⋮ ·
offline · pull-to-refresh · sample mode · skeleton · request count.

**Depends on:** nothing. **Delivers:** a page that shows everything the API
already tells us about the horse, plus its history, with no engine decisions.

### Slice 2 — "The living horse page" (clock, status, stats, overlays)

Play-head hook (date, cursor, clamping) · Date toolbar · **In/Out of Stall
status** (live clock, five states) · Statistics strip · the three overlays
(no-stall, metrics-hidden, unsupported) · Events "open at time" → cursor ·
sticky tab bar.

**Depends on:** §6a-i for the *query text* of the status and stats queries. If
undecided, use the baked-in defaults from `default-frc-values` and **label the
page as running on defaults** — this is the honest-states rule applied to
Remote Config, and it forces the decision to be made rather than dodged.

### Slice 3 — "The charted horse page"

Last 24 Hours · Trends (2) · Stall charts (5) · Environment (2) · Alert
Frequency · Devices list.

**Depends on:** §6a renderer decision **and** §6a-i. **People In Stall (S2g)
and Climate (S3a) are the two charts to build first** — they are the §6a first
slice and the "continuous series" proof respectively, and both live on this
page.

### Slice 4 — "The watched horse page" (video)

4a: live MediaTile + controls (HD, mute, fullscreen-native, clip button dimmed,
adjust overlay) · 4b: recorded playback at cursor · 4c: timeline scrubber.

**All four shipped.** 4a and 4b device-verified 2026-08-18, 4c on 2026-08-19.
The remaining gate on 4c is Android: it is written universal (gesture-handler +
reanimated, no platform imports) but has not been run on the Redmi Note 12,
which D2 made a condition of "done". That is blocked on task #12, the Android
dev client.

**Depends on:** MediaTile's live variant being proven on For You Snapshots
first (H5). Recommend it lands there before here so the horse page inherits a
tested tile.

**Deferred beyond slice 4:** Intake charts, device connection pings, tablet
layouts, Export, write side (assign/reassign, edit, delete, clip, adjust,
manage alerts), permissions gating (B1), i18n (H2), zoomed timeline (V5 option a).

---

## 6. Things I need you to decide

Ordered by how much the answer changes the build.

| # | Question | My recommendation | Why it matters |
|---|---|---|---|
| D1 | Fold the settings page into the Summary Passport card and replace the cog with a ⋮ | **DECIDED 2026-08-17: Yes** | Removes a whole page and a navigation hop; every field is read-only anyway |
| D2 | Timeline scrubber: port the zoomed segment timeline, or ship a simpler day-strip + time slider first | **DECIDED 2026-08-17: PORT THE FULL ZOOMED TIMELINE** (Inakshi, against Claude's 'simple first' recommendation). **BUILT 2026-08-19**, with one correction to what "full" meant — see §4.7a | Full parity from day one. Consequence accepted: slice 4c is the largest single piece of iOS-tuned gesture code in the app and its Android parity is unproven — it must be built universal (gesture-handler + reanimated on both platforms) and measured on the Redmi Note 12 before it is called done. **Universal: yes. Redmi: still outstanding**, blocked on task #12 |
| D3 | Do not auto-pop the 'assign a stall monitor' sheet on open | **DECIDED 2026-08-17: don't auto-pop; inline CTA row** | Interruptive; the information is identical inline |
| D4 | Remove the Feedback card from this page | **DECIDED 2026-08-17: remove** (consider More) | Marketing chrome inside a data page |
| D5 | Text-only tabs (no icons), consistent with Review History | **DECIDED 2026-08-17: text only** | Already the editorial rule |
| D6 | Slice order | **DECIDED 2026-08-17: Honest → Living → Charts → Video, as proposed** | Charts before video keeps the renderer gate honest; the live tile proves itself on For You Snapshots first |
| D7 | Ship slice 2 on default queries if §6a-i isn't decided, with a visible label | **DECIDED 2026-08-17: yes** | Honest, and it makes the decision unavoidable |
| D8 | ~~Special Instructions~~ | **Decided 2026-08-17: OUT** | Record-family (customer-entered text). See S1d and requirements §2 |
| D9 | The timeline's pinch-to-zoom works here and does not work in the shipping app (§4.7a). Keep it, or remove it for behavioural parity? | **DECIDED 2026-08-19: KEEP IT** (Inakshi) | A deliberate departure, not an oversight. The rewrite does something customers cannot do today: five-minute tick spacing is how you find a specific incident instead of scrubbing past it. **Do not "restore parity" by removing the pinch** — that would be undoing a decision, not fixing a drift. The structural reason the original was likely abandoned (≈9,400 tick views at full zoom) does not apply to windowed rendering |

Not asking you about: chart renderer (§6a owns it), permissions (B1, parked),
Show Me (B3, parked), Record (removed).

---

## 7. What is deliberately NOT in scope

- Any chart before the §6a decision.
- Any write action becoming live.
- The Stall detail page (a sibling of the same size — this document is the
  template for scoping it, and V1–V5, F3, F5, F13, S3, S4, S5 are all shared).
- Tablet layouts beyond "does not break".
- Playback speed on the LIVE player (never rendered; recorded playback gets it
  natively in 4b), download from the live player (wrong surface), the feedback
  card, the settings cog, back-target memory. Special Instructions — decided OUT
  2026-08-17 as part of the Record family (D8, S1d).

---

## 8. Size, honestly

| Slice | Rough size | Blocked by |
|---|---|---|
| 1 | Small–medium. Mostly reuse and composition. | — |
| 2 | Medium. The play-head hook and status derivation want careful tests. | §6a-i (or the "defaults + label" path) |
| 3 | Large. 11 chart surfaces, but each is thin once the domain layer exists. | §6a + §6a-i |
| 4 | Medium (4a) → Large (4c). | H5 (MediaTile live proven on For You) |

For comparison: the Horses list page was one slice and took Codex a day with
review. Slice 1 here is about that size. Slices 3 and 4 are each bigger than
the whole list page.
