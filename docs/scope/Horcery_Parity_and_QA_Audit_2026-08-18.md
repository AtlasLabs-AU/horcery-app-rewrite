# Horcery rewrite — full parity audit + QA pass (2026-08-18)

**Why this exists.** Before starting the next stages, Inakshi asked for a fresh
old-app-vs-rewrite parity check ("what did we miss?") and a bug/QA pass. This
is that. It compares the shipping app (`84-horcery-app-react-native`, read-only
reference) against the rewrite on branch `rnd` at `53080ec`, screen by screen,
and adds a hands-on device pass (iPhone 17 Pro Max, iOS 26.5, dev client, QA
account, org "Mobile Dev Testing" + "Org 150").

Ground rules used, from the requirements doc: **Record / manual logs and
Special Instructions are removed by decision**, **Show Me is retired**,
**role permissions on Horses are parked**, **charts renderer waits on the
spike**, **alerts A4 (writes) and A5 (delivery) are scoped but not built**.
None of those are counted as "missed".

Legend for status: **BUILT** · **PARTIAL** · **MISSING** (no decision anywhere
— needs one) · **REMOVED** (deliberate) · **SCOPED** (decided, not yet built).

---

## 0. The headline

The rewrite has **four screens built to a good standard** (Home shell, Horses
list, Horse Details, Alerts read/author) and **most of the rest of the product
not started**. Measured against "this ships to production without the dev
team", the list of whole areas with no code and — in several cases — no scope
document is:

| Area | Old app size (rough) | Rewrite | Scope doc? |
|---|---|---|---|
| **Stalls** tab, stall details, stall settings, assign/unassign/re-assign | ~2,500 lines | none (a design prototype only) | no |
| **Spaces** list / details / settings | ~1,000 | none | no |
| **Devices** list/detail + **BLE provisioning** (SMD + bucket meter, ~12 error screens, QR deep links) | ~9,000+ | none | no |
| **Clips** (list, detail, create/trim, edit, download, share/access/invitees) | ~2,500 | services only, no UI | no |
| **Push notification delivery** (token registration, permission, foreground receipt, tap → screen) | — | none | yes (A5) |
| **Account**: My Account, Personal Details, Preferences (units, notification categories, OS permissions), **Delete account** | ~1,500 | prototype settings rows only | no |
| **Sign-up**, email verification, **Create Organization** (no-org onboarding), invalid-org guard | ~800 | none | no |
| **About Us**: version, **Terms / Privacy**, open-source licences, feedback link, support link | ~300 | menu rows dimmed | no |
| **Forced-update wall** (Remote Config `MIN_RN_APP_VERSION`), OTA (`runtimeVersion`/EAS Update) | ~200 | none | no |
| **Crash reporting + analytics** (Sentry, PostHog) | — | env keys parsed, nothing wired | no |
| **Feedback** survey / "Give Feedback" | ~300 | dead button | no |
| **Billings & Transactions** (rental earnings — hard-coded in the old app) | ~600 | none | no |
| For You: **Customize widgets**, **weather row**, **inline recent-alert carousel**, **Review card data path**, snapshot **fullscreen**, tile → detail navigation | — | missing | For You notes cover some |
| **Localization** (§4b "born localized") | catalogues exist | not started; every string is an English literal | yes |
| **Tablet layouts** everywhere | every screen | none | — |

Store-submission blockers in that list, independent of feature completeness:
**Terms/Privacy links, in-app account deletion (App Store 5.1.1(v)), a real
splash/branding, orientation lock, push notifications for a monitoring app.**

Things that were *not* in the shipping app and therefore are not gaps: Stripe /
IAP / paywalls, `is_call` critical alerts, snooze, PiP/AirPlay, in-app review,
change password/email, notification tap deep-linking, sharing horses (dead in
old app), rentals dashboard (unreachable in old app).

---

## 1. Device QA pass — what I actually saw (2026-08-18)

Confirmed on the simulator unless marked *(code)*.

