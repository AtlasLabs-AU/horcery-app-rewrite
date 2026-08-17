# Manage Alerts — review of the shipping app

**Date:** 2026-08-17 · **Reviewer:** Claude, for Inakshi · **Code:** `84-horcery-app-react-native`
**Files read:** `screens/manage-alerts/index.tsx` (701) · `screens/create-alert/index.tsx` (192, "Select Alert Type") · `screens/create-alert/configure-alert/index.tsx` (2,409) · `widgets/create-alert/{alert-details,alert-form-field-renderer,notify}.tsx` · `widgets/targets-picker-widget` (433) · `widgets/suggested-alerts` · `config/utils/alert-form-utils.ts` (2,376) · `alert-form-config.ts` · `schema-definitions.ts` (the zod schema) · `date-utils.ts` (`toUTC_HMS`, `fmtTime`) · the confirm-save / confirm-delete sheets · every route that links to `/manage-alerts`.

**Rating: 5 / 10.** Functionally rich and clearly the product of real iteration — the sensitivity presets, the live plain-English summary, the "apply to / send to" model with include/exclude are genuinely good ideas. But it carries a **timezone defect that can silently make a customer's alert window wrong**, a **permission hole on the create path**, a **dead data fetch that slows every open**, an accessibility regression that makes every row read as "Alert item", and a 2,400-line configure screen that nobody can safely change. It works; it is not sound.

---

## 1. What the feature is

A three-screen flow behind the "Manage Alerts" entry (More menu, horse/stall Alerts tab, For You cards, org details, tablet nav):

| Screen | Job |
|---|---|
| **Manage Alerts** | List of the org's active alert *rules*, newest first. Each row: type icon, type name, a generated summary sentence ("Lying down for more than 2 hours…"), and two tags — *who it applies to* ("All Horses" / "3 Stalls" / "All except 2") and *who it notifies* ("Everyone" / "Me" / "4 People"). Tap → edit. "Add New" → step 1. Empty state → "Add Custom Alert". |
| **Select Alert Type** (step 1 of 2) | Grid of alert types grouped General / Behavioural / Environmental (temperature, temp change, light, entering/exiting stall, lying-down count/time, rolling count, people-in-stall time…). Pick one → Next. |
| **Configure Alert** (step 2 of 2, also Edit) | Insight card with the live summary + tags · **Alert Details** (condition, sensitivity presets *or* custom threshold + unit, time value / duration scale, "within any" range, "based on" query type — all varying by alert type) · **Notify** (any time / custom from–to window) · **Apply To** → picker sheet (All / Selected / Excluded over horses or stalls) · **Send Alert To** → same picker over members · Complete/Save (edit path confirms in a sheet) · Delete (edit only, confirm sheet, permission-gated). |

Data: rules `infiniteList` (with application + notification relations included), alert types `listComplete`, suggested alerts `infiniteList` (see 3.3), and in the picker `listComplete` over members / animals / stalls.

---

## 2. What is good — keep these ideas in the rewrite

- **The rule summary sentence.** `ruleSummary()` turns a rule into plain English and it is shown *live* while editing. This is the single best UX idea on the page.
- **Sensitivity presets** ("Low / Medium / High" mapped to thresholds per alert type, per unit system) with a **Custom** escape hatch. Right abstraction for a barn manager.
- **Apply-to / Send-to as All · Selected · Excluded.** Compact, expressive, and the tags on the list row make the scope legible at a glance.
- **Confirm-before-save on edit** with the summary and tags shown in the sheet — the customer sees what they are about to change.
- **Metric/imperial handled at storage** (`display_value` kept separately) so a rule authored in °F round-trips.
- **`listComplete` in the picker** — it follows every page, so a 200-horse org is not silently truncated (unlike the Horses group list).
- **Notification-permission awareness** — the page checks OS notification permission on focus and warns if alerts cannot be delivered.

---

## 3. Defects, ranked

### 3.1 — HIGH · The alert time window is stored as device-local converted to fixed UTC, not the barn's time

