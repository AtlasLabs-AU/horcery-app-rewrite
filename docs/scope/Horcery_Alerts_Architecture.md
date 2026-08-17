# Alerts — frontend architecture for the rewrite

**Date:** 2026-08-17 · **Author:** Claude, for Inakshi · **Status:** DRAFT v2 — architecture only, nothing built. **v2 = self-reviewed 2026-08-17; see §14 for what changed and why.**
**Input:** `Horcery_Manage_Alerts_Review.md` (the shipping app, rated 5/10) · requirements §2, §4d, §6b · `PRINCIPLES.md`
**Constraint:** **frontend only.** The API is what it is today. Where the backend limits us, this document says so and designs around it rather than waiting.

---

## 0. In one paragraph

Alerts is the reason people buy a stall monitor, and it is a **write** feature — the first one the rewrite takes on properly. The shipping app's ideas are good (plain-English summary, sensitivity presets, All/Selected/Excluded scoping, confirm-on-edit); its code is not (2,400-line screen, per-type logic by string matching, device-timezone bug, no permission gate on create, no tests). This design keeps every idea and none of the code. It has **five layers** — services (exist) → query hooks → an **alert domain** (a descriptor per alert type, a summary formatter, a window codec) → thin forms → screens on the surface layer. Every alert type is **data, not code**. The time window is stored **in barn time**, using the organization's zone, and the app **detects and shows** when a stored window has drifted after a clock change. Create/edit/delete are **role-gated at the route**, and the whole thing runs behind the existing production write gate until Inakshi lifts it.

---

## 1. Scope

### In
- **Manage Alerts** list (rules for the org, summary sentence, scope tags, add, edit, delete).
- **Create/Edit** flow: choose type → configure (condition, sensitivity/threshold, time value, window, apply-to, send-to) → save; edit path confirms.
- **Targets picker** (horses / stalls / members; All · Selected · Excluded; **with search**).
- Timezone-correct windows; permission gating; honest states; tests.

**Clarification (v2):** this document is about **rules** — authoring and managing them. The *Alerts tab* on Horse/Stall details lists alert **events** (things that fired); that is Review History filtered to alert types and is covered by `Horcery_Horse_Details_Scope.md` (E1/A3). For You's alert cards likewise read events/notifications, not rules. Only the "Manage Alerts" *row* on those surfaces belongs here (it links in).

### Out (recorded so nobody "restores" them)
- **Suggested alerts** — Inakshi, 2026-08-17: leave for now. No `suggestedAlert` query, no route, no empty-state carousel. Kept in the services layer only because it exists there already; nothing calls it.
- **Chat notifications** toggle (dev-only in the shipping app).
- **SMS / email** channels (`is_sms`, `is_email` always false in the shipping app; the field stays in the payload as false).
- The **alert frequency chart** (renderer decision §6a).
- **Backend changes** — see §7 for what we would ask for, and what we do meanwhile.

### Out of THIS document but REQUIRED before alerts are "done" (v2)
- **Delivery.** An alert a customer never receives is not a feature. Push registration (Firebase Messaging token → backend), the OS notification permission flow, foreground/background handling, and **notification tap → the right screen** are a separate slice (**A5**, §11) with its own short design. The rewrite currently has the `notification-management` service and **no** `expo-notifications` / Firebase Messaging dependency; the shipping app registers the token at splash. The notification-permission banner on Manage Alerts (§6.2) depends on this slice — until it lands the banner is omitted, not faked.

---

## 2. Principles applied to this feature

