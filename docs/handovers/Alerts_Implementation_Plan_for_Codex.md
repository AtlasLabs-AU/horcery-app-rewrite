# Alerts — technical implementation plan for the agent

**Date:** 2026-08-17 · **Author:** Claude, for Inakshi · **Executor:** Codex
**Repo:** `horcery-app-rewrite`, branch `rnd` · **Design authority:** `docs/scope/Horcery_Alerts_Architecture.md` (v2). Where this plan and the architecture disagree, the architecture wins and you tell us.
**Status of the work:** slices **A0 → A4** are ready to build in order. **D1 is decided (2026-08-17): writes are tested against the QA org only** — A4 is unblocked but still comes last and only after A3 is reviewed. **A5 (delivery)** is not in this plan; its design starts in parallel with A2/A3 (D6).

---

## 0. Read this first

1. **Report only what is in the diff.** At the end of each slice, list done / not done / partially done with file and line. If you run out of budget or hit a blocker, say which items you did **not** do. That is a good outcome. Claiming them is not. (This rule exists because a summary earlier this week described four features that were not in the code.)
2. **Stop at every slice boundary** and report. Do not roll A2 into A1 "while you're there". Inakshi reviews between slices.
3. **Never write to production.** `GenericService.assertWriteAllowed` throws on POST/PUT/PATCH/DELETE while `IS_PRODUCTION_API && !ALLOW_PRODUCTION_WRITES`. Do not set `EXPO_PUBLIC_ALLOW_PRODUCTION_WRITES`. Do not add a bypass. A0's fetches are GETs only.
4. **No secrets in the repo.** The Firebase key lives in gitignored `.env.local`; the QA password in `~/.argent/secrets.env`. Fixtures are anonymised (§2.4).
5. **Stage by explicit path.** Two other sessions share this checkout (one is building Horse Details right now — you will see untracked `src/components/horses/horse-*.tsx` and `src/hooks/*status*`/`playhead-data.ts`; **do not touch, stage, or delete them**). Never `git add -A`.
6. `npm run check` green before every commit — lint is `--max-warnings=0`, and a React Compiler diagnostic is an error.
7. Read `PRINCIPLES.md` and requirements §4d/§6b before writing UI. Tokens only (`no-color-literals` fails the build). Every visible control navigates, acts, or is visibly disabled **with a reason** (`no-dead-controls` sweep — extend it to `alerts/*`).
8. RNTL v14: `render`, `rerender`, `fireEvent.press` are **all async**. `expo-symbols` and `expo-video` are mocked in `jest.setup.js`; Reanimated cannot be mocked (use RN `Animated` if you must animate).
9. Verify on the **iPhone 17 Pro Max `53E8803D-9969-4B67-9130-38E560DD8622`**, Metro on **8083**, via argent (`describe` before every tap; Fast Refresh is unreliable — cold reload before judging). The iPhone 17 Pro belongs to another session. Light **and** dark, screenshots to `outputs/alerts/`.

---

## 1. Decisions — status at handover

| # | Decision | Status | What you do |
|---|---|---|---|
| D1 | Where writes are tested | **DECIDED: QA org only** (Inakshi, 2026-08-17) | A3 still ends with Save disabled-with-reason + payload preview; A4 (§6) is now real work, after A3 review |
| D2 | Form library | **DECIDED (Inakshi, 2026-08-17): NO new dependency.** The rewrite has neither `zod` nor `react-hook-form`. Form state is a typed `useReducer`; validation is a **pure domain function** `validate(form, descriptor, units)` returning `FieldErrors`. It is tested like everything else in the domain and it avoids ref-heavy form libraries the React Compiler dislikes | Build it that way |
| D3 | Time window UI | default: two native time pickers | Build `TimePicker` in the surface layer (A3) |
| D4 | List grouping | default: flat, newest first | |
| D5 | Drift on old-app rules | default: no badge, one footnote | |
| D6 | Delivery ordering | **DECIDED: authoring first; A5 designed in parallel, built after A4** | Not in this plan — a separate short design for A5 will follow |

---

## 2. Slice A0 — ground truth (½ day, no UI)