`saveAlert` builds `startTime`/`endTime` from `new Date().setHours(…)` (device local), then `toUTC_HMS()` stores **`HH:MM:SS` in UTC with no date and no zone**. `fmtTime()` and the edit path convert back using the *device's* current offset.

Consequences:
- **DST.** A "9 pm – 6 am" window set in July is stored as a fixed UTC time. In November the barn's clock shifts and the window silently becomes 8 pm – 5 am (or 10–7). Nothing in the app tells the customer.
- **Device ≠ barn.** A manager who sets the window while travelling, or a Colombo-based admin (us) configuring a US barn, stores a window that is wrong for the barn by the difference in offsets — and it *looks* right on their own phone.
- **"Any time"** stores 00:00:00–23:59:59 *device-local* as UTC, so on a device far from UTC the "all day" window is not all day in the barn.

This is the same class of bug the Review History rebuild designed out with an organization-anchored clock. **The correct model:** store the window as local barn time + the org's IANA zone (or let the backend own the zone), never as bare UTC HMS. Needs a backend conversation because it changes what the field means.

### 3.2 — HIGH · No permission check on create or save

`handleDelete` wraps in `executeWithPermission(Permission.DELETE, …)`. **`openAdd`, `handleComplete` and `saveAlert` have no permission check at all.** The Manage Alerts *row* on the horse Alerts tab is EDIT-gated, but the page is reachable from five other places (More menu, For You alert cards, org details, tablet nav, `router.dismissTo`) — several of which gate only on the org flag, not on role. A VIEWER/GUEST who reaches the page can author a rule; whether it sticks depends entirely on the backend saying no, and the app will show "Failed to save alert" rather than "you can't do this".

### 3.3 — MEDIUM · Suggested alerts are fetched on every open and can never render

`showSuggestedInList = alertRules.length === 0 && suggestedAlerts.length > 0` is only used inside the branch that renders **when `alertRules.length > 0`** — so it is always false there. The other place it could show (the empty state) is **commented out**. Result: a paginated `suggestedAlert.infiniteList` request runs on every open, is folded into `isLoading` (so the skeleton stays up until it returns), and its data is never shown. `handleAddSuggestedAlert` and its notification-permission prompt are therefore dead too. Either restore the empty-state suggestions or delete the query.

### 3.4 — MEDIUM · Every list row is announced as "Alert item" to VoiceOver/TalkBack

`NavigableListItem` is given `accessibilityLabel='Alert item'`, which *overrides* the visible title and summary. A screen-reader user hears "Alert item, button" for every row. The chevron is a second nested touchable with its own "Edit alert" label — two buttons per row for one action. The empty state wraps its text in `accessible={true}` containers with redundant labels. The stat header does the same.

### 3.5 — MEDIUM · The whole rule is shipped to the edit screen inside the URL

`openEdit` does `encodeURIComponent(JSON.stringify(rule))` — the full rule *with nested application and notification relation arrays* — into a route param. It works, but: it is stale the moment the rule changes elsewhere; it makes deep-linking to an edit impossible (you need the blob, not an id); very large orgs (a rule applied to 150 named horses) push kilobytes through the router; and it forces the `useLayoutEffect` re-sync dance. Pass the id, read from the query cache, fetch if missing — the pattern the rewrite already uses for horses.

### 3.6 — MEDIUM · Two different flags gate the same page

More menu uses `useAlertsAndChartsFlags` (`ALERTS_ORG_IDS`); the horse Alerts tab uses `MANAGE_ALERTS_ORG_IDS`. An org can be in one and not the other and see the entry in one place but not another. The route itself is gated by neither.

### 3.7 — LOW · Wrong step count while loading

Step 1 shows "1 of **3**" while alert types load and "1 of **2**" once loaded. There is no step 3 (the `select-suggested-alert` route exists but nothing links to it — 199 lines of dead screen).

### 3.8 — LOW · Stale closure on `openEdit`

`useCallback` deps are `[router]` but the body reads `chatNotification`. Harmless today (dev-only switch) — it is the kind of thing `exhaustive-deps` exists for, and this codebase does not fail the build on it.

