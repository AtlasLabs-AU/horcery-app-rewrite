# Parity sweep (agent output, verbatim) — 2026-08-18

## Feature-parity audit — Alerts, More, preferences/account/billing (old → rewrite)

Read first: requirements §2/§4e/§6/§6b, `docs/scope/Horcery_Alerts_Architecture.md`, `docs/handovers/Alerts_Implementation_Plan_for_Codex.md` (A0–A3 built; **A4 writes and A5 delivery = SCOPED-NOT-BUILT**), `docs/dev-tickets/Horcery_Manage_Alerts_Review.md`, `docs/README.md`. Old app paths are relative to `84-horcery-app-react-native/`, rewrite paths to `horcery-app-rewrite/`.

### A. Alerts — rules (manage / create / edit)

| Capability | Old app (file) | Status | Rewrite (file) / evidence | Notes / risk |
|---|---|---|---|---|
| Manage Alerts list, newest first, infinite pages | `packages/app/src/screens/manage-alerts/index.tsx:133` | BUILT | `src/app/alerts/index.tsx:167`, `src/hooks/alerts/use-alert-rules.ts` | 2 requests vs old 3 |
| Row: icon + type name + plain-English summary | `manage-alerts/index.tsx:467` (`ruleSummary`) | BUILT | `src/domain/alerts/summary.ts`, `src/components/alerts/alert-rule-row.tsx` | Golden-tested |
| Row: apply / notify scope tags ("All Horses", "All except 2", "Me") | `manage-alerts/index.tsx:373,401` | BUILT | `src/domain/alerts/scope.ts:94,106` | Old said "Animals", rewrite "Horses" (deliberate) |
| Row a11y label = summary; single pressable | old bug: `accessibilityLabel='Alert item'` `:500` | BUILT (fixed) | `alert-rule-row.tsx:31-47` | MA-4 closed |
| Row tap → edit | `manage-alerts/index.tsx:306` (rule JSON in URL) | BUILT (id in route) | `index.tsx:181`, `src/hooks/alerts/use-alert-rule.ts` | MA-5 closed |
| Add ("Add New" / "+") | `manage-alerts/index.tsx:547` | BUILT (UI) | `index.tsx:152` header `+`, `alerts/new.tsx` | Save itself is A4 |
| Empty state + "Add Custom Alert" | `manage-alerts/index.tsx:580` | BUILT | `index.tsx:185-213` | |
| Loading / error+retry | `:565,569` | BUILT + offline + sample modes | `index.tsx:186-192` | Better than old |
| Pull-to-refresh | `:658` | BUILT (own refreshing flag) | `use-alert-rules.ts:41` | `refresh()` does **not** refetch types |
| Notification-permission banner on Manage Alerts | `manage-alerts/index.tsx:562` (InfoBox, no Enable button) | SCOPED-NOT-BUILT (A5) | absent; architecture §1 "until it lands the banner is omitted, not faked" | Customer cannot see alerts are undeliverable |
| Chat-notification dev toggle | `manage-alerts/index.tsx:517-535` | INTENTIONALLY REMOVED | architecture §1 "Out" | |
| Suggested alerts (query, carousel, add flow) | `:152-304`, `widgets/suggested-alerts` | INTENTIONALLY REMOVED | services kept, nothing calls them (`src/services/query/alert-management/suggested-alert.ts`) | Inakshi 2026-08-17 |
| `select-suggested-alert` route | `apps/expo/src/app/create-alert/select-suggested-alert.tsx` (dead) | INTENTIONALLY REMOVED | no route | |
| Step 1: choose type, grouped by category | `screens/create-alert/index.tsx:129-176` (grid, select-then-Next, "1 of 3/2" bug) | BUILT (one tap, list) | `src/app/alerts/new.tsx` | Step indicator deliberately gone (MA-7) |
| Alert-type icons per slug | `config/constants/alert-icons.ts` | BUILT | `src/domain/alerts/descriptors/registry.ts` | |
| Unknown/new server alert type still usable | old: slug `if`s, breaks | BUILT | `descriptors/index.ts` GENERIC + `alert-details-card.tsx:237` | But list drops it — see BUG 1 |
| Configure: live insight card (summary + tags) | `configure-alert/index.tsx` (2,409 lines) | BUILT | `src/components/alerts/insight-card.tsx` | |
| Condition/comparator per type | `alert-form-config.ts` | BUILT | `alert-details-card.tsx:59` | |
| Sensitivity presets + Custom threshold | old `sensitivityScaleEntries` | PARTIAL | `alert-details-card.tsx:78-115` | **Imperial preset bug — BUG 2** |
| Duration scale / "for at least" | old `getDurationScaleEntries` | BUILT | `alert-details-card.tsx:150-196` | |
| "Within any" (query_range_duration) | `configure-alert:1086` | BUILT | `alert-details-card.tsx:216` | |
| "Based on" continuous/total (query_type) | `configure-alert:1107` | BUILT | `alert-details-card.tsx:199` | |
| Temp-change rise/drop as threshold sign | `alert-form-utils.ts` | BUILT | `src/domain/alerts/payload.ts:227-234` | |
| Metric/imperial storage + `display_value` | `alert-form-utils.ts` | BUILT (domain) | `payload.ts:106-116, 218-238` | Domain correct; UI presets are not (BUG 2) |
| Notify window Any time / custom from–to | `configure-alert` + `date-utils.toUTC_HMS` (device zone — MA-1) | BUILT + **fixed** | `src/domain/alerts/window.ts`, `src/components/alerts/window-card.tsx` | Barn zone, drift badge, fallback note |
| Overnight window (21:00→06:00) | old allowed | BUILT | `window.ts:168-175` | |
| Per-type min window / distinct times | `ALERT_FORM_NOTIFY_WINDOW_RULES` | BUILT | `registry.ts` + `validate.ts:70-85` | |
| Threshold range bounds validation | old zod schema | MISSING | `validate.ts` never reads `descriptor.threshold.range` | 500 °F accepted; arch §4.1 |
| Apply-to picker: All · Selected · Excluded, horses/stalls | `widgets/targets-picker-widget` | BUILT | `src/app/alerts/targets.tsx` | + native header search (fixes MA-8) |
| Send-alert-to picker (members) | same widget, `type='members'` | BUILT | `targets.tsx` (`kind=members`) | |
| Apply target = stalls **or** horses per rule | derived from `source` param, `configure-alert:1287-1301` | PARTIAL | rewrite always `'stalls'` for new rules; `{type:'target'}` action exists but **nothing dispatches it** (`use-alert-rule-form.ts:38`) | Cannot author a horse-scoped alert in the rewrite |
| Create alert pre-scoped to a horse/stall (from detail page) | `configure-alert:1228-1240` | MISSING | no `source`/`animalId` plumbing anywhere in `src/app/alerts/*` | |
| Confirm-on-edit sheet showing new summary | `confirm-save-alert-widget`, `configure-alert:2148` | PARTIAL | `configure.tsx:197` native `Alert.alert` whose only action is "Preview" | Plan §5.4 asked for a reusable `confirm-sheet.tsx`; none exists in `src/components/ui/` |
| Save (POST/PATCH) + success toast + return to list | `configure-alert:1667` | SCOPED-NOT-BUILT (A4) | `configure.tsx:41-43,182` — dev payload preview only | |
| Delete + confirm sheet + permission gate | `configure-alert:1767`, `confirm-delete-alert-widget` | SCOPED-NOT-BUILT (A4) | `configure.tsx:296-303` dimmed text w/ reason | Delete is plain `Text`, not a control |
| Permission gating of create/save | **absent in old (MA-2)** | BUILT (improved) | `src/domain/alerts/permissions.ts`, `alerts/_layout.tsx`, `alerts-permissions.tsx` | |
| PATCH: drop include-with-zero-ids | old behaviour | BUILT | `payload.ts:301-311` | |
| `is_push`/`is_sms`/`is_email` fields | old always push-only | BUILT | `payload.ts:291-293`; `pushOff` surfaced on rows | |
| `is_call` / critical alerts | not present in old (`services/.../alert-rule.ts` has no `is_call`) | N/A | n/a | Nothing to port |
| Snooze / mute a rule | not present in old | N/A | n/a | |
| Alert frequency chart (horse/stall Alerts tab) | `widgets/alert-frequency-chart` | INTENTIONALLY REMOVED | architecture §1 (renderer decision §6a) | |
| Alert **events** list on horse/stall Alerts tab | `widgets/alert-list-widget` | BUILT (elsewhere) | `src/app/(tabs)/horses/[id].tsx:152` via Review History | Stall details not built at all |
| Entry: More → Manage Alerts | `more-tabs-widget/index.tsx:148` | BUILT | `src/app/(tabs)/more.tsx:26` | |
| Entry: horse/stall Alerts tab → Manage Alerts row | `widgets/alerts-widget/index.tsx:49` | MISSING | `horses/[id].tsx:487-500` renders a dimmed "Coming soon" row | Plan §4.2 said to wire this in A2 — not done |
| Entry: For You alert card → Manage Alerts | `for-you-alerts/.../alert-notification-card.tsx:39` | MISSING | no `/alerts` push in For You | |
| Entry: org details "Manage" / "Alerts Being Monitored" | `organization-details-widget:297`, `alerts-monitored-widget:162` | MISSING | `src/hooks/use-alert-status.ts` counts only | |
| Entry: tablet nav | `widgets/tablet-navigation` | MISSING | no tablet nav | |
| Two conflicting feature flags (`ALERTS_ORG_IDS` vs `MANAGE_ALERTS_ORG_IDS`, MA-6) | old | MISSING gating (route ungated in rewrite too) | no flag check in `alerts/_layout.tsx` | Requirements §4e: gating "comes with the real screens" |