| Principle | What it forces here |
|---|---|
| Universal components; platform forks only in `src/components/ui` | Native segmented control for All/Selected/Excluded, native date/time picker for the window, native bottom sheet for pickers and confirms; nothing iOS-only in a screen |
| Native over custom | Header search in the picker (`headerSearchBarOptions`), native `Switch`/Toggle, native time picker — not the shipping app's custom keyboard-aware form scaffolding |
| Clean, minimalist, editorial palette | One card per concern; ink and grey; purple only on Save/Complete; status red only for Delete and validation |
| Explained and reversible | Every control has a description; edit confirms with the summary; delete confirms and names the alert |
| Honest states | Loading / empty / error / offline per screen; **"window has shifted since clocks changed"** is a first-class state, not a silent one |
| Tokens never literals | Enforced by `no-color-literals` |
| Read-only against production **until lifted** | All mutations go through `GenericService`'s `assertWriteAllowed`; the form is complete and testable; Save is disabled-with-reason while writes are blocked |
| Measured not asserted | Request count on open (target ≤ 2), and a golden test per alert type |
| Accessible by default | Row label = the summary sentence; one button per row; pickers announce selection counts |

---

## 3. Layers

```
src/app/alerts/…                     screens (thin; compose hooks + components)
src/components/alerts/…              feature components (rule row, scope tags, insight card, field widgets)
src/components/ui/…                  surface layer (segmented, sheet, time-picker, toggle, menu) — platform forks live ONLY here
src/domain/alerts/…                  NEW: pure TypeScript, no React, fully tested
   ├─ descriptor.ts                    AlertTypeDescriptor registry + merge with server AppMetaData
   ├─ summary.ts                       ruleSummary(rule, descriptor, units, zone) → string
   ├─ window.ts                        barn-time ⇄ UTC HMS codec, drift detection
   ├─ payload.ts                       form → API payload; API rule → form
   ├─ scope.ts                         apply/notify tag text, id extraction
   └─ validate.ts                      validate(form, descriptor, units) → FieldErrors (pure; replaces a schema library)
src/hooks/alerts/…                    React Query hooks (rules, types, targets, mutations)
src/services/…                        exists — alertRule, alertType, member/animal/stall services
```

The domain layer is the point of the design. It is where every alert type's behaviour lives, it has no React in it, and it is what the golden tests exercise. Screens become small.

---

## 4. Domain model

### 4.1 `AlertTypeDescriptor` — one alert type, as data

The shipping app scatters per-type behaviour across four files by matching on `slug` strings. The backend already sends *part* of the description in `AlertType.AppMetaData` (`sensitivity_scale`, `duration_scale`, `selectables`, defaults). We make one object:

```ts
interface AlertTypeDescriptor {
  slug: string;                       // 'lying-down-time'
  category: 'behavioural' | 'environmental' | 'general';
  icon: IconName;
  threshold: {
    kind: 'duration' | 'count' | 'degrees' | 'luminance' | 'boolean' | 'selection';
    unit?: { metric: string; imperial: string };     // '°C' / '°F', 'min' / 'min'
    range?: { min: number; max: number };            // validation bounds (display units)
    presets?: Array<{ label: string; value: number }>;  // sensitivity scale, DISPLAY units
    allowCustom: boolean;
  };
  // v2: three independent time concepts, any subset per type (the shipping app has types with all three):
  triggerDuration?: { presets?: number[]; unit: 'min' | 'h'; allowCustom: boolean };  // "for more than N" → trigger_duration
  queryRange?:      { required: boolean; unit: 'min' | 'h' };                          // "within any N" → query_range_duration
  basedOn?:         Array<{ label: string; value: number }>;                            // "based on" → query_type (1 = single, 2 = combined)
  conditions: AlertCondition[];        // which comparators make sense: temp → > <, boolean → ==
  window: { minMinutes: number; requireDistinct: boolean };  // notify-window rules
  summary: (ctx: SummaryContext) => string;   // the plain-English sentence
}
```

**Registry:** `src/domain/alerts/descriptors/*.ts`, one file per slug, plus `generic.ts` for any slug the server sends that we don't know — it renders a plain threshold + condition + window form and a generic sentence, so **a new backend alert type never breaks the app**. `resolveDescriptor(alertType)` = registry[slug] merged over `AppMetaData` (server values win for presets/defaults where present).

