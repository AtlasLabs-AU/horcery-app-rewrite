# Independent review — Codex commit `a9087f0` (physical-phone catalogue pass), 2026-08-17

Reviewer: Claude (independent, read the commit, the four measure/*.md files, the
adapter code, the tests, and the raw screenshots under
`Horcery/spike-evidence/run2/physical-redmi-note-12/`). Requirements authority:
`Horcery_App_Rewrite_Requirements.md` §6a. Nothing below is a renderer choice.

## Verdict in one paragraph

The work is honest and the domain seam did its job (an adapter was replaced under
Victory without changing chart meaning). But two of the headline findings are not
yet like-for-like and must not stand as evidence in their current form: (1) the
"ECharts tooltip failed on the phone" was tested with different tooltip settings
from the ECharts tooltip that already works in the People In Stall timeline, and
(2) "Victory passed the mixed tooltip" is true of the tooltip text only — the
same screenshot shows four accuracy/parity defects in Victory's mixed chart that
were not recorded, one of which (bars not starting at zero) is squarely inside
the §6a accuracy gate. Fix both sides to the same standard, then use the phone —
while it is here — for the frozen People In Stall interaction matrix, which is
the actual decision evidence and has still not been captured.

## What Codex got right (keep)

- Victory 20k freeze correctly attributed to the Horcery adapter (one `yKey` per
  segment → multiplicative table), not to the library. Correction is O(n) and
  pinned by three pure tests (`victory-continuous.test.mts`). ~2.0 GB → ~220 MB PSS.
- Correction honestly booked as Victory maintenance cost (Horcery now owns exact
  segment-path drawing, on top of custom tooltip and gesture code).
- Retained ~29 MB after 20k→144 correctly *not* claimed as a leak or as return.
- Continuous fixture now offsets series-2 timestamps so index-joining is caught.
- FPS ticker removed from measurement builds; 20k fixture built lazily.
- Legacy inventory reconciled to 17; no dual-unit chart in the shipping app;
  "Zoom to click" moved out of selection scope; a11y deferral matches Inakshi's
  2026-08-16 decision in §6a.
- Nothing pushed; old app untouched; evidence outside git with hashes (Victory).

## Findings that change the record

### F1 — ECharts tooltip "failure" is not a fair test yet (blocking for the record)
- Working ECharts timeline tooltip (`echarts-timeline.tsx:144`):
  `trigger: 'item', triggerOn: 'click'`, no `renderMode` change — verified on
  Android Release earlier in Run 2.
- Failing catalogue tooltip (`echarts-catalogue.tsx:94`): `trigger: 'axis'`,
  default `triggerOn` (`mousemove|click`), and the "bounded correction" only
  toggled `renderMode: 'richText'` — the one knob the working tooltip does not use.
- Action: rebuild with `triggerOn: 'click'` (try `trigger: 'axis'` first, then
  `'item'` on the bar series), test on the emulator first (free), then the phone.
  Only if it still fails with the timeline's proven settings does "ECharts mixed
  tooltip fails on physical Android" go in the ledger.

> **Superseded 2026-08-17 (upstream evidence).** The action above stands but the
> cause is now better understood, and one instruction changes. `wuba/react-native-echarts`
> issue #16 ("Known Issues", open) documents that `SkiaChart` does not support
> `tooltip.formatter` with custom HTML, and issue #179 (open since 2024-05-30)
> reports `renderMode: 'html'` **and `'richText'` alike being ineffective**. Codex's
> "bounded correction" switched the catalogue tooltip *onto* `richText` — the mode
> reported broken. Our working timeline tooltip uses a plain **string** formatter.
> **Corrected retest: remove `renderMode: 'richText'` entirely**, keep the plain-string
> formatter (`mixedCategoryTooltip` already returns one), and set `triggerOn: 'click'`.
> If it passes, this finding is withdrawn. If it fails with the timeline's proven
> settings, it becomes a confirmed upstream-known limitation — heavier than a config
> error, because the fix is not ours to make. Full detail in
> `Charts_Spike_Scorecard_and_Cost_Ledger.md` §1a.

### F2 — Victory mixed chart has unrecorded accuracy/parity defects (blocking)
Visible in `victory-skia/mixed-before-tooltip.png` and `mixed-tooltip.png`:
1. **Bars do not start at zero.** Baseline is ~7–8 kg (the "10" gridline sits
   above the bar bottoms). Stacked bars with a non-zero baseline distort value
   meaning — this is inside the §6a accuracy gate ("identical input changes …
   values"). Fix: `domain={{ y: [0, max] }}` on `CartesianChart`.
2. **First and last bars clipped** (Jan and Dec are half-width). Fix: x
   `domainPadding` (or plot the category axis with padding).
3. **No legend** (ECharts shows Consumed / Remaining / Target / Events). §6a
   rejection gate literally says "no missing labels/legends/tooltips". Adapter
   fix — reuse the legend the continuous chart already draws.
4. **No units on the y-axis** ("30" vs ECharts "30 kg"). Fix: `formatYLabel`.
5. Minor: 12 crowded x labels ("Jan Feb", "NovDec"); use every-other-month
   labels or the shared tick logic.
All are adapter defects, cheap to fix, and each is cost-ledger evidence — record
them, fix them, re-screenshot.

### F3 — Victory continuous axis labels mislead (accuracy class)
`victory-skia/screenshots/items-144.png` and `linear-memory-20k/screen.png`:
hour labels 7 PM, 8 PM, 9 PM, 11 PM, 12 AM — 10 PM skipped, spacing not
proportional. Same defect class ECharts already had and fixed via
`axis-ticks.ts`; Victory's own timeline adapter already uses `visibleHourTicks`.
Fix: feed `tickValues` from the shared selector instead of `tickCount: 5`.
Also: render signal shows "…" on the 20k screen (never reported) — diagnostic
only, but fix so both finalists report.

### F4 — Evidence asymmetry
- Manifest lists the Victory physical APK hash and screenshots; the two ECharts
  physical APKs (`echarts-catalogue-arm64-release{,-richtext}.apk`), their
  source maps and screenshots are on disk but have **no hash/provenance rows**.
- Victory has 20k PSS numbers (220 MB) and a return-to-144 reading; ECharts
  has none. Take the same readings for ECharts on the same phone.
- `physical-redmi-note-12/developer-options-after-toggle.png` is misnamed — it
  is the ECharts continuous-144 screenshot. Rename or delete; a manifest must
  not contain a file whose name says something other than its content.

### F5 — Minor, ECharts side (record, non-blocking)
- Continuous y-axis starts at 0 °F (use `yAxis.scale: true` for observations).
- Threshold mark-line label "75" clipped at the right edge.

### F6 — Process
- `a9087f0` bundles fixtures, adapters, tests, App changes and five evidence
  docs in one commit; the handover asked for purpose-separated commits. Not
  worth rewriting; keep to the rule from here.
- "No further phone interaction is needed right now" — disagree. The phone is
  the scarce resource; the frozen People In Stall matrix is the missing
  decision evidence and it is not affected by the catalogue defects above.

## Architecture observation for the scalability score (20 %)

Under Victory, two of the four archetypes built so far are drawn by Horcery with
Skia on top of Victory's scales (timeline `RoundedRect`s; continuous segment
paths); mixed uses Victory primitives; compact uses `Pie`. Under ECharts, all
four use library primitives and the adapter is option generation (as in the
legacy app), with Horcery-owned tick maths and a tooltip still to prove.
Neither is disqualifying, but §6a excludes "a bespoke chart framework". Add a
per-archetype table to `CHART-CATALOGUE.md`: *library primitive / custom
drawing on library scales / unsupported*, per finalist. If Victory ends up
custom-drawing most archetypes, that is the scalability signal §6a asked for,
and it must be visible in the scorecard rather than buried in line counts.

## Recommended order of work

1. **Like-for-like corrections (emulator, ~half day):** F1 ECharts tooltip with
   the timeline's proven trigger settings; F2/F3 Victory adapter fixes; F5.
   Small purpose-separated commits; adapter tests where cheap (Victory y-domain
   from 0; shared tick values). Re-screenshot both catalogues on the phone;
   add ECharts rows + hashes to the manifest (F4).
2. **Symmetric memory on the phone (~1 h):** for each finalist, from a clean
   process: fresh PSS → 20k → 144, then 20k↔144 ×10 cycles, PSS at 0/5/10.
   This answers the retained-29 MB question and the "memory substantially
   returns after 10 cycles" gate for both, not one.
3. **Frozen People In Stall matrix on the Redmi (the decision evidence, ~4–5 h
   automated):** both isolated release builds (separate package ids, visible
   label, hash recorded, forced JS-bundle task, bundle audit), randomised
   order, ≥7 reps × normal/dense/ceiling, fixed gesture script, `gfxinfo` /
   `framestats` (medians, tails, inter-frame gaps, >100 ms freezes, input
   latency), memory at 0/10/25/50 mount cycles from clean processes, screen
   recordings per run. Nothing else running on the Mac.
4. **Inakshi's blind feel test (10 min):** worst-case data, both builds,
   unlabelled order.
5. **Scorecard draft** with the four devices as rows: Redmi Note 12 measured;
   modern Android / iPhone / tablet marked *unmeasured* with what the simulator
   evidence does and does not cover. If a rejection gate is hit or the margin
   is unambiguous on the Redmi, recommend; otherwise state exactly which device
   would change the answer.

Still outstanding and unchanged: the anonymised observed-heavy QA `query_range`
response (synthetic 6,720-bar ceiling stands in until it lands).