**Goal:** know exactly what the server sends before designing descriptors around a guess.

### 2.1 Script
`scripts/pull-alert-fixtures.ts` (run with `npx tsx`), **dev tooling, committed; its output is what gets anonymised**.
- Reads `EXPO_PUBLIC_FIREBASE_API_KEY` from `.env.local` and `ARGENT_SECRET_HORCERY_QA_PASSWORD` from `~/.argent/secrets.env`; QA email `qa_atlas@atlaslabs.com.au` (see `docs/runbooks/Horcery_App_Agent_Runbook.md`). Signs in via Firebase REST `signInWithPassword` to get an ID token. If either secret is missing, **stop and ask Inakshi** — never prompt for or paste credentials into chat.
- GET (read-only): `alert_management/api/alert_handler/alert_types?deleted_at__isnull=true&ordering=name` (follow pagination) and `…/alert_rules?organization_id=<QA org>&deleted_at__isnull=true&include=alert_application_rules,alert_notification_rules` (follow pagination). Also GET the QA `organization` detail (for `timezone`).
- Writes raw JSON to `scratch/alerts/` (**gitignored** — add it) and anonymised JSON to `src/domain/alerts/__fixtures__/`.

### 2.2 Anonymisation (what may be committed)
Alert **types** are product configuration — commit as-is. Alert **rules**: replace `id`s with `rule-1…n`, member ids with `member-a…`, animal/stall ids with `horse-1…`/`stall-1…`, drop `created_by`-style fields, keep everything structural (`condition`, `threshold_value`, `display_value`, `is_custom*`, `*_duration`, `query_type`, `evaluation_*`, `apply_*`, `notify_*`, `UNATTESTED_META_DATA`, `bucket_key`). Keep the QA org's `timezone` string.

### 2.3 Deliverable
`docs/handovers/Alerts_A0_Ground_Truth.md`: the **slug list** with `threshold_type`, `category`, and the keys present in each type's `AppMetaData` (`sensitivity_scale`, `duration_scale`, `selectables`, defaults…); how many rules the QA org has and which types they cover; whether any rule already carries a `UNATTESTED_META_DATA` payload; any slug the shipping client config (`alert-form-config.ts`) knows that the server does not, or vice versa. **Stop and report.**

---

## 3. Slice A1 — the domain layer (1 day, no UI)

Everything here is pure TypeScript under **`src/domain/alerts/`** — no React, no RN imports, no services import. It may import from `@/config/enums/*`, `luxon`, and its own files. Add `src/domain/**` to the boundary test's checked tree (it already forbids chart renderers there — good).

### 3.1 Files and signatures

```
src/domain/alerts/
  types.ts            AlertTypeDescriptor, AlertWindow, Selection, RuleScope, AlertRuleForm, FieldErrors, Units ('metric'|'imperial')
  descriptors/
    index.ts          REGISTRY: Record<slug, Partial<AlertTypeDescriptor>>; resolveDescriptor(alertType: IAlertType): AlertTypeDescriptor
    generic.ts        the fallback for unknown slugs
    <slug>.ts         one per slug found in A0 (temperature, temp-change, light, entering-stall, exiting-stall,
                      lying-down-count, lying-down-time, rolling-count, people-in-stall, people-in-stall-time, …)
  window.ts           toStorage(w, on: DateTime): {start,end}   fromStorage(start,end,zone,on): AlertWindow
                      isAnyTime(w): boolean   windowMinutes(w): number (wraps overnight)   detectDrift(meta, zone, on): Drift|null
  scope.ts            applyTag(scope, target): string   notifyTag(scope, currentMemberId): string   idsFromRule(rule): {apply, notify}
  summary.ts          ruleSummary(form|rule, descriptor, units, zone): string
  payload.ts          toPayload(form, descriptor, units, orgId, zone, on): AlertRulePayload   toForm(rule, descriptor, units, zone, on): AlertRuleForm
  validate.ts         validate(form, descriptor, units): FieldErrors   (replaces zod)
  permissions.ts      canManageAlerts(memberType): { view, create, edit, delete }
  __fixtures__/       from A0
  __tests__/          one file per module + golden.test.ts
```

