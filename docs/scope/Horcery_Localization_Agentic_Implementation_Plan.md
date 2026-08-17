# Localization — Agentic Implementation Plan

How Claude implements multi-language support in the Horcery app, working as the
implementing engineer with argent as the verification loop. Written 2026-08-13,
grounded in the same-day hands-on session documented in `Horcery_App_Agent_Runbook.md`.

Scope assumption: English + Spanish + Russian + Turkmen, mobile app first, all
left-to-right. Working repo: the fin- mirror (`agent/*` branches). How finished
work reaches the engineering repo is a standing decision for Inakshi (§8).

**Terminology:** *i18n* (= **i**nternationalizatio**n**, 18 letters between i and n)
is the engineering work that makes an app *capable* of multiple languages —
catalogues, keys, plural rules, formatting. *l10n* (= **l**ocalizatio**n**) is
filling that capability with actual languages. This plan covers both: §1–§5 build
the i18n foundation with i18next + react-i18next + expo-localization (the standard
React Native / Expo stack); translated catalogues per language are the l10n payload
that drops into it.

---

## 1. The architecture (standard practice, chosen independently)

- **Library: i18next + react-i18next.** The most widely adopted i18n stack in
  React Native. Decisive for this codebase: its `t()` function works in plain
  TypeScript modules (this app generates lots of copy outside React — form
  utils, schema builders, toast helpers), it needs no build-system changes
  (this app's babel config is already order-sensitive), and its JSON catalogue
  format is understood by every translation vendor.
- **Catalogues bundled into the app, not fetched.** Barn connectivity is poor;
  language must work offline and before first render.
- **Keys, not English-as-key.** Stable IDs (`alerts.form.intensityLabel`),
  organized into namespaces roughly matching app surfaces (common, auth,
  alerts, animals, devices, settings, errors, validation, charts, media…).
  Missing keys fall back to English at runtime — partial coverage is always
  shippable, never broken.
- **One formatting module.** All dates, numbers, plurals, and list joining go
  through a single locale-aware module (backed by `Intl` + CLDR plural rules).
  An ESLint rule bans `toLocaleString`/`Intl.*`/locale-bearing Luxon calls
  everywhere else. Russian's four plural forms and Spanish's third form are
  handled by the plural engine, never by `count !== 1 ? 's' : ''`.
- **Whole-sentence keys for composed copy.** The alert-summary sentences
  ("You will be notified if…") are built by clause concatenation today. That
  dies: each sentence shape becomes one key with named placeholders that a
  translator can reorder. This decision comes first because it shapes all
  alert-related keys.
- **Language selection:** device locale on first launch → supported match or
  English; user-visible picker in Preferences; choice persisted locally and
  synced to the user profile so it follows the customer across devices.

## 2. Why an agent is unusually well-suited to this feature

Localization is the ideal agentic workload: enormous, mechanical, pattern-based,
and verifiable by machine at every step.

1. **Scale without fatigue.** Hundreds of files change in small, repetitive ways.
   Agents don't get sloppy on file #300.
2. **I read all four languages.** Post-translation screen review (does the
   Russian actually say what the English says? did anything leak untranslated?)
   normally needs multilingual QA. I do it from screenshots.
3. **The verification loop is automatable end-to-end** (argent, §4): record the
   walk once, replay it per language, diff the screenshots.
4. **Static gates catch what screenshots can't** (§5), and I can build the gates
   before doing the work they police.

## 3. Delivery in waves, one namespace at a time

**Phase 0 — Foundation (no user-visible change):**
- New `i18n` workspace package: i18next singleton, React bindings
  (react-i18next), language store (persisted + profile-synced), device-locale
  detection via **expo-localization** (official Expo package — reads the
  device's language/region; wired to i18next as its language detector, used on
  first launch only, then the user's stored choice wins), English catalogue
  scaffolding, the formatting module, CLDR plural wiring, needed polyfills
  (Hermes lacks plural-rules/list-format natively). Note: expo-localization is
  a new dependency for this app — it is not currently installed.
- The **pseudo-locale**: a fake language where every catalogued string renders
  wrapped and lengthened (`⟦Šêttîñgš~~⟧`). One glance at any screen shows
  exactly which text is catalogued (wrapped) vs hardcoded (plain English).
  This single tool converts "walk 70 screens × 4 languages" into "walk them
  once, in one locale, needing no language skills".
- ESLint gates on (§5), argent baseline flow recorded (§4).
- Language picker in Preferences, behind the scenes until coverage justifies it.

**Then, per namespace wave** (auth → settings → alerts → animals/stalls →
devices → charts → the long tail):
1. Extract strings (codemod handles the mechanical JSX cases; imperative
   copy-generating modules are migrated by hand — mine).
2. Wire screens to `t()`, English catalogue grows.
3. Static gates green (typecheck against the key tree, lint, unused-key scan).
4. argent replay in pseudo-locale → I review screenshots for plain-English
   leakage and layout breakage → fix → repeat until clean.
5. One branch per wave on the mirror (`agent/l10n-<namespace>`), small enough
   to review; commit messages inventory every key added.

**Translation ingestion is decoupled:** waves produce the English catalogue;
translated catalogues (from any vendor — the format is the industry default)
drop in whenever they arrive. When a language lands, I replay the argent flow
in that language and review every screenshot in it.

**Known hard spots, sequenced deliberately:**
- Strings captured at module load (constants files, schema definitions) — they
  evaluate before language is known; each needs conversion to lazy lookup.
  Until the last of these converts, in-app language switch = app restart.
- Alert sentence shapes before any other alert work (§1).
- Labels that double as API values (e.g. option lists sent to the backend) —
  display label and payload value must be split first or translation corrupts
  requests. I audit for this pattern in Phase 0 (grep for enum-label reuse).
- Server-supplied text (notifications, AI insight copy, event titles) is out of
  client scope; user-authored content must NEVER be translated — anywhere the
  API can't distinguish server text from customer text is a blocking backend
  question to raise early.

## 4. The argent verification loop (the "agentically" part)

This is the loop that replaces a QA team walking screens:

1. **Record once (English):** using argent's flow recording, I capture the
   golden route as a replayable flow — login → For You → org switch →
   Horses → horse detail (Summary/Events/Alerts) → Stalls → stall detail →
   Manage Alerts → create-alert wizard → Devices → Clips → Preferences.
   Selectors use the app's existing testIDs where the a11y tree exposes them;
   coordinates from screenshots where it doesn't (known gaps listed in the
   runbook §6).
2. **Replay per wave:** after each namespace lands, replay in pseudo-locale
   with full-resolution screenshots (`includeImageInContext: false`, saved as
   files). `screenshot-diff` against the English baseline flags layout
   breakage from longer text; my own read of the screenshots flags
   untranslated leakage (plain English amid wrapped pseudo-text).
3. **Replay per language:** once real catalogues land, same flow in es/ru/tk.
   I verify translation presence, fit, truncation, and — because I read the
   languages — meaning drift on critical safety copy (alerts).
4. **Switcher behavior:** scripted check that changing language in Preferences
   updates every migrated surface (and that the restart path works cleanly for
   the not-yet-converted module-load strings).

**Operating constraints (all documented in the runbook, all survivable):**
- The installed app is a release build — my code changes can't hot-reload into
  it. Verification cadence is **per wave, not per keystroke**: static gates run
  continuously; a fresh build runs per wave. Options, in preference order:
  (a) fix the local xcodebuild (one known script-phase failure — first Phase 0
  task, ~worth two hours' attempt since it unlocks fast iteration);
  (b) EAS cloud simulator build per wave (~15 min, small cost) on a
  **dedicated channel** — never the shared preview channel QA uses.
- The forced-update wall interrupts restarts on the current dev config; the
  runbook bypass (data wipe → quick login) is scripted into the loop. Password
  re-entry needs Inakshi or the argent secrets file.
- QA org data limits coverage (Clips is server-down for the QA account; some
  metrics are N/A). Screens verified for *localization* don't need live data —
  empty states are themselves strings to verify — but I'll flag any screen I
  can't reach at all.

## 5. Static gates (run in CI/lint, catch what screenshots can't)

1. **No string literals in JSX/user-visible props** (ESLint) — new hardcoded
   text can't enter migrated namespaces.
2. **Typed keys:** the English catalogue generates a TypeScript type; a typo'd
   or deleted key is a compile error, not a silent English fallback.
3. **Formatting confinement** (ESLint): locale-bearing calls only inside the
   formatting module.
4. **Catalogue parity:** every key in es/ru/tk exists in English and vice versa
   (missing = warning pre-translation, error post-translation); required plural
   forms derived from CLDR per locale, not hardcoded.
5. **Interpolation safety:** placeholders in translations must match the
   English key's placeholder set — catches translator-introduced breakage.
6. **Do-not-translate protection:** protocol strings (BLE status codes, PromQL,
   event names sent to analytics, test IDs, timezone names) live outside
   catalogues; a scan asserts none of them appear in catalogue values.

## 6. What I need from humans (small, explicit list)

| Need | From | When |
|---|---|---|
| Decision: how mirror work reaches the engineering repo (§8) | Inakshi | before wave 1 merges |
| QA password re-entry after data wipes (or secrets file) | Inakshi | recurring, seconds each |
| Dev Remote Config fix (update wall) — removes the wipe workaround entirely | dev team, 1 min | any time |
| Translated catalogues (vendor or team) | Inakshi/team | any time after each wave's English lands |
| Native-speaker review sign-off for low-resource languages (Turkmen) | team/vendor | before public exposure |
| Backend: distinguish server text from user-authored text on events | backend team | before the events namespace |

## 7. Honest risk register

- **Regression risk in English** is the real exposure (hundreds of files touched,
  repo has no test suite). Mitigations: waves small enough to review, static
  gates, per-wave argent replay *in English* as a regression pass, and the
  screenshot-diff baseline.
- **My builds can't reach the app team** (mirror has no PRs) — without §8
  resolved, the work is invisible. This is governance, not engineering.
- **Copy churn upstream:** the engineering repo moves daily; each wave rebases
  onto a fresh mirror sync before starting, and the unused-key scan catches
  strings whose source screens changed.
- **Web app** (Next.js) shares packages but has its own screens — same
  architecture applies; treat as a follow-on scope decision, not silently included.

## 8. The one decision that gates everything

I can build all of this on the mirror, verified end-to-end — but the mirror has
no pull requests and the app team doesn't look at it. Before the first wave
merges anywhere, Inakshi decides the handoff: (a) per-wave patch files the team
applies as their own PRs on the engineering repo, (b) the team grants a
write/PR path to the canonical repo, or (c) this work intentionally stays a
proof-of-capability that informs the team's own implementation. The plan is
identical in all three cases; only the destination differs.