### Bugs

| # | Where | What | Sev | Owner |
|---|---|---|---|---|
| Q1 | Bottom-sheet menus (horse ⋮ on details, groups ⋮ on Horses list) | The sheet's own **✕ Close does nothing** — tapped it 4× across 2 sheets. Backdrop tap and swipe-down still dismiss. Cause: `src/components/ui/menu.tsx:128` is an RN `Pressable` inside a gorhom `BottomSheetView`; the sheet's gesture layer eats the tap. Affects **every** `Menu` sheet in the app. | High | Claude (ui surface) |
| Q2 | Home → Horcery AI card | **"Manage Alerts" chip is dead** even though `/alerts` exists — `organization-card.tsx` renders it, For You never passes `onManageAlerts`. | High | Claude |
| Q3 | Home header | **Magnifier does nothing** (Show Me retired). Should be removed, not left as a permanently dead control. | Med | Claude |
| Q4 | Horse Details → About card | **"Height 0.00 hands", "Weight 0.00 lbs"** — zero is rendered as a measurement; other blank fields say "Not recorded". | Med | Codex |
| Q5 | Horse Details → About card vs hero | **"Stall monitor: None assigned"** while the hero above it shows this stall's live camera and plays it. One of the two is wrong (probably the monitor lookup reads an unexpanded relation). | Med | Codex |
| Q6 | Horse Details → status strip | **"Unavailable — The stall monitor did not answer"** for a stall whose camera is live and whose org card shows 18 °C. Sensor query failure with no retry and no distinction between "no sensor" and "request failed". | Med | Codex |
| Q7 | Home → Behaviour Tracker | **"Daily" tab selected, chart shows Mon–Sun.** Sample data, but the toggle and the plot disagree. | Low (sample) | Claude |
| Q8 | Home → Snapshots | Copy says **"▶ 10x — Last 2 hours at a glance"** over a single JPEG from 5 minutes ago. Overstates. | Med | Claude |
| Q9 | Alerts (sample mode, Org 150) | Every sample rule shows **"Shifted 1 h since the clocks changed"** — including the *Any time* rules. A whole-day window cannot drift; sample metadata is Jan CST (−360) vs today's CDT (−300). Domain fix: `detectDrift` must return null for whole-day windows; sample data should also be neutral. | Med | Claude |
| Q10 | Alerts → Configure | **Back with unsaved edits discards silently** (no "Discard changes?"). Harmless until A4, a bug the day writes land. | Med (latent) | Claude |
| Q11 | Launch | **Splash is the Expo template** (solid `#208AEF` blue, generic chevron). Not brand. | Med (ship) | — |
| Q12 | Launch | **"Unlock with Face ID" unlocks on a plain tap**, no biometric prompt (no LocalAuthentication call; preview-only flag). Fine as a prototype; must not be mistaken for a lock. | Low (preview) | — |
| Q13 | Protos tab | A whole **prototype tab is in the tab bar**, reachable by customers on this branch, incl. `proto-stalls.tsx` streaming public `test-videos.co.uk` MP4s. Needs a build-time gate before any beta. | High (ship) | — |
| Q14 | More → "Give Feedback" | **Dead button** with `accessibilityRole="button"` and no `onPress`. Screen readers announce a button. Slips past `no-dead-controls` because that test only checks `MoreRow`. | Med | Codex |
| Q15 | Menu → switch org | Switching organization gives **no feedback** (no toast, no navigation reset). Stale detail screens from the previous org can remain on the stack. | Low | Codex |
| Q16 | Horse Details → Events/Alerts tabs | Wording **"10 days to Yesterday"** after stepping the date back. | Low | Codex |
| Q17 | Horses list | Card thumbnails **re-fetch (blurhash flash) when search is cleared**. Cosmetic. | Low | Codex |

### Passed