### 3.9 — LOW · Three indigos

`#615FFF`, `#6266F0`, `#6366f1` hard-coded across the three screens. Cosmetic; also a symptom of no tokens.

### 3.10 — LOW · The picker has no search

`targets-picker-widget` loads every horse/stall/member (correctly, all pages) into a scrolling list with no filter. For a 20-horse barn fine; for a 150-horse operation, choosing "these six" is a scroll.

---

## 4. Maintainability

`configure-alert/index.tsx` is **2,409 lines in one component**: ~40 `useMemo`s, a zod schema rebuilt in a `useMemo` and injected via `setResolver` in an effect, `selectedAlertType: any`, `payload: any`, and per-alert-type special-casing by string slug (`temp-change`, `people-in-stall-time`, `lying-down-time`, and the `alert-form-config` table for seven more). `alert-form-utils.ts` is another 2,376 lines. There are no tests on any of it. Adding an alert type means touching four files by hand and hoping. This is the part of the app I would least want to change under time pressure — and alerts is exactly where the team spent Apr–Jul.

---

## 5. UX assessment (as a customer would meet it)

| | |
|---|---|
| **Good** | The summary sentence; the sensitivity presets; the two tags on each row; the confirm sheet on edit; the "notifications are off" warning. |
| **Friction** | Two-step flow (pick type → configure) is fine, but there is no way back to change the type from step 2 without cancelling. The Configure screen is long — insight card, details card, notify card, two pickers — with the primary action pinned at the bottom under a keyboard toolbar. The picker's All / Selected / Excluded segmented control is not self-explanatory ("Excluded" of what?). Empty state is a single sentence and a button; no explanation of what an alert *does*. |
| **Trust** | The time-window issue (3.1) is the one that will make a customer say "it didn't alert me when it should have" — and support will find no bug, because on the customer's own phone the window looks right. |

---

## 6. Rating, and what it means for the rewrite

**5 / 10.** Above average for this codebase on product thinking, below average on correctness discipline. It would score 7 with 3.1–3.4 fixed and the configure screen split; it cannot score higher until the type-specific logic is data-driven and tested.

**For the rewrite**, this page is *worth doing well* — alerts are the reason people pay for a stall monitor. Carry over the ideas in §2 verbatim; do not carry over the code. Specifically:

1. **Store the alert window in barn time**, anchored to the org's zone (backend conversation first — it changes what `evaluation_start_time` means).
2. **Permission-gate create/edit/save**, not just delete, and gate the *route*, not the entry rows.
3. **Rule id in the route, rule from the cache** — the horses pattern.
4. **One alert-type descriptor table** (fields, units, presets, summary template) driving the form, instead of slug `if`s scattered across 4,800 lines; a test per alert type asserting the summary sentence and the stored payload for a known input.
5. **Real accessibility labels** — the row's label is its summary.
6. **Decide suggested alerts** — a product question: is "suggested alerts" a feature or an abandoned experiment? The code cannot tell us; today it costs a request per open and shows nothing.

---

## 7. Tickets for the dev team (shipping app)

| # | Title | Sev |
|---|---|---|
| MA-1 | Alert evaluation window stored as device-local→UTC HMS; wrong across DST and when device zone ≠ barn zone | High |
| MA-2 | No permission check on alert create/save; only delete is gated | High |
| MA-3 | Suggested-alerts query runs on every Manage Alerts open, delays loading, and can never render (`showSuggestedInList` unreachable) | Medium |
| MA-4 | Every alert row announced as "Alert item" to screen readers; nested double button | Medium |
| MA-5 | Full rule JSON passed via route param to edit; pass id, read cache | Medium |
| MA-6 | `ALERTS_ORG_IDS` vs `MANAGE_ALERTS_ORG_IDS` gate the same page inconsistently; route ungated | Medium |
| MA-7 | Step indicator says 1 of 3 while loading, 1 of 2 after; dead `select-suggested-alert` route | Low |
| MA-8 | Targets picker has no search | Low |
