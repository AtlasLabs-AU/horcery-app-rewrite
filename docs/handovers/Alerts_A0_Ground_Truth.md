# Alerts A0 — ground truth from the production API (read-only)

**Date:** 2026-08-17 · **Pulled by:** `scripts/pull-alert-fixtures.mts` (GETs only) · **Account:** QA user
**Source organization:** "Mobile Dev Testing" — the one of the QA user's 10 organizations that has any alert rules (31; every other has 0). Timezone **America/Chicago** — a DST zone, which is useful.
**Committed fixtures:** `src/domain/alerts/__fixtures__/{alert-types,alert-rules,organization}.json` (anonymised; server-side PromQL stripped). Raw responses in gitignored `scratch/alerts/`.

This is what the server actually sends. Several assumptions inherited from the shipping client's config were wrong; each is called out. **A1 is built against this document, not against `alert-form-config.ts`.**

---

## 1. Alert types — 9, not 10

| slug | name | category | threshold_type | display units | AppMetaData keys |
|---|---|---|---|---|---|
| `entering-stall` | Entering Stall | 3 (SECURITY) | 70 BOOLEAN | — | *(none)* |
| `exiting-stall` | Exiting Stall | 3 | 70 BOOLEAN | — | *(none)* |
| `people-in-stall` | People in Stall | 3 | 70 BOOLEAN | person / people | *(none)* |
| `people-in-stall-time` | People in Stall Time | 3 | 40 DURATION | — | `duration_scale`, `time_expr_mode`, `metric_templates` |
| `lying-down-count` | Lying Down Events | 2 (BEHAVIOURAL) | 60 COUNT | time / times | `sensitivity_scale`, `time_expr_mode`, `metric_templates` |
| `lying-down-time` | Lying Down Time | 2 | 40 DURATION | — | `duration_scale`, `time_expr_mode`, `metric_templates` |
| `light` | Light | 1 (ENVIRONMENTAL) | 80 SELECTION | — | `selectables`, `duration_scale` |
| `temperature` | Temperature | 1 | 1 DEGREES | — | `sensitivity_scale` |
| `temp-change` | Temp. Change | 1 | 1 DEGREES | — | `sensitivity_scale` |

**Findings vs the shipping client config**
- **`rolling-count` is not on the server.** The client's `alert-form-config.ts` has rules for it. Descriptor registry: do not include it; the generic fallback would render it if it ever appears.
- **`people-in-stall` (boolean) exists** and has 4 rules; the client config referenced it via a constant.
- **Category 3 (SECURITY)** is used for entering/exiting/people-in-stall — the shipping type picker only knew Behavioural / Environmental / General; these land in "General". Descriptor `category` should carry `security` as its own group (Inakshi may prefer the label "Presence" — decision D7 below).
- Every type has `interval: 3600` and a default `duration` (`00:30:00`, `00:15:00` for light, `00:00:00` for people-in-stall*).
- **Two AppMetaData keys the client never read: `time_expr_mode` and `metric_templates`** (server-side query shaping — `less_than_end_window_both` / `_combined`). The app does not need them; **stripped from the committed fixture** along with `prometheus_metric_name` / `prometheus_combined_metric_name`.

### 1.1 The scales, exactly

| slug | scale | entries (name → value) | value_unit → display_unit |
|---|---|---|---|
| `temperature` | `sensitivity_scale` | 10→10, 20→20, 30→30, 40→40 | **C → F** |
| `temp-change` | `sensitivity_scale` | 5, 10, 15, 20 | C → C |
| `lying-down-count` | `sensitivity_scale` | 1, 2, 3, 4, 5 | *(none — a count)* |
| `lying-down-time` | `duration_scale` | 15→900, 30→1800, 45→2700, 60→3600, 90→5400 | **s → m** |
| `people-in-stall-time` | `duration_scale` | 5→300, 10→600, 15→900, 20→1200 | s → m |
| `light` | `duration_scale` | 1→60, 5→300, 10→600, 20→1200, 30→1800 | s → m |
| `light` | `selectables` | `0`: Low (max 10) · `1`: High (11–5000) — `value_type: Range` | lux |

Every scale entry carries `condition: "equal_to"` — a hint the shipping client uses to match presets, not a comparator.

**Temperature is the odd one.** `value_unit: C, display_unit: F` with plain numeric names 10/20/30/40 — and the rules confirm what that means: a metric user picking "30" stores **30 °C**; an imperial user picking "30" stores **−1.1 °C with `display_value: 30`** (30 °F). *The preset labels are the same numbers in either system; the meaning follows the user's units.* This is `resolveTemperatureImperialPreset` in the shipping code, and it must be reproduced.

---

## 2. Rules — 31, covering all 9 types

Counts: light 7 · people-in-stall-time 5 · people-in-stall 4 · lying-down-time 4 · temperature 3 · temp-change 3 · lying-down-count 3 · entering-stall 1 · exiting-stall 1.

### 2.1 Storage shapes observed, per type (these become the golden tests)