### B. Push-notification delivery (all of this = A5, SCOPED-NOT-BUILT)

| Capability | Old app | Status | Evidence |
|---|---|---|---|
| FCM token registration at splash + after login | `packages/config/src/firebase-messaging/index.ts:8`, `screens/splash-screen:76`, `utils/auth-utils.ts:37` | SCOPED-NOT-BUILT | rewrite `package.json` has no `@react-native-firebase/messaging`, no `expo-notifications` |
| Token delete on logout | `auth-utils.ts:59` | SCOPED-NOT-BUILT | `src/app/menu.tsx:88` logout does not touch tokens |
| Token-refresh listener | `hooks/use-notifications.ts:49` | SCOPED-NOT-BUILT | — |
| Foreground receipt → local notification | `use-notifications.ts:20-34` | SCOPED-NOT-BUILT | — |
| OS notification permission request/status/re-check on foreground | `preferences-permissions-widget:48`, `manage-alerts:81` | SCOPED-NOT-BUILT | no permission code in rewrite |
| Test-notification sheet | `notification-widget/index.tsx:122` | MISSING | service exists (`src/services/query/notification-management/test-notification.ts`), no UI |
| Tap → deep link to the right screen | **not implemented in old** (no `onNotificationOpenedApp`/`getInitialNotification`) | N/A (new work, A5) | grep found none in old app |
| Badge count | old sets `shouldSetBadge: false` | N/A | |
| Background message handler | not in old | N/A | |
| Navbar bell → notifications screen | `navigation-bar:79` logs `debug('Navigate to notification screen')` — dead in old | INTENTIONALLY REMOVED / dead | |