**Why:** adding an alert type becomes one file and one golden test. Nothing else changes.

### 4.2 `AlertWindow` — the time window, in barn time

```ts
interface AlertWindow {
  mode: 'any' | 'custom';
  start?: { hour: number; minute: number };   // barn local
  end?:   { hour: number; minute: number };
  zone: string;                                // IANA, from the organization
}
```

See §7 for the codec and drift model.

### 4.3 `RuleScope`

```ts
interface RuleScope { target: 'horses' | 'stalls'; apply: Selection; notify: Selection; }
type Selection = { mode: 'all' } | { mode: 'include' | 'exclude'; ids: string[] };
```

`scope.ts` produces the tag text ("All Horses" / "3 Stalls" / "All except 2" / "Me" / "Everyone").

### 4.4 `AlertRuleForm` (what the form edits)

Flat, typed, in **display units**; `payload.ts` converts to the API's storage units both ways. Every conversion is a pure function with a test.

**Payload contract (v2)** — every field the API expects, and who owns it. Missing this table in v1 was the biggest gap.

| API field | Source | Notes |
|---|---|---|
| `alert_type` | descriptor id | |
| `condition` | form comparator | per-type sign handling (temp-change stores rise/drop as sign) lives in the descriptor |
| `threshold_value` | form → **storage units** | duration → minutes; °F → °C; scale entries → storage value |
| `display_value` | form | **imperial only**: the value the user typed when it differs from storage; `null` otherwise (clears prior) |
| `is_custom` | form | true when the user left the preset scale for a custom threshold |
| `is_custom_duration` | form | true when a custom time value; `true` when the type has no duration scale at all (shipping behaviour, preserved) |
| `trigger_duration` | form → `HH:MM:SS` | only if descriptor.triggerDuration |
| `query_range_duration` | form → `HH:MM:SS` | only if descriptor.queryRange; required per descriptor |
| `query_type` | form | only if descriptor.basedOn |
| `evaluation_start_time` / `evaluation_end_time` | `window.ts` | UTC `HH:MM:SS` from **barn** local (§7); overnight (start > end) is legal — the shipping app allows it and computes the width with a +24h wrap |
| `apply_type` / `apply_condition` / `rule_application_ids` | scope | on PATCH, an `include` with zero ids is **dropped** from the body (shipping behaviour; the backend rejects it otherwise) |
| `notify_condition` / `rule_notification_ids` | scope | same drop rule |
| `is_push` | `true` | `is_sms` / `is_email` always `false` (never live) |
| `organization_id` | auth store | |
| `device_instance_id` | `null` | never set by the app |
| `suggested_alert_rule` | omitted | suggested alerts are out |
| `is_chat_notification_enabled` | omitted | dev-only toggle in shipping; not carried |
| `UNATTESTED_META_DATA` | passthrough + our `window` block (§7.3) | free-form; **whether the backend persists arbitrary keys on PATCH is unverified — A4 checks it on the first write** |
| `bucket_key` | passthrough | unknown purpose; never touched |

---

## 5. Data & hooks (`src/hooks/alerts`)

| Hook | Query | Notes |
|---|---|---|
| `useAlertTypes()` | `alertType.listComplete` | Cached long (`staleTime` 1h); resolves each into a descriptor once |
| `useAlertRules(orgId)` | `alertRule.infiniteList` with `include=alert_application_rules,alert_notification_rules` | The one paginated list. `enabled: !!orgId` |
| `useAlertRule(id)` | reads the list cache first, else `alertRule.detail(id)` | **Rule by id, never rule-in-URL** |
| `useTargets(kind)` | `member/animal/stall.listComplete` | Only the kind the picker is open for; all pages |
| `useSaveAlertRule()` | `create` / `updatePatch` | Invalidates `alertRule.infiniteList` and refetches. **No optimistic update** (v2): the summary is derived from a payload the server may normalise; showing our guess for a second and then the truth is the dishonest kind of fast |
| `useDeleteAlertRule()` | `delete` | Invalidates; navigates back |