Sign-in session restore · Home renders real org (name, barn clock, alert count
"31 metrics") · Horses list, search (with proper "No horses match" state), group
chips filter, prefetch on tap · Horse Details hero still → tap → **live video
plays inline**, stops on day change · Summary/Events/Alerts tabs · Alerts list
(31 real rules, no drift on real data) · edit → sentence updates live · Custom
threshold blank → "Enter a value." and sentence shows "…" · targets sheet with
bottom native search, Selected with 0 → "Choose at least one stall." on both
the row and Save · every screen could be left · light + dark (earlier pass).

---

## 2. Bugs found by code review (not yet reproduced on device)

Ranked. "P" = plausible from reading, needs a repro before fixing.

### Would hurt a customer

| # | File | Finding |
|---|---|---|
| C1 | `src/hooks/use-session.ts:79-88` | **No zero-organization path.** A user with no orgs is dropped into the tabs with `organization === undefined`. Old app routes to Create Organization. Dead end for a new/uninvited user. |
| C2 | `src/config/auth/rest-auth.ts:195-201, 240` | **A transient network failure at launch deletes the refresh token** — a flaky cold start signs the customer out permanently. Can't tell "revoked" from "offline". |
| C3 | `src/hooks/use-session.ts:47` + `rest-auth.ts:126` | If the email claim can't be parsed from the ID token, `signedIn` is false forever → user query never runs → member role never loads → everyone is a viewer, no error shown. |
| C4 | `src/hooks/use-membership-sync.ts:41` | User removed from an org **keeps the previously cached role**. |
| C5 | `src/app/menu.tsx:82-101` | Logout: `queryClient.clear()` before an un-awaited `signOut()`; in-flight requests can repopulate the cache with the previous tenant's data. |
| C6 | `src/domain/alerts/view.ts:46` + `alerts/index.tsx:65-80` | **Rules of an unknown/deleted type vanish silently** and the screen then says "No alerts yet". |
| C7 | `alert-details-card.tsx:82` + `descriptors/index.ts:104-110` + `payload.ts:221` | **Imperial preset thresholds are wrong.** Server `sensitivity_scale` presets are in storage units (°C) but are labelled °F and then converted F→C again on save: a "20 °F" preset stores −6.7 °C. (Custom values round-trip correctly — that's what the A3 device pass exercised.) |
| C8 | `src/domain/alerts/validate.ts` | Threshold **range never validated** — 500 °F accepted. Plan §3.1 specified `validate(form, descriptor, units)`. |
| C9 | `src/hooks/use-snapshots.ts:41-47` | Snapshots use single-page `stall.list` (§6b finding 6 still open) and no "has a monitor" filter → large orgs lose stalls, unmonitored stalls appear as empty tiles. |
| C10 | `use-snapshots.ts` / `media-carousel.tsx:71` | **No loading / error / empty state for Snapshots** — all three render as a header over nothing. |
| C11 | `src/components/for-you/review-card.tsx` + `(tabs)/index.tsx:106` | For You **Review card has no data path at all** — always the empty state on a real org. |
| C12 | `review-history.tsx:218` / `event-card.tsx:78` | History cards draw a **play badge with no handler**, and no poster (`posterUri` never set) → grey wells with an inert play glyph. |
| C13 | `horses/[id].tsx:308` | Horse Events tab cards are **dead** (old app jumps to that timestamp; scope E2, slice 2). |
| C14 | `src/hooks/use-horse-detail.ts:20-23` | Detail hero "cache-buster" is a no-op (URL builder floors to 10 s); pull-to-refresh never fetches a new frame. List path does it right. |
| C15 | `horses/[id].tsx:193-198,312` | Detail pull-to-refresh spinner stops early (only `horse.isRefreshing` awaited). |
| C16 | `use-horse-status.ts:145` unread | Sensor query error → strip silently shows nothing (likely the cause of Q6). |
| C17 | `use-alert-rule.ts:37` + `configure.tsx:64` | Deep link to configure before an org is selected → "Alert not found" instead of loading. |
| C18 | `use-alert-rule.ts:18-30` | Cache read in `useMemo` is not reactive — an edit after A4 can be computed from a stale rule. |
| C19 | `targets.tsx:52-53,76` | Selection carries across **Selected → Excluded** flips: "these 3" silently becomes "all except these 3". |
| C20 | `use-alert-rule-form.ts:38` | `{type:'target'}` exists but nothing dispatches it → **cannot author a horse-scoped alert** (always stalls). No "create alert pre-scoped to this horse" entry either. |

### Resolution log

- **2026-08-20 — C8–C11 and C13 fixed.** Alert thresholds now validate the
  approved display-unit bounds; Snapshots uses complete pagination, monitored
  stalls only, and honest states; For You Review reads the real event query;
  Horse Events moves the shared play-head to the selected event and returns to
  Summary. Covered by focused tests and the full app gate.
- **C12 was already fixed before this slice.** Review History builds poster and
  video URLs, renders a play affordance only with a real handler, and falls
  back to a written unavailable state. Its existing characterization tests
  were rerun rather than replacing that working path.
| C21 | `configure.tsx:193-204` | Edit-confirm dialog offers Cancel/Preview only; in a non-dev build it is unreachable. |
| C22 | `auth-flow.tsx:285-292` | `USER_DISABLED`, `TOO_MANY_ATTEMPTS`, missing API key all render "check the connection". |
| C23 | `auth-flow.tsx:115` | `KeyboardAvoidingView` behaviour undefined on Android — inputs under the keyboard. |
| C24 | `menu.tsx:66-72` | Org list: no loading/error/empty state, no pagination (old: 50/page + load-more). |
| C25 | `app.json` | `orientation: "default"` (old locks portrait on phones); no `updates`/`runtimeVersion`; scheme is `horceryapprewrite` (old `horcerymobile`) and no associated domains → **existing links in emails won't open the app**; splash is template. |

### Correctness / hygiene

| # | File | Finding |
|---|---|---|
| H1 | `no-color-literals.test.ts:27` | Exemption for `(tabs)/index.tsx` says "no colour" but the file has `#00B8DB` and `#F0B100` (Water/Feed today colours). |
| H2 | `auth-flow.tsx:193`, `menu.tsx:303` | Hex literals `#4285F4`, `#000000`. |
| H3 | `use-alert-status.ts:88-102` | `useMemo` deps are fresh RQ objects — never memoises. |
| H4 | `review-history.tsx:72` | Pulls the whole For You data set (4 requests) just for the timezone; `use-organization-timezone.ts` is the seam. |
| H5 | `media-carousel.tsx:60-65` | Page only updates on momentum end; slow drag → wrong tile streams, dots lie. |
| H6 | `media-tile.tsx:125-133` | Player re-created on every `muted` change (and on `hasAudio` refetch). |
| H7 | `use-snapshots.ts:12-16` | Comment says 10 s slice, constant is 300 s; two rounding layers. |
| H8 | `use-for-you-data.ts:127-138` | Refresh doesn't invalidate `organization.list` — new org never appears until restart. |
| H9 | `prometheus-queries.ts:55-73` | `inStallCutOff` unreachable (band tested first); `ACTIVENESS_LEVELS` Med and Low both 0.01 → "Low" never returned. Ported faults; and now hard-coded where the old app read Remote Config (feeds §6a-i). |
| H10 | `horse-date-bar.tsx:49` / `use-playhead.ts:56` | Double-tap loses a step (both taps resolve to the same day). |
| H11 | `playhead-data.ts:96` | `canGoBack` permissive when `createdAt` unknown → pages into empty days on a cold deep link. |
| H12 | `horses/[id].tsx:398` | "end of day" label contradicts the play-head (which carries time of day). |
| H13 | `horses/index.tsx:76-81` | Sample-mode decision via `setTimeout(0)`. |
| H14 | `configure.tsx:296-303` | "Remove alert" is bare `Text` — no disabled role/state; reason text differs by role but neither says no one can delete today. |
| H15 | `configure.tsx:184` | Save reason = first key of `errors` — may name a field the user can't see. |
| H16 | `validate.ts:46-58` + `summary.ts:75` | Optional trigger `0` is valid → payload writes `00:00:00`, sentence omits it. |
| H17 | `window.ts:105-106` | `toStorage` turns an incomplete custom window into whole-day silently (only validation stands in front). |
| H18 | `window.ts:83-87` | DST spring-forward gap untested (non-existent barn-local time silently shifted). |
| H19 | `configure.tsx:143-146` | Drift banner computed from stored metadata only; still shows after the user edits the window. |
| H20 | `targets-selection-store.ts:30,61-64` | Result never evicted if Configure unmounts while sheet open; request-id counter restarts after Fast Refresh. |
| H21 | `summary.ts:92,124` | `.replace('  ',' ')` fixes only the first double space. |
| H22 | `alerts/index.tsx:87,174` | Retry/pull-to-refresh don't refetch the barn zone. |
| H23 | `alerts/index.tsx:53-54` | Sample mode engages for a real, genuinely empty org (one flag from showing invented alerts). |
| H24 | `_layout.tsx:19,69` | `SplashScreen.preventAutoHideAsync()/hideAsync()` unhandled rejections. |
| H25 | `_layout.tsx:80` | `AuthFlow`/`LockScreen` render outside `ToastHost` — sign-in can't toast. |
| H26 | `env/index.ts:96,102-116` | `SENTRY_DSN`, `POSTHOG_*` parsed and exported, consumed by nothing. Reads as wired. |
| H27 | `services/api/user-management/{account-deletion-request,resend-verify-email}.ts` | Services with no callers — "the API is there" ≠ "the feature is there". |
| H28 | `header.tsx:22` | Greeting is the literal "Hello Horcery" (old: "Hello ‹first name›"). |
| H29 | `review-history.tsx:246-254` | `DimmedChip` (Horse/Stall filters) has no reason and no disabled a11y state. |
| H30 | `event-card.tsx:98-100` | Renders `reporter`/`note` rows that are never populated — delete so §2 can't regress. |
| H31 | `menu.tsx:156` | Devices row dimmed with no reason. |

---

## 3. Parity ledger — condensed by area

Full per-capability tables from the four sweeps are in §5 (appendix). This
section is what matters for planning.

### 3.1 Auth / session / account
BUILT: landing, email+password sign-in (REST Identity Toolkit), password
visibility, forgot password + link-sent + 30 s resend, session restore, silent
refresh (better than old), 401 retry, force-logout listener, root error
boundary. PARTIAL: validation copy, sign-in error copy, keyboard handling
(Android), autofill hints, org switcher (no states/pagination/reset), logout
(no token deletion). MISSING (see §0): sign-up + verification, quick-login card,
create-org / no-org onboarding, invalid-org guard, My Account, Personal
Details, avatar, Preferences, delete account, permissions onboarding, push
registration, forced-update wall, OTA, no-internet screen, splash branding,
Sentry, PostHog, deep-link scheme continuity, portrait lock, tablet layouts,
Terms/Privacy/licences/version, focusManager on app-state. NEW: Face ID lock
(preview), 6-digit reset code (preview, backend not built).

### 3.2 Home / For You
BUILT: greeting shell, menu, org card (name, barn clock, alert status —
improved), Switch org, See History, deferred sections, working pull-to-refresh
(fixes old B1). PARTIAL: Manage Alerts chip (dead), Behaviour Tracker (shell),
intake cards (shell), snapshot tiles (still image, live on snap; **no
navigation, no fullscreen, no states**), Review card (**no data**). MISSING:
Customize widgets (saved prefs), weather temp/humidity (real users see none),
inline alert carousel, review-card filter + persistence, "N New" badge,
snapshot playback-mode preference, foreground refresh, timestamp overlay,
tablet columns. REMOVED: Show Me search (icon still there — Q3).

### 3.3 Review History
Largely BUILT and *fixed* (org-timezone days, no future days, alerts by
default, Lying Down id, Partial Rolling expansion, page size, refresh without
wipe). MISSING: Horse/Stall filter chips (dimmed, no reason), URL-param seeding
(14 old entry points), event stills (`posterUri`), tap-to-play, event-scoped
empty copy, offline screen, tablet 2-col, date-range/group-by-day (approved).

### 3.4 Horses list / Horse Details
Horses list is the most complete page: everything BUILT or deliberately
REMOVED/SCOPED per the parity-gaps doc. Horse Details: tabs, date bar,
play-head, status strip (ahead of old), overlays, passport (folded settings),
stall card, events feed, alerts list, live + recorded hero all BUILT. MISSING /
SCOPED but not in any built slice: **Devices card**, event card → timestamp,
Create Clip control (scope V6 says "must exist, dimmed"), "Adjust your monitor"
overlay, HD/SD, mute, fullscreen, all charts (spike), timeline (D2 full port),
export data, Alerts-tab Manage Alerts row wiring.

### 3.5 Stalls / Spaces / Devices / provisioning
Nothing built. See §0. Note the shipping Stalls detail actually has only
Summary + Alerts (Operations is commented out, History is a stub) — that
narrows the port. Rentals dashboards are unreachable in the shipping app —
not a gap.

### 3.6 Alerts
A0–A3 as planned, and ahead of the old app on permissions, barn-time windows,
honest states, one-tap type choice, generic-type tolerance, native header
search in the picker. Gaps beyond A4/A5: horse-scoped rules (C20),
pre-scoped create from a horse/stall, range validation (C8), imperial presets
(C7), unknown-type rows (C6), Manage Alerts entries from Home / horse tab /
org card, notification-permission banner (A5), Remote Config org gating
(`MANAGE_ALERTS_ORG_IDS`), confirm-sheet component (plan §5.4).

### 3.7 More / Preferences / About / Billing
More page BUILT to its confirmed design (Manage Alerts wired; Spaces/Clips/
Devices honestly dimmed). Everything behind the Menu rows (My Account, Manage
Organization, Devices, About Us, Support) is MISSING. Preferences MISSING
(prototype only; units can be read app-wide but not changed). Billings &
Transactions MISSING (rental earnings; hard-coded in old). No IAP/paywall
existed to port.

---

## 4. Decisions Inakshi needs to make (surfaced in chat too)

1. **Scope the unscoped areas or cut them explicitly**: Stalls, Spaces,
   Devices/provisioning, Clips, Account/Preferences, Sign-up/Create-org, About
   Us. Each needs either a scope doc + slice plan or a line in §6 of the
   requirements saying it's out. Right now they are silently missing.
2. **Review-card comments/notes thread** — is it part of the Record removal
   or a real feature to keep? (§2 removes "manually entered notes fields", not
   the comment thread.)
3. **Review-card detail screen** — unreachable in the old app too; resurrect
   or drop? (Scope §6 Q2, still open.)
4. **Weather on the org card** — keep (needs the weather service call) or
   drop?
5. **Production-readiness section** for the requirements (crash reporting,
   analytics, store listing, OTA, support/feedback, Terms/Privacy, account
   deletion, forced update, splash/icon, orientation) — still unanswered from
   the last session.
6. **Protos tab + previews** — agree the build-time gate that keeps them out
   of any customer build.
7. **Which of the confirmed device bugs (Q1–Q17) go first.** My recommendation:
   Q1 (every sheet's ✕), Q2 (Manage Alerts from Home), Q9 (drift on any-time),
   Q3, Q8 in the Claude-owned files this week; Q4–Q6, Q14 to Codex.

---

## 5. Appendix — full sweep tables

The four sweeps' full capability tables (auth/account; home/snapshots/review/
clips; horses/stalls/spaces/devices/sharing; alerts/more/settings) are
preserved verbatim in `docs/scope/appendix/parity-sweeps-2026-08-18/`.