### C. More tab, preferences, account, billing, legal

| Capability | Old app | Status | Rewrite | Notes |
|---|---|---|---|---|
| More: Spaces / Clips / Devices rows | `more-tabs-widget` | MISSING (dimmed) | `(tabs)/more.tsx:45-62` no `onPress` | Honest disabled-with-reason |
| More: Manage Alerts row | `more-tabs-widget:148` | BUILT | `more.tsx:68` | |
| More: Feeding Plans, Sandbox | `more-tabs-widget:165,188` | INTENTIONALLY REMOVED | requirements §4e "More page" | |
| More: feedback card + "Give Feedback" → form URL | `feedback-card/index.tsx:26` (`openBrowserAsync(FEEDBACK_FORM_URL)`) | PARTIAL — **dead control** | `more.tsx:81-94` button has role/label but **no `onPress`** | Violates §6b item 3 |
| Feedback card dismiss (X) + zustand store | `feedback-card:41` (hidden in old) | PARTIAL | `src/stores/feedback-states/index.ts` ported, unused | |
| Feedback survey screen | `screens/feedback-survey`, `/general/feedback` | MISSING | no route | |
| Preferences: Units metric/imperial (writes `UserMetaData`) | `unit-preferences-widget` | MISSING | no preferences route; `proto-preferences.tsx` is a prototype with local state only (`:22-31`) | Units are *read* app-wide (`index.tsx:43`) but cannot be changed |
| Preferences: Allow Notifications master + 5 category toggles (environmental/behavioral/security/AI/other), debounced PATCH | `notification-widget`, `notification-preferences-widget` | MISSING | — | |
| Preferences: Test notification row | `notification-widget:119` | MISSING | — | |
| Preferences: OS permissions card (notifications/camera/photos/location/bluetooth) + re-check on foreground | `preferences-permissions-widget` | MISSING | — | |
| Theme / dark mode setting | not in old (system only) | PROTOTYPE only | `proto-preferences.tsx:113` toggle does nothing (labelled "Prototype only") | Rewrite follows system: `use-color-scheme.ts` |
| Theme persistence | n/a in old | N/A | | |
| Language / localization switch | not in old (no i18next) | MISSING both | requirements §4b/§6b item 7 outstanding | |
| My Account screen | `screens/my-account` | MISSING | menu row `menu.tsx:154` unwired | |
| Personal Details | `/personal-details`, `profile-details-widget` | MISSING | — | |
| Profile image upload | `widgets/image-upload` | MISSING | — | |
| Delete account (type "DELETE" confirm → `accountDeletionRequestService` → logout) | `my-account:124`, `delete-account-widget` | MISSING (service ported) | `src/services/api/user-management/account-deletion-request.ts` unused | |
| Change password / change email | not present in old (Firebase reset flow only) | N/A | | |
| Contact Support (mailto `support@horcery.com`) / phone support | `utils/support-helper.ts` | MISSING | menu "Support" row unwired (`menu.tsx:176`) | |
| About Us: App Version + build number | `about-us-list-widget:35` | MISSING | no version shown anywhere | |
| About Us: 6-tap version → SMD debug sheet | `about-us-list-widget:44-90` | MISSING | | Dev/field-support tool |
| About Us: Terms of Service / Privacy Policy links | `about-us-list-widget:129,136` | MISSING | | Store-compliance risk |
| About Us: Open Source Libraries | `about-us-list-widget:143` | MISSING | | |
| About Us: Feedback URL | `about-us-list-widget:121` | MISSING | | |
| App Updates / force-update screen (Remote Config `MIN_RN_APP_VERSION`) | `screens/app-updates`, `use-check-app-updates.ts` | MISSING | no `/app-updates` route; Remote Config dep present | Users can't be forced off a broken build |
| Rate app / in-app review / share app | **not present in old** | N/A | | Nothing to port |
| Billings & Transactions (occupancy/revenue stats — hardcoded — + monthly earnings chart + rental table) | `screens/billings-transaction/index.tsx:12-33` | MISSING | no route | Rental/earnings, **not** subscriptions |
| Stripe / RevenueCat / IAP / paywall / entitlement gating | **none exist in old app** (grep: 0 hits) | N/A | | No purchase surface to port |
| Log Out (confirm + real sign-out + cache clear) | `sidebar:179`, `auth-utils.handleLogout` | BUILT | `menu.tsx:81-100` | Rewrite also clears query cache; old also deletes FCM token (missing) |
| Organization switching | `widgets/organization-list` | BUILT | `menu.tsx:64-79` | Uses `organization.list` (single page) — large-account truncation risk; no loading/empty/error state |
| Organization creation | `/create-organization`, `create-org-widget` | MISSING | — | |
| Manage Organization (external web) | `sidebar:144` | MISSING | `menu.tsx:155` unwired | |
| Invite members / member management | web-only in old (external "Manage Organization") | N/A | | Members are only *read* (targets picker) |
| Devices | `sidebar:150` | MISSING | `menu.tsx:156` unwired | |
| About Us screen entry | `sidebar:161` | MISSING | `menu.tsx:175` unwired | |