**Request budget on opening Manage Alerts: 2** (types, rules) — the shipping app fires 3 including the dead suggested-alerts query. Measured and reported per §2.

**Write gate:** every mutation goes through `GenericService`, which throws when pointed at production without `EXPO_PUBLIC_ALLOW_PRODUCTION_WRITES`. The hooks surface that as a typed `WriteBlockedError` so the UI can say *"Saving is switched off in this build"* rather than a generic failure.

---

## 6. Navigation & screens

### 6.1 Routes (`src/app/alerts/`)

```
alerts/_layout.tsx        native Stack, headerLargeTitle on index
alerts/index.tsx          Manage Alerts (list)
alerts/new.tsx            step 1: choose type
alerts/configure.tsx      step 2: configure (params: typeId)  — also EDIT with params: ruleId
```

Pickers and confirms are **sheets** (surface `Menu`/bottom sheet), not routes. Entry points: More menu row, Horse/Stall Alerts tab row, For You alert cards — all `router.push('/alerts')`; edit is `router.push({ pathname: '/alerts/configure', params: { ruleId } })`.

**Permission gate lives in `alerts/_layout.tsx`**: reads `memberType`; VIEWER/GUEST/RESTRICTED get a read-only list, no Add, no Save, no Delete — visibly, with a reason ("Only editors and admins can change alerts"). Not per-button. Not per-entry-row. **v2:** rows for read-only roles open the same **Configure screen in read-only mode** (every field disabled, one reason line at the top) — not a separate detail sheet. One screen fewer to build and keep honest. `memberType` is per-organization; the layout re-reads it on org switch (verify the auth store updates it — noted in A2).

```
alerts/targets.tsx        v2: the targets picker is a ROUTE presented as a form sheet
                          (`presentation: 'formSheet'`), not a bottom-sheet component —
                          because it needs a NATIVE HEADER SEARCH BAR, and sheets have no header.
```

### 6.2 Manage Alerts (`alerts/index.tsx`)