### 3.2 `resolveDescriptor` merge rule
`generic` ← registry[slug] ← server `AppMetaData` (server wins for `sensitivity_scale` → `threshold.presets`, `duration_scale` → `triggerDuration.presets`, `selectables` → selection options, defaults). Log a `console.warn` in `__DEV__` when server and registry disagree on a preset value; tests assert the precedence.

### 3.3 Behaviours to preserve from the shipping app (verify each against `alert-form-utils.ts` while porting — port the *behaviour*, not the code)
- Threshold storage: duration → **minutes**; degrees → **°C**; imperial input sets `display_value`, otherwise `display_value: null`.
- `temp-change`: rise/drop encoded as threshold **sign**; `parseTempChangeStoredThreshold` / `applyTempChangeThresholdSign` semantics.
- `is_custom_duration` is `true` when the type has **no** duration scale.
- PATCH: an `include` apply/notify with **zero ids** is dropped from the body.
- Trigger / query-range → `HH:MM:SS`; combined "based on" → `query_type` (1 single, 2 combined).
- Notify-window rules per type: `requireDistinctTimes`, `minWindowMinutes` (30/60/120 depending on type — take the values from A0/`alert-form-config.ts`).

### 3.4 `window.ts` — the timezone design
- Barn zone comes in as an IANA string. **Fallback:** if missing/invalid → device zone **and** return `{ zone, fallback: true }` so the UI can say so.
- `toStorage`: barn-local `{hour,minute}` on the date of `on` in `zone` → UTC `HH:MM:SS`. `fromStorage` reverses with the offset at `on`. Overnight legal.
- Metadata block written on save: `UNATTESTED_META_DATA.window = { zone, start_local, end_local, saved_offset_min, saved_at }`.
- `detectDrift(meta, currentZone, on)`: `null` if no meta; `{ kind: 'offset', minutes }` if `saved_offset_min !== currentOffset`; `{ kind: 'zone', from, to }` if `meta.zone !== currentZone`.
- "Any time" = stored pair spans the barn day (±1 min) after conversion.

### 3.5 Tests (all pure, fast)
- `window.test.ts`: round-trips for **America/New_York (Jul & Jan), Australia/Sydney (Jan & Jul), Europe/London, Asia/Kolkata**; overnight 21:00→06:00 in each; any-time recognition; drift offset and drift zone; fallback zone.
- `golden.test.ts`: for **every fixture rule** from A0: `toForm` → `toPayload` reproduces the stored fields (modulo our added `window` block); `ruleSummary` matches a checked-in expected sentence (write them by hand once, review with Inakshi).
- `descriptors.test.ts`: every A0 slug resolves; unknown slug → generic; server-wins precedence.
- `scope.test.ts`: every apply/notify combination incl. "Me", "All except N", "No People".
- `validate.test.ts`: per-type min window, distinct times, threshold range, required query range.
- `permissions.test.ts`: the five member types.

**Stop and report** with the test count and any behaviour you could not pin down.

---

## 4. Slice A2 — Manage Alerts, read-only (1–1.5 days)

### 4.1 Hooks — `src/hooks/alerts/`
- `use-alert-types.ts`: `alertType.listComplete`, `staleTime: 60 * 60 * 1000`; returns `{ types, byId, descriptors: Map<id, AlertTypeDescriptor> }`.
- `use-alert-rules.ts`: `alertRule.infiniteList({ ordering: '-created_at' }, [organization_id, deleted_at__isnull, include=alert_application_rules,alert_notification_rules])`, `enabled: !!organizationID`; flattens pages; exposes `refresh()` with its own `refreshing` (the Horses pattern) and `refetch()`.
- `use-alert-rule.ts`: `(id) → rule | undefined` — reads the infinite-list cache first, else `alertRule.detail(id)`.
- `use-organization-zone.ts` (if not already exposed): `organization.detail(orgId).data.timezone` → `{ zone, fallback }` via `window.ts`.