| slug | condition | threshold_value | trigger_duration | query_range_duration | query_type | is_custom | is_custom_duration | notes |
|---|---|---|---|---|---|---|---|---|
| `temperature` | `>` | **30** (metric) · **−1.1 + display_value 30** (imperial) | null | null | 1 | false | **true** | °C storage; `display_value` only when imperial |
| `temp-change` | `>` 5, `>` 15, **`<` −10** | signed | null | **01:00:00 / 02:00:00** | 1 | false | true | rise = `>` positive; **drop = `<` negative** ("within any N h") |
| `lying-down-count` | `>` | 1 / 3 / 4 | null | **01:00:00** | 1 | false | true | count "within any 1 h" |
| `lying-down-time` | `>` | **1** *(single)* · **3600 / 7200** *(combined)* | **02:00:00** *(single)* · null *(combined)* | null | **1 / 2** | false | false | **two shapes**: `query_type 1` puts the time in `trigger_duration` with threshold 1; `query_type 2` (combined) puts the time in `threshold_value` **in seconds** and no trigger |
| `people-in-stall-time` | `>` (one `==` 0) | 1 *(single)* · 7200 / 9000 *(combined)* | 01:30:00 / 02:30:00 / 00:05:00 | null | 1 / 2 | false | false | same two shapes as lying-down-time |
| `people-in-stall` | `>` 1 · `==` 1 | 1 | null · 00:01:00 | null · **01:00:00** | 1 · **2** | false · **true** | messy: a boolean type with query_range and combined mode on one rule; `is_custom: true` on the `==` one |
| `light` | `==` 0/1 · `>` 0/1 | **0 / 1 = selectable index** (Low/High) | 00:01:00–00:20:00 (from duration_scale) | null | 1 | false | false | selection + trigger |
| `entering-stall` / `exiting-stall` | `>` | 1 | null | null | 1 | false | true | boolean, no durations |

**Confirmed shipping behaviours** (plan §3.3): duration storage in **seconds** for the combined shape (not minutes as the client comment suggested — 3600 = 1 h); `is_custom_duration: true` when the type has no duration scale; `display_value` only when imperial and different; temp-change sign carries direction; `query_type` 2 = combined.

**Correction to the plan/architecture:** I wrote "duration → minutes". **The combined-shape `threshold_value` is in seconds** (`duration_scale.value_unit: s`). `trigger_duration` / `query_range_duration` are `HH:MM:SS`. Fix in `payload.ts`; the golden tests will hold it.

### 2.2 Windows
- 28 of 31 rules: `11:30:00 → 18:00:00` UTC = **06:30 → 13:00 Chicago (CDT)** — plausible barn hours, set from a device in the barn's zone during summer. **After the November clock change these read 05:30 → 12:00** — a live example of the drift the design detects (once metadata exists).
- 1 rule: `00:00:00 → 23:59:59` — the shipping "any time" as stored from a UTC-offset-0 context (or a backend default). Reads back as "any time" via `isWholeDay` **only if the barn zone is UTC** — for Chicago it converts to 19:00 → 18:59, which `fromStorage` will show as a custom overnight window. **This is correct behaviour** (that is genuinely what the backend evaluates); the footnote for old-app rules covers it.
- 1 rule: `18:30:00 → 18:37:59` — a 7-minute test window; validates that overnight/short windows must not be rejected on read.

### 2.3 Scope
- `rule_application_ids` / `rule_notification_ids` are **not returned** by the API (empty on every rule); the embedded `alert_application_rules` / `alert_notification_rules` are the source. `scope.ts` already prefers relations — correct.
- 29 rules: apply ALL, notify ALL. 2 rules: `notify_condition: 2` (INCLUDE) with one member relation. No EXCLUDE examples — the tag text for exclude is covered by unit tests, not fixtures.
- `apply_type` mostly 1 (STALL); two rules 2 (HORSE).

### 2.4 Fields not in the rewrite's `IAlertRule` type
`is_call` (boolean; a call channel?), `rule_file_deleted_at`, `deleted_by_cascade`, `created_by`, `bucket_key` (a `prometheus-rules/rule_<id>.yml` path — **null on combined-mode rules**, which suggests those are materialised differently). All server-owned. **`payload.ts` must not send `bucket_key`, `rule_file_deleted_at`, `is_call`** — passthrough of unknown keys on PATCH is a risk, not a feature. Add `is_call?: boolean` to the type as read-only.

### 2.5 `UNATTESTED_META_DATA`
Present on every rule, always `{}`. Whether PATCH persists arbitrary keys remains **unverified until the first A4 write** (architecture §7.3).

---

## 3. What A1 does with this

- Registry = **exactly these 9 slugs** + generic. `category` gains `security`.
- Presets come from the server (`sensitivity_scale` / `duration_scale` / `selectables`); the registry supplies icon, threshold kind, allowed comparators, window rules, summary template, and the two-shape duration handling.
- `payload.ts` handles: °C storage + `display_value`; temp-change sign; **single vs combined duration shape** (`trigger_duration` HMS vs `threshold_value` seconds); selection index for light; boolean threshold 1; `is_custom_duration` when no scale; drop `bucket_key`/`is_call`/`rule_file_deleted_at`; PATCH drop of empty include.
- Golden tests: for each of the 31 fixture rules, `toForm` → `toPayload` reproduces every writable field.

## 4. Decisions surfaced (for Inakshi)

| # | Question | Recommendation |
|---|---|---|
| D7 | The type picker groups: server category 3 (SECURITY) holds Entering / Exiting / People in Stall. Label it **"Security"** (server's word), **"Presence"** (what it is), or fold into "General"? | **"Presence"** — customers think "who/what is in the stall", not "security" |
| D8 | `people-in-stall` (boolean) rules exist with query-range and combined mode — the shipping form allowed it. Keep allowing that combination for the boolean type, or restrict the boolean form to on/off + trigger? | **Restrict** in the new form; keep reading old rules faithfully. Fewer nonsense combinations |
