# Charts renderer — decision-day brief **v2** (corrected after Codex HOLD SCOPE, 2026-08-17)

Supersedes v1. v1 assumed an unattended automated gesture matrix that **cannot run
on this phone as configured**. Codex was right to stop. This version is executable.

Owner of the decision: Inakshi. Evidence: Codex (phone + builds), Claude (ledger,
scorecard, docs). Authority: §6a (amended 2026-08-17) and `RUN2-PROTOCOL.md`.
Ground rules unchanged: old app read-only; stage by path; nothing from `spikes/`
into `src/` until the choice is made; report faithfully.

## Ruling on Codex's eight points

| # | Point | Ruling |
|---|---|---|
| 1 | Matrix cannot run: `persist.security.adbinput=0`, no automation script | **Accepted — verified.** See blocker below. This is the day's gate. |
| 2 | Recording every run contaminates the measurement | **Accepted.** One representative video per finalist, outside the scored runs. |
| 3 | `gfxinfo` cannot measure input latency | **Accepted in substance, corrected in detail.** `framestats` does carry `OLDEST_INPUT_EVENT`/`NEWEST_INPUT_EVENT` alongside `FRAME_COMPLETED`, so input-event-to-frame-completed is real, not invented. It is **not** end-to-end touch-to-photon. Report it under its exact definition or not at all; do not claim the latter. Perfetto only if it is free. |
| 4 | Zero-based axis for Victory only would be unfair | **Rejected on the evidence, principle affirmed.** ECharts' mixed chart *already* renders 0–35 kg (its bar-series default); Victory's floats at ≈7–8 kg. Fixing Victory removes an existing asymmetry rather than creating one. Correct action: set the zero baseline **explicitly on both**, so the rule is stated rather than inherited from one library's default. |
| 5 | Do not drop the dense fixture | **Accepted.** Restore dense; 7 reps if automation works, 3 if time is tight. |
| 6 | Memory checkpoints are not implemented | **Accepted.** Needs a defined same-process sequence from a clean launch (below). |
| 7 | §6a still contradicts the brief | **Accepted — done.** §6a amended 2026-08-17: device scope, observed-heavy gap, loser-removal timing. |
| 8 | Do not delete the loser on decision day | **Accepted.** §6a says "before production work", which I over-read as decision day. Retain loser + evidence until the winner passes integration; removal is a separate verified commit. |

## Confirmed blocker — read this first

Verified on the connected device (`aff3a173`, model `23021RAAEG`, Android 15):

```
persist.security.adbinput = 0
adb shell input keyevent 0
  → java.lang.SecurityException: Injecting input events requires the caller
    ... to have the INJECT_EVENTS permission.
```

Input injection is blocked outright — this is Xiaomi's MIUI/HyperOS restriction, not
a script bug. Every automated-gesture route through the shell (adb `input`, argent's
Android gestures, `am instrument`-launched UiAutomator) inherits the shell UID's
restriction and fails the same way. The earlier catalogue taps were done by hand;
`screenshots/manual-sweep/` records that honestly.

**Fix (Inakshi's action — it is a device setting, and it needs an account):**
Developer options → enable **"USB debugging (Security settings)"**. On MIUI/HyperOS
this requires being signed into a Xiaomi account on the phone, and sometimes a SIM
and mobile data. It takes a few minutes and flips `persist.security.adbinput` to 1.
If the phone is borrowed, signing an account into it is Inakshi's call, not mine —
I will not create or enter account credentials.

**If it cannot be enabled, the objective gesture matrix does not exist today.** Say
so plainly; do not relabel a lesser measurement as the matrix.

## Sequence

### 0. Preflight — first 30 minutes, before rebuilding anything
Enable the setting, then prove injection end-to-end: `adb shell input swipe` and a
two-finger pinch via `sendevent`/instrumentation against the harness, confirmed by a
visible zoom change. **Go / no-go decision at the 30-minute mark.**

- **GO** → full sequence below.
- **NO-GO** → drop to the reduced day: like-for-like accuracy fixes, fresh verified
  builds, mount/memory sequence (no gestures needed), manual parity taps, Inakshi's
  blind feel test, one representative hand-driven video per finalist. Outcome is a
  **lower-confidence recommendation** that states exactly which gate is unmeasured.
  An in-app scripted-transform driver is an acceptable *diagnostic* substitute if it
  is cheap, but it is not a touch measurement and must never be scored as one.

### 1. Like-for-like accuracy fixes (emulator; small purpose-separated commits)
- ECharts mixed tooltip: `triggerOn: 'click'` (try `trigger: 'axis'`, then `'item'`)
  — the settings the People In Stall tooltip already proves. One phone tap to confirm.
- Victory mixed: explicit zero-based y domain, x `domainPadding`, legend,
  `formatYLabel` with unit. **Also set the zero baseline explicitly on ECharts** so
  both are stated, not inherited.
- Victory continuous: `tickValues` from the shared `axis-ticks.ts`.
- Manifest: add ECharts physical APK/screenshot rows with SHA-256; fix the misnamed
  `developer-options-after-toggle.png`.

### 2. Fresh isolated builds from one commit
Separate package ids, visible renderer label, forced JS-bundle task, bundle audit,
hashes recorded. Verify foreground package + on-screen label before any measurement.

### 3. Measurement (nothing else running on the Mac)
- **Interaction matrix** (GO only): randomised finalist order; 7 reps ×
  normal + dense + ceiling; fixed gesture script; `gfxinfo`/`framestats` per rep →
  median and p95 frame time, inter-frame gaps, >100 ms freezes, and
  input-event-to-frame-completed under that exact name. **No screen recording during
  scored runs.**
- **Memory sequence** (both modes): from a clean launch, one process —
  PSS at 0 remounts → ×10 → PSS → ×15 more (25) → PSS → ×25 more (50) → PSS.
  Same fixture, same order, both finalists. This answers §6a's "substantially
  returns after 10 cycles" gate.
- **Video**: one representative run per finalist, captured separately, unscored.
- Raw logs + hashes → `spike-evidence/run2/physical-redmi-note-12/matrix/`.
  Tables generated from raw files, never typed.

### 4. Inakshi — 15 minutes, any time after the builds land
Blind feel test: both builds, worst-case data, unlabelled order, two minutes each.

### 5. Scorecard (Claude)
Gates first, then 30/25/20/15/10. Every unmeasured cell shown as unmeasured, with
the device-scope and observed-heavy gaps stated. A "too close to separate" outcome
remains legitimate and, if reached, the cost ledger decides.

## After the decision
Winner's adapter moves into `src/components/charts` behind the existing domain seam.
Loser and evidence retained until that integration passes; removal is a separate
verified commit. Catalogue 20k memory cycling, the deferred cosmetic items, and the
observed-heavy re-measurement become the first tickets against the winner.