### 4.2 Routes — `src/app/alerts/`
- `_layout.tsx`: native `Stack`; **the permission gate**: reads `memberType`, computes `canManageAlerts`, provides it via context to children; header shows nothing write-y for read-only roles. Register the alerts stack in `src/app/_layout.tsx` next to `menu`.
- `index.tsx`: Manage Alerts. Large title "Alerts". Header `+` only when `can.create` (A3 wires it; in A2 it is **disabled-with-reason "Adding alerts is coming"** so the composition is judged whole).
- Wire entry points: `src/app/(tabs)/more.tsx` `more-alerts` row → `router.push('/alerts')` (keep its existing gating comment honest); Horse Details Alerts tab "Manage Alerts" row (currently disabled-with-reason in the Horse Details scope) → live link. **Do not touch other Horse Details files** — Codex-B is in them.

### 4.3 Components — `src/components/alerts/`
- `alert-rule-row.tsx`: icon (bare, no well — editorial rule) · type name (`headline`) · summary sentence (`subhead`, secondary) · `ScopeTag` ×2 · optional `DriftBadge`. **One `Pressable`**; `accessibilityLabel` = `"${typeName}. ${summary}. ${applyTag}, ${notifyTag}${drift ? '. Window has shifted' : ''}"`. `testID="alert-rule-${id}"`.
- `scope-tag.tsx`: pill with icon (`horse` / `stall` / `bell`) + text; tokens only.
- `drift-badge.tsx`: small status pill; `statusAlert` colour is **allowed** here (it is a real problem, not decoration).
- `alerts-states.tsx`: `AlertsLoading` (3-row skeleton), `AlertsEmpty` (copy: "No alerts yet. Alerts tell you when something needs a look." + Add button disabled-with-reason in A2 / read-only note for viewers), `AlertsError` (retry + Contact Support — reuse the pattern from `horses-states.tsx`), offline via `useOnlineStatus` + the `HorsesNoInternet` shape (generalise it if trivial; otherwise copy and note the duplication).
- `alerts-preview-banner.tsx` + `PREVIEWS.sampleAlertsData` + `src/config/sample/alerts-sample.ts`: **6–8 sample rules covering every descriptor family**, one with drift metadata, one authored "by the old app" (no metadata). Same opt-in pattern as `sampleHorsesData`.

### 4.4 A2 acceptance
- Cold open of `/alerts` = **2 network requests** (types, rules) besides the cached organization — measure with argent `view-network-logs`, report the number.
- All states reachable and screenshotted (light + dark): loading, empty, error, offline, sample, list with drift badge, read-only role (force `memberType` in dev to VIEWER and screenshot).
- VoiceOver reads the row sentence (verify with `describe` on the accessibility tree).
- Tests: `alert-rule-row.test.tsx` (label, drift badge, one pressable, no `accessibilityRole="button"` hard-coded — conditional on `onPress`); `use-alert-rules.test.ts` (org gating, flatten, refresh semantics); `alerts-sample.test.ts`; `no-dead-controls` extended.

**Stop and report.**

---

## 5. Slice A3 — Create / Edit UI, save gated (2–3 days)

### 5.1 Surface layer first — `src/components/ui/`
- **`time-picker.tsx` + `.ios.tsx` + `.android.tsx` + `time-picker-types.ts`**: `{ value: {hour,minute}, onChange, accessibilityLabel, testID }`. iOS: `@expo/ui` DateTimePicker in time mode inside a sized `Host` (Hosts do **not** auto-size — give it an explicit height); Android: `@expo/ui/jetpack-compose` time picker or Material dialog. Universal fallback for web: RN `TextInput` with `HH:MM` mask **and a comment saying web is unverified**. Add to the boundary test's allow-list the same way `toggle.*` is.
- Reuse: `SegmentedControl` (needs explicit `width`), `Menu` (bottom sheet; `multiSelect` for confirm dialogs is not needed — single-shot), `Toggle`, `Icon`.