---

## Bugs / suspicious code in the rewrite (alerts area)

1. **Rules of an unknown/deleted type vanish silently, and the screen then claims "No alerts yet."** `src/domain/alerts/view.ts:46` returns `null` when `descriptorsById` has no entry for the rule's `alert_type`; `src/app/alerts/index.tsx:65-80` filters those out. If the types request returns a reduced set (or a type is soft-deleted), the customer sees an empty, cheerful empty-state instead of their rules. Directly contradicts the honest-states rule.
2. **Imperial users see and save wrong thresholds.** Presets come from the server's `sensitivity_scale` in *storage* units (°C) — `src/domain/alerts/descriptors/index.ts:104-110` — but `src/components/alerts/alert-details-card.tsx:82` labels them with the *display* unit (`°F`) and dispatches the raw value into `form.thresholdValue`, which `src/domain/alerts/payload.ts:221-223` then treats as °F and converts F→C again. A "20" preset shown as "20 °F" is stored as −6.7 °C. Round-trip through `toForm` (`payload.ts:113`) makes it look different again on reopen.
3. **Threshold range is never validated.** `src/domain/alerts/validate.ts` never reads `descriptor.threshold.range`, and its signature dropped the `units` argument the plan specified (`Alerts_Implementation_Plan_for_Codex.md` §3.1 `validate(form, descriptor, units)` vs `validate.ts:21`). Any magnitude passes.
4. **Editing a rule whose type is unknown shows the wrong error.** `src/app/alerts/configure.tsx:82-88`: `!descriptor || (ruleId && !rule)` renders "Alert not found. It may have been removed." even when the rule loaded fine and only the descriptor is missing. Architecture §6.4 says unknown type → generic form + note.
5. **Deep link to `/alerts/configure?ruleId=…` before an organization is selected shows "Alert not found."** `src/hooks/alerts/use-alert-rule.ts:37` disables the query when `!organizationID`; a disabled RQ v5 query reports `isLoading === false`, so `configure.tsx:64` falls through loading into the missing state instead of waiting.
6. **`useAlertRule` cache read is not reactive.** `use-alert-rule.ts:18-30` calls `queryClient.getQueriesData` inside a `useMemo` keyed on `[queryClient, id]` — stable identity, so the list arriving (or being invalidated/refetched) after mount never updates `cached`. Once A4 lands, an edit will be computed from a stale rule.
7. **Edit-confirm dialog has no confirm.** `configure.tsx:193-204`: the "Save changes?" alert offers only *Cancel* and *Preview*, and in a non-dev build `saveReason` is always set so `onSave` returns early at `:194` — the whole dialog is unreachable in production. The plan's reusable `confirm-sheet.tsx` (§5.4) does not exist in `src/components/ui/`.
8. **"Remove alert" is a bare `Text`, not a disabled control.** `configure.tsx:296-303` — no `accessibilityState={{disabled:true}}`, no button role; a screen-reader user hears a label "Remove alert (unavailable)" on static text. Also `deleteReason` (`:206`) tells an ADMIN "Removing alerts is coming with the write side" and an EDITOR "Only admins can remove alerts" — the second is right, but neither reflects that no user can delete today.
9. **Targets picker: `mode: 'all'` renders a blank sheet.** `src/app/alerts/targets.tsx:141` sets `data={[]}` and `:162` returns `null` for the empty component — no explanation of why the list is gone. Consequently the disabled-row branches (`:92, :100-101`) are dead code.
10. **Selection carries across mode flips.** `targets.tsx:52-53,76`: switching Selected → Excluded reuses the same `selected` set, so "these 3 horses" silently becomes "all except these 3" with no confirmation. Also `initialIds` are only read at mount, so params and state can diverge if the sheet is re-pushed.
11. **Targets result delivered without a caller leaks forever.** `src/hooks/alerts/targets-selection-store.ts:30` writes into a module `Map` that is only cleared by `takeTargetsResult`; if Configure unmounts while the sheet is open (deep link, back-swipe), the entry is never read or evicted. `newRequestId` (`:61-64`) is a monotonic module counter — after a Fast Refresh it restarts at 1 and can collide with a stale entry (`apply-1`).
12. **Read-only user reaching `/alerts/new` by deep link is not redirected.** `alerts/new.tsx:42-45` shows a read-only state instead — acceptable, but the architecture §6.1/plan §5.2 says the *layout* gate redirects; `alerts/_layout.tsx` contains no gate at all beyond providing context, so the plan and code disagree.
13. **No unsaved-changes guard.** `configure.tsx` has no `beforeRemove`/back-confirm; swiping back discards a fully-edited rule silently. (Harmless while writes are off; a bug the moment A4 lands.)
14. **`saveReason` shows an arbitrary error.** `configure.tsx:184` `Object.values(errors)[0]` depends on the insertion order of the `FieldErrors` object, so the message under Save may name a field the user cannot see (e.g. the scope error while the threshold is also blank).
15. **Duration 0 / blank custom values.** `validate.ts:46` rejects `durationMinutes <= 0` only for `kind === 'duration'`; for an *optional* trigger (`:54-58`) a `0` is valid and `payload.ts:237/254/262` writes `trigger_duration: "00:00:00"`, while `summary.ts:75` (`form.durationMinutes ?` truthiness) drops it from the sentence — the sentence and the payload disagree. Same truthiness issue in `withinAny` (`summary.ts:71`).
16. **`window start === end` is only blocked when `requireDistinct`.** `validate.ts:76-83` — for any future descriptor with `minMinutes: 0` an equal pair yields a 0-minute window that never fires. All nine current types set `requireDistinct: true`, so it is latent.
17. **`toStorage` silently converts an incomplete custom window into "any time".** `src/domain/alerts/window.ts:105-106` falls back to 00:00/23:59 when `start`/`end` are missing, rather than refusing. Only validation stands between a half-filled window and a whole-day rule.
18. **DST spring-forward gap untested.** `window.ts:83-87` does `on.setZone(zone).set({hour, minute})`; a barn-local time that does not exist on the DST transition day (e.g. 02:30 in New York) is quietly shifted by Luxon. Tests cover summer/winter instants, not the transition day itself.
19. **Drift false-positive on old-app rules is avoided, but drift ignores the *edited* window.** `configure.tsx:143-146` computes drift from the stored metadata only; after a user changes the window in the form, the red "Re-saving fixes it" banner still shows against the *old* stored values.
20. **`is_custom` is set true whenever the number field is touched.** `use-alert-rule-form.ts:47-48` — for a type with no preset scale (generic/`number`), every rule is written with `is_custom: true`, which is not what the shipping app means by the flag.
21. **`.replace('  ', ' ')` fixes only the first double space.** `summary.ts:92,124` — with an `EQUAL_TO` condition (empty condition word) the generic branch can still emit "…is  0 …" further along the string.
22. **Retry/refresh coverage is incomplete.** `alerts/index.tsx:87` `retry()` omits `barn.refetch()`, and the pull-to-refresh at `:174` refreshes rules only — a failed organization (timezone) fetch cannot be recovered without leaving the screen. `use-alert-rules.ts:41-48` also `setState`s after an awaited refetch with no unmount guard.
23. **Sample mode can engage for a real, genuinely empty organization.** `alerts/index.tsx:53-54` — `PREVIEWS.sampleAlertsData` + zero rules replaces the honest empty state with fabricated rules; the banner says so, but it is one flag away from showing invented alerts to a customer.