- Native large title "Alerts", header `+` (hidden for read-only roles).
- List of `AlertRuleRow`: icon · type name · **summary sentence** (`domain/summary`) · two `ScopeTag`s · **drift badge** when §7 says the window has shifted.
- Row `accessibilityLabel` = `"${typeName}. ${summary}. ${applyTag}, ${notifyTag}"`. One pressable per row.
- Sections? No — one list, newest first, as shipping. (Grouping by type is a later nicety.)
- States: skeleton (3 rows) · empty ("No alerts yet. Alerts tell you when something needs a look." + Add) · error + retry + Contact Support · offline.
- Pull-to-refresh with own `refreshing`.
- Notification-permission banner (reuse the pattern; **with an Enable button** — the shipping app's banner has none).

### 6.3 Choose type (`alerts/new.tsx`)

- Grouped list (Behavioural / Environmental / General) of `AlertTypeCard`s from descriptors; tap → configure. Not a "select then Next" grid — one tap fewer.
- Read-only roles never reach it.

### 6.4 Configure (`alerts/configure.tsx`) — the important screen

Small. It composes:

```
<InsightCard>            live summary + scope tags (updates on every field change)
<AlertDetailsCard>       fields chosen by descriptor.threshold / timeValue / conditions
<WindowCard>             Any time | Custom (native time pickers, barn zone shown: "Times are in barn time (America/New_York)")
<ScopeRow apply>         → TargetsPicker sheet
<ScopeRow notify>        → TargetsPicker sheet
[Save / Complete]        purple; disabled with reason when invalid, when write-blocked, or when read-only
[Delete]                 edit only, red text, confirm sheet
```

- **Form state:** a typed `useReducer` (`use-alert-rule-form`) with **validation as a pure domain function** `validate(form, descriptor, units)` — no `react-hook-form`, no `zod` (neither is installed; D2 revised by the implementation plan). Errors, summary and payload are all derived by pure calls; the hook holds state and nothing else.
- **Fields render from the descriptor**: `threshold.kind` picks the widget (preset segmented + custom numeric · boolean toggle · selection menu · duration with unit); `conditions` picks the comparator options; `timeValue` adds trigger/range; unknown → generic.
- Edit path: `useAlertRule(ruleId)` → `payload.toForm(rule, descriptor, units, zone)`; save → confirm sheet showing the new summary and tags.
- **Keyboard:** native `KeyboardAvoidingView` + `automaticallyAdjustKeyboardInsets`; no third-party keyboard controller.
- **Surface-layer prerequisites (v2):** a universal **`TimePicker`** does not exist yet in `src/components/ui` — it is an A3 dependency (iOS `@expo/ui` DateTimePicker in time mode; Android Material time picker; web unverified). Segmented control, sheet, toggle and menu already exist.
- **Payload preview (v2, dev-only):** while writes are blocked (A3), Save opens a sheet showing the **exact JSON that would be sent**, plus the summary sentence and the barn-time window. This lets Inakshi and Codex verify payload correctness on device *before* the write gate is lifted, and it is what the golden tests assert against. Hidden in production builds.

### 6.5 Targets picker (form-sheet route) — corrected in v2

v1 said "a native sheet with header search". That cannot exist: a bottom-sheet component has no navigation header, so no `headerSearchBarOptions`. **It is a route** (`alerts/targets.tsx`) presented as a form sheet — native header with title, search bar and Done; below it a segmented **All · Selected · Excluded** and the list of `TargetRow`s (thumb/avatar, name, checkbox). Result is returned to Configure via router params or a small in-memory selection store keyed by a request id (no global state leak).
- One kind at a time; `useTargets(kind)` (all pages); loading/empty/error/search-empty inside the sheet.
- The confirm-save and confirm-delete dialogs stay as bottom-sheet **components** (no search, no header needed).

---

## 7. The timezone design (frontend-only)

### 7.1 The problem, precisely
The API stores `evaluation_start_time` / `evaluation_end_time` as **`HH:MM:SS` in UTC**, no date, no zone. The backend evaluates that fixed UTC time. The shipping app converts from **device** local. Two failures: device zone ≠ barn zone; and DST — a fixed UTC time is a *different* barn time after the clocks change.

### 7.2 What we can fix entirely on the frontend
**Device ≠ barn.** Convert using the **organization's IANA zone** (`organization.timezone`, already used by `useOrganizationNow`), never the device's. `window.ts`:

```ts
toStorage(window: AlertWindow, on: DateTime): { start: 'HH:MM:SS', end: 'HH:MM:SS' }   // barn local → UTC using zone offset at `on`
fromStorage(start, end, zone, on): AlertWindow                                           // UTC → barn local using zone offset at `on`
```

Both pure, both tested against fixed instants (a summer date and a winter date for New York, Sydney, London; and a half-hour zone).

### 7.3 What we cannot fix without the backend — and what we do instead
**DST drift.** Once stored, the UTC time is fixed; after a clock change the barn-time window is off by the DST delta until re-saved. Frontend cannot change what the backend evaluates. So we make it **visible and one-tap-fixable**:

- On save, write into the rule's free-form `UNATTESTED_META_DATA` (a field the app owns):
  `{ window: { zone, start_local: '21:00', end_local: '06:00', saved_offset_min: -240 } }`
- On read, `window.ts` compares `saved_offset_min` with the zone's **current** offset. If they differ → `drift = { minutes: 60, direction }`.
- Manage Alerts row shows a **drift badge** ("Shifted 1h since clocks changed"); Configure shows a banner with **"Re-save to fix"** — which simply re-runs `toStorage` with today's offset and PATCHes. Read-only roles see the badge, not the button.
- Rules saved by the shipping app have no `window` metadata → we show the window derived from storage with the current offset and **no drift claim** (we cannot know); a footnote "saved before barn-time windows" once, in Configure.
- **v2 additions:** (a) if the organization's `timezone` itself has changed since save (`window.zone` ≠ current), that is also drift — "Barn timezone changed since this alert was saved"; (b) if `organization.timezone` is **missing or invalid**, fall back to the device zone **and say so** on Configure ("Barn timezone not set — using your phone's"), and store that zone in `window.zone` so the record is honest; (c) whether the backend **persists** our `window` block on PATCH is unverified — the very first write in A4 checks it. If it does not, drift detection is impossible frontend-only; the design degrades to §7.2 (device≠barn fixed, DST invisible) and §13's backend ask becomes the only route. State that outcome plainly if it happens.

This is honest (the user is told exactly what happened), reversible (one tap), and needs nothing from the backend. It also gives us the data to make the backend ask precise later: *store the zone and evaluate in it*. That ask is recorded in requirements §7 as an open item, **not** a blocker.

### 7.4 "Any time"
Stored as `00:00:00`–`23:59:59` **barn** local → UTC. Displayed as "Any time" when the stored pair, converted back, spans the barn day (±1 min).

---

## 8. Permissions

- Source of truth: `memberType` from the auth store (ADMIN / EDITOR / VIEWER / GUEST / RESTRICTED), the same enum the shipping `usePermissions` uses. Port **the mapping**, not the hook: `domain/alerts/permissions.ts` → `canManageAlerts(memberType): { create, edit, delete }`.
- Enforced **at the route layout** (§6.1) and mirrored in the UI (no dead controls; disabled-with-reason).
- The backend enforces too; when it refuses, the toast names the reason ("You don't have permission to change alerts") not "Failed to save".
- This is B1 from the Horses parity doc arriving early because alerts cannot ship without it. Same `permissions.ts` will serve Horses later.

---

## 9. Honest states — the full list per screen

| Screen | Loading | Empty | Error | Offline | Special |
|---|---|---|---|---|---|
| Manage Alerts | 3-row skeleton | copy + Add (or read-only note) | retry + support | wifi.slash + waiting | notification-permission banner with Enable; drift badges |
| Choose type | skeleton grid | "No alert types available" (server) | retry | offline | — |
| Configure | skeleton card while descriptor/rule resolve | n/a | rule not found → back | offline: form usable, Save disabled "You're offline" | write-blocked: Save disabled "Saving is switched off in this build" (+ payload preview in dev); drift banner + Re-save; unknown type → generic form + "This alert type is new; showing basic settings"; **no barn timezone → "using your phone's timezone" note**; read-only role → every field disabled + one reason line |
| Targets picker | in-sheet skeleton | "No horses yet" | in-sheet retry | — | search-empty "No horses match" |

Every disabled control says why. That is requirement §6b item 3, applied.

---

## 10. Testing

| Layer | Test | Why |
|---|---|---|
| `domain/descriptors` | **one golden test per alert type**: given a form → expected payload; given a payload → expected form; given a rule → expected summary sentence. **Fixtures are real, anonymised rules and the real `alert_types` response from the QA org (read-only), captured in A0** — not hand-written guesses | This is where the shipping app has zero coverage and 4,800 lines of hand-logic |
| `domain/window` | fixed-instant round-trips (NY summer/winter, Sydney, London, Kolkata); **overnight windows (21:00→06:00) and "any time" that wraps in UTC**; drift detection incl. zone change; "any time" recognition | The bug that motivated the design |
| `domain/scope` | tag text for every apply/notify combination incl. "Me" | Cheap, prevents the row lying |
| `domain/validate` | invalid inputs produce the right message per descriptor (min window, range bounds, distinct times) | Replaces the shipping app's runtime `setResolver` dance |
| hooks | `useAlertRule` cache-first then fetch; write-blocked surfaces `WriteBlockedError` | Route contract |
| components | `AlertRuleRow` renders summary + tags + drift badge; a11y label; `TargetsPicker` search filters | RNTL, async |
| screens | `no-dead-controls` sweep extended to `alerts/*` | Standing rule |
| device | Manage Alerts open = 2 requests; light + dark; VoiceOver reads the row sentence | Measured, not asserted |

---

## 11. Build order (each a usable slice)

| # | Slice | Delivers | Blocked by |
|---|---|---|---|
| **A0** | **Ground truth** (v2) | Read-only pull of the QA org's `alert_types` (with `AppMetaData`) and a handful of real rules; **confirm the slug set** (the "~10" in v1 is inferred from client config, not verified against the server) and capture anonymised fixtures | nothing — half a day |
| **A1** | **Domain layer** | descriptors for every slug found in A0 + generic; summary; window codec + drift; scope; payload; schema; golden tests against the A0 fixtures | A0 |
| **A2** | **Manage Alerts, read-only** | list with summaries, tags, drift badges, all states, permission-aware; entry points wired (More, Horse Alerts tab); **sample-data mode** so the page can be design-reviewed without a QA org that has rules | A1 |
| **A3** | **Create/Edit UI, save gated** | choose type, configure (incl. read-only mode), targets form-sheet route with native search, confirm sheets, **`TimePicker` in the surface layer**, **dev-only payload preview**; Save/Delete disabled-with-reason while writes are blocked; fully testable end-to-end without touching production | A1, A2 |
| **A4** | **Writes on** | flip the gate for the QA org (D1); **first write verifies `UNATTESTED_META_DATA.window` persists**; permission gate live; drift Re-save live; device validation both platforms | A3, D1 |
| **A5** | **Delivery** (v2) | push token registration, OS permission flow (and the Manage Alerts banner), foreground/background handling, notification tap → destination. Own short design first. | Firebase Messaging in the rewrite; A4 for end-to-end |

A0 + A1 together are about a day and a half of pure TypeScript with tests and no UI, and they de-risk everything after them. **Alerts are not "done" until A5 ships** — authoring without delivery is a form that saves.

---

## 12. Decisions for Inakshi

| # | Question | My recommendation |
|---|---|---|
| **D1** | **Where do we test writes?** The rewrite is read-only against production by rule. Alerts *is* writes. | **DECIDED 2026-08-17 (Inakshi): (a) — the QA org only.** Writes pass only when the existing `EXPO_PUBLIC_ALLOW_PRODUCTION_WRITES` flag is on **and** the current organization is on `EXPO_PUBLIC_WRITE_ORG_ALLOWLIST` (QA org id). Both default off; every other organization stays untouchable. A4 is unblocked. |
| **D2** | Form library | **DECIDED 2026-08-17: no new dependency** — typed `useReducer` + pure `validate()` in the domain layer, as the plan proposes. |
| **D3** | **Time window UI:** two native time pickers (start/end) or a single "from–to" range control? | **Two native pickers** — universal, no custom control, matches the "native over custom" rule. |
| **D4** | **Grouping on Manage Alerts:** flat newest-first (shipping) or grouped by category? | Flat for A2; revisit with real usage. |
| **D5** | **Do we tell users about drift on rules saved by the OLD app** (where we can't compute it)? | Show the window, add one footnote in Configure, no badge. Don't claim what we can't know. |
| **D6** | Delivery (A5) ordering | **DECIDED 2026-08-17: authoring first (A0–A4); A5 designed in parallel and built right after A4; alerts are not called shipped until A5 is in.** |

Not asking: suggested alerts (out, your call today); SMS/email (never live); the frequency chart (§6a).

---

## 13. What the backend would need, later (recorded, not blocking)

- Store the window **with a zone** (or as barn-local + zone) and evaluate in it. Removes the drift class entirely; §7.3 becomes unnecessary.
- Return `alert_types` with a complete `AppMetaData` contract (documented keys) so the client registry can shrink to icons + summary templates.
- Return the member's permissions on the org (`can_manage_alerts`) so the client mapping isn't the source of truth.
- Confirm (or document) that arbitrary keys in `UNATTESTED_META_DATA` are persisted on PATCH — the drift design depends on it (§7.3).
- Confirm how an overnight window (`evaluation_start_time > evaluation_end_time`) is evaluated — the shipping app relies on it, so it presumably works, but it is undocumented.

Filed under requirements §7 open items when this design is accepted.

---

## 14. Self-review — what v2 changed and why (2026-08-17)

Inakshi asked for a fresh, careful look. Re-read cold and checked against the shipping source and the rewrite's actual state. Found and fixed:

| # | v1 said | Problem | v2 |
|---|---|---|---|
| 1 | Targets picker is "a native sheet with header search" | A bottom-sheet component has no navigation header; native header search only exists on a Stack route. The design as written could not be built. | Picker is a **form-sheet route** (`alerts/targets.tsx`) with `headerSearchBarOptions` (§6.1, §6.5) |
| 2 | Scope covered "the alerts feature" | **Delivery was missing entirely** — push registration, permission flow, notification tap. The rewrite has no messaging dependency yet. Authoring without delivery is a form that saves. | Named as **A5**, required before "done", own design; D6 for ordering (§1, §11, §12) |
| 3 | Descriptor `timeValue: trigger \| range` | Real types carry **trigger duration AND query range AND "based on" query_type together**; the shape could not express them | Three independent optional blocks (§4.1) |
| 4 | Payload described only in prose | `display_value`, `is_custom`, `is_custom_duration`, the include-with-zero-ids drop on PATCH, `bucket_key`, `device_instance_id` — none written down; the golden tests would have had nothing precise to assert | **Payload contract table** (§4.4) |
| 5 | "~10 known slugs" | Inferred from client-side config, never checked against what the server actually returns | **A0 ground-truth pull** of `alert_types` + real anonymised rule fixtures before A1 (§11) |
| 6 | Drift detection via `UNATTESTED_META_DATA` | Assumed the backend persists arbitrary keys on PATCH — **unverified** | Stated as an assumption; first A4 write checks it; degrade path spelled out (§7.3, §13) |
| 7 | "Optimistic row update on edit" | Contradicts the honest-states rule: our guessed summary might differ from what the server normalises | Removed; invalidate + refetch (§5) |
| 8 | Read-only roles get "a read-only detail sheet" | An extra surface to build and keep honest | Configure in read-only mode (§6.1) |
| 9 | Native `TimePicker` assumed available | It does **not** exist in the surface layer | Named as an A3 prerequisite; web unverified (§6.4) |
| 10 | Overnight windows not addressed | Shipping allows 21:00→06:00 (adds 24h when end < start); "any time" from a non-UTC zone *always* wraps in UTC. Must be legal and tested | Contract row + window tests (§4.4, §10) |
| 11 | Missing/invalid org timezone; org timezone *changed* since save | Not handled | Fallback with a visible note; zone change counts as drift (§7.3, §9) |
| 12 | No way to check payloads on device before writes are allowed | A3 would be "trust the tests" | **Dev-only payload preview** sheet (§6.4) |
| 13 | No sample data | The page could not be design-reviewed without a QA org that has rules | Sample mode in A2 (§11) |
| 14 | Alerts *events* list on Horse details ambiguous | Could be read as "rebuild the events list here" | Clarified: rules only; events are Review History (§1) |

**Still open / known limits after v2:** DST drift is detectable and fixable but not *preventable* frontend-only (backend ask, §13); web support for the time picker unverified; localisation of summary sentences (H2) will need per-locale templates — design the summary as `(ctx) => string` per descriptor so that swap is local; concurrent edits are last-write-wins (acceptable for now, noted).