### 5.2 Routes
- `alerts/new.tsx` — choose type: grouped list (Behavioural / Environmental / General) of `AlertTypeCard`s built from descriptors; **one tap → configure**. Read-only roles are redirected back by the layout gate.
- `alerts/configure.tsx` — params `{ typeId } | { ruleId }`. Composes: `InsightCard` (live summary + tags) · `AlertDetailsCard` · `WindowCard` · `ScopeRow` ×2 · Save · Delete (edit only). Read-only mode when `!can.edit`: every field disabled, one reason line, no Save/Delete.
- `alerts/targets.tsx` — **form-sheet route** (`presentation: 'formSheet'` in `_layout`), params `{ kind: 'horses'|'stalls'|'members', requestId }`. Native header with `headerSearchBarOptions` (autoCapitalize `none`), `SegmentedControl` All · Selected · Excluded, list of `TargetRow`s from `useTargets(kind)` (`animal/stall/member.listComplete`), footer "N selected · Done". Returns via a tiny in-memory `targetsSelectionStore` keyed by `requestId` (a module-level `Map` + a `useSyncExternalStore` hook — no zustand, no globals leaking between requests; entry deleted on read).

### 5.3 Form state
- `src/hooks/alerts/use-alert-rule-form.ts`: `useReducer` over `AlertRuleForm`; actions `set(field, value)`, `setScope`, `setWindow`, `reset(form)`; derived `errors = validate(form, descriptor, units)`, `summary = ruleSummary(...)`, `payload = toPayload(...)`, `isValid`. All derivations are pure calls into `src/domain/alerts` — the hook holds state and nothing else.
- Fields render from the descriptor: `threshold.kind` → preset `SegmentedControl` + optional custom numeric (`TextInput`, `keyboardType='decimal-pad'`), boolean → `Toggle`, selection → `Menu`; `conditions` → `SegmentedControl` or `Menu` when > 3; `triggerDuration`/`queryRange` → numeric + unit `Menu`; `basedOn` → `SegmentedControl`. Unknown descriptor → generic set + the "This alert type is new; showing basic settings" note.
- Window: `SegmentedControl` Any time · Custom; two `TimePicker`s; caption "Times are in barn time (${zone})" or the fallback note.

### 5.4 Save / Delete while writes are blocked
- `Save` **enabled when valid** — pressing it opens the **payload preview sheet** (dev only, `__DEV__`): the JSON from `toPayload`, the summary sentence, the barn-time window and the UTC pair. In non-dev builds Save is disabled with "Saving is switched off in this build". Never call the service in A3.
- `Delete` (edit only): disabled with "Removing alerts is coming"; the confirm sheet component (`confirm-sheet.tsx`, generic: title, body, destructive label, cancel) is built and unit-tested now, wired in A4.
- Confirm-on-edit sheet: built now, shows summary + tags, its confirm button is the same disabled-with-reason in A3.

### 5.5 A3 acceptance
- Golden tests still green; new: `use-alert-rule-form.test.ts` (reducer + derived), `validate` integration per descriptor family through the hook, `time-picker.test.tsx` (universal file), `targets` route test (search filters, segmented switches mode, selection count), `configure` screen renders every descriptor family from fixtures without crashing (a table test).
- Device: create flow for at least **temperature, lying-down-time, people-in-stall-time (three time fields), entering-stall (boolean)** — screenshot each configure screen light + dark, and the payload preview for each. Edit flow for a sample rule with drift → banner shows "Re-save to fix" (disabled-with-reason in A3).
- `no-dead-controls` extended to `alerts/*` and passing.

**Stop and report.** A4 begins only after Inakshi/Claude review A3.

---

## 6. Slice A4 — writes on (D1 decided: QA org only) — after A3 is reviewed

Add `EXPO_PUBLIC_WRITE_ORG_ALLOWLIST` (comma-separated org ids) read in `src/config/env`; `assertWriteAllowed` gains a second condition — writes pass only if the current org is on the list **and** the existing flag is set. Both default off. First write: create one rule on the QA org, refetch it, **assert `UNATTESTED_META_DATA.window` came back** — report the result either way (§7.3 of the architecture explains the degrade path). Then wire Save/Delete/Re-save, permission gate live, device validation on both platforms.

---

## 7. What to report at each stop

For each item in the slice: **done / not done / partially done**, with file and line. `npm run check` output (suite and test counts). Screenshots listed by path. Request count for A2. Anything you decided that the architecture did not cover, in one line each, so it can be ratified or reversed. Anything you found in the shipping app that contradicts the architecture's assumptions.
