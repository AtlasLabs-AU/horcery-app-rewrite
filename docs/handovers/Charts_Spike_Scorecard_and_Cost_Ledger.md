# Charts renderer — scorecard shell, scalability table and cost ledger

Prepared by Claude, 2026-08-17, in parallel with Codex's device work. Everything
here is derived from the adapter code, the Run 2 evidence and public upstream data.
**No performance numbers and no recommendation** — those cells are marked PENDING
and are filled only from Codex's raw logs.

---

## 1. Upstream health (new evidence — gathered today)

Codex's ledger listed "upstream cadence check pending". It is now done.

| | ECharts · Skia (`@wuba/react-native-echarts` 3.1.1 + `echarts` 6) | Victory · Skia (`victory-native` 41.26.0) |
|---|---|---|
| Live repo | `wuba/react-native-echarts` — active, 964★, 66 open issues | `FormidableLabs/victory-native-xl` — active, 1,210★, 89 open issues, maintained by Nearform |
| Last push | 2026-07-06 | 2026-07-06 |
| Latest release | 3.1.1 — 2026-07-06 (≈6 weeks ago) | 41.26.0 — 2026-06-09 (≈2 months ago) |
| Release pattern | ~3/year: 2.0.3 Mar 2025 → 3.0.0 Sep 2025 → 3.1.1 Jul 2026 | Bursty: quiet Sep 2025–May 2026, then **8 releases in 14 days** (27 May – 9 Jun 2026), silent since |
| Commits sampled (17 May – today) | 2 | 20, all inside that burst |
| Bus factor | Effectively one maintainer (`wuba_fe` / tony chen) | Team-backed (Nearform), but activity is campaign-shaped |
| Upstream verdict | Alive, slow, single-maintainer risk | Alive, better resourced, attention is intermittent |

**Trap recorded so nobody repeats it:** `FormidableLabs/victory-native` is
**archived** (last push 2024-08-15). That is the *legacy pre-41* package. The 41.x
line we are evaluating lives at `victory-native-xl`. A casual check concludes
"Victory is abandoned", which is false. I nearly filed it that way.

### 1a. Finding that changes tomorrow's first task 🔴

The ECharts mixed-tooltip failure is very likely **a known open upstream limitation
of the Skia renderer, not our settings**:

- `wuba/react-native-echarts` issue **#16 ("Known Issues", open, updated 2026-07-24)**
  documents that on `SkiaChart`, `tooltip.formatter` with custom HTML is unsupported,
  and recommends `SvgChart` as the workaround.
- Issue **#179 (open since 2024-05-30)**: "Tooltip设置为html或者richText均无效" —
  *tooltip set to `html` or `richText` is ineffective*. Still open.

Codex's "bounded correction" switched the catalogue tooltip **to** `renderMode:
'richText'` — i.e. onto the mode reported broken. Meanwhile our own People In Stall
tooltip **works on Skia** using `trigger: 'item'`, `triggerOn: 'click'` and a plain
**string** formatter.

**Therefore the corrected retest is:** remove `renderMode: 'richText'`, keep the
plain-string formatter (`mixedCategoryTooltip` already returns a `\n`-joined string),
and set `triggerOn: 'click'`. If it then works, ECharts records *no* tooltip defect
and Codex's finding is withdrawn. If it still fails with the same settings that work
in the timeline, ECharts records a **confirmed, upstream-known** interaction failure —
a much heavier mark than "our config was wrong", because the fix is not ours to make.
Either way this must be resolved before the mixed archetype is scored.

---

## 2. Whole-catalogue scalability (weight 20 %)

How each archetype is actually produced. This is what §6a means by "reject a renderer
that succeeds only by creating bespoke, duplicated adapters", and by excluding "a
bespoke chart framework".

| Archetype | ECharts · Skia | Victory · Skia |
|---|---|---|
| **Interval timeline** (People In Stall) | Library extension point — `custom` series + `renderItem`, the documented API for non-standard geometry, same shape as the legacy generator | **Custom drawing.** `CartesianChart` is used only as a coordinate system (data is two anchors that fix the domain); every bar is a hand-drawn Skia `RoundedRect` |
| **Continuous time series** | Library primitive — `line` series, `connectNulls: false`, `markLine` threshold | **Custom drawing.** O(n) scale table feeds the axes; the visible lines are hand-built `Skia.Path` segments through Victory's scales and clip (post-2 GB correction) |
| **Mixed / annotated** | Library primitives — stacked `bar` + `line` + `scatter` | Library primitives — `StackedBar` + `Line` + `Scatter` |
| **Compact / radial** | Library primitive — `gauge` series | Library primitive — `PolarChart` + `Pie.Chart` |
| **Tooltips** | Built-in (`trigger`/`triggerOn`), lazy string formatter — **pending §1a retest** | **Custom in both interactive archetypes**: raw tap gesture → invert through current zoom → JS hit-test → RN `View` |
| **Zoom / pan** | Built-in `dataZoom`, native 10–100 % span limits | **Custom**: screen-space pinch composition, overshoot clamp, translation rebasing (`victory-transform.ts`) |
| **Axis ticks** | Horcery-owned (`axisTickInterval`) | Horcery-owned (`visibleHourTicks`) — shared file, both finalists |
| **Score so far** | 4/4 archetypes on library primitives or documented extension points | **2/4 archetypes hand-drawn**, plus tooltip and zoom machinery |

**Reading:** Victory keeps meaning correct, but for the two hardest archetypes
Horcery ends up owning the drawing, the hit-testing and the gesture maths — Victory
supplies scales, clipping and axes. That is closer to "chart toolkit" than "chart
library". It is not automatically disqualifying (the results are accurate, and the
domain seam absorbed a full adapter swap without changing chart meaning), but §6a
asks precisely this question, so it belongs in the scorecard rather than in a line
count. ECharts' equivalent risk is the opposite shape: less code, but more dependence
on a single-maintainer wrapper for behaviour we cannot patch ourselves (§1a).

---

## 3. Implementation-cost ledger (weight 10 % — tie-breaker)

| Item | ECharts · Skia | Victory · Skia |
|---|---|---|
| Adapter lines | **506** (timeline 298, catalogue 208) | **777** (timeline 458, catalogue 215, transform 49, continuous 55) |
| Renderer-specific tests | 0 (shares `axis-ticks.test.mts`) | 2 files — `victory-transform.test.mts`, `victory-continuous.test.mts` (67 lines) |
| Horcery-owned interaction machinery | Tick interval maths | Tooltip hit-test, pinch composition, overshoot clamp, translation rebasing, exact segment paths |
| Defects surfaced in spike | Fractional/duplicate zoom labels (4 rejected attempts before the truthful span-dependent interval); mixed tooltip — **pending §1a** | Cumulative pinch drift; focal loss at zoom floor; index-joined series (caught by fixture); **2.0 GB adapter freeze at 20k**; mixed chart baseline/legend/units defects (F2) |
| Warnings at build/run | Wuba Skia deprecated-path warnings; `api.style()` deprecated in ECharts 6; shared `tslib` export fallback | Shared `tslib` export fallback |
| API-surface exposure | Stable, documented (`custom` series, `dataZoom`, `tooltip`) | Depends on `explicitSize` (landed **2026-05-27**, ~3 months old) and on writing `transform.matrix.value` / `useCartesianTransformContext` directly — thin ice on upgrades |
| Upstream leverage | Low — single maintainer, ~3 releases/yr, our tooltip issue already open since 2024 | Medium — Nearform-backed, but bursty attention |
| Time-to-diagnose (observed) | Label chain: 4 attempts | Pinch drift: custom maths + rebasing. 20k freeze: required a physical device, a rebuild and an adapter redesign |
| Android APK (catalogue, arm64 Release) | 43,769,248 B | 42,673,472 B (**−1.07 MB**) |
| Android APK (timeline builds, `acbd0a7`) | 125,651,811 B | 124,549,851 B (**−1.05 MB**) |
| iOS sim archive | 27,876,515 B | 27,108,558 B (**−0.77 MB**) |
| Domain contracts changed to fit the library | None | None (the 20k rewrite changed the adapter only — the seam held) |

**Reading:** Victory costs ~54 % more adapter code and owns materially more
behaviour, so its future maintenance is heavier and more of it is ours. ECharts is
cheaper to write but leans on a wrapper we cannot fix, and its size is marginally
larger. Cost is a tie-breaker only; it decides nothing unless the gates and the top
three weights come out close.

---

## 4. Rejection gates — checklist (evaluated before any scoring)

| Gate (§6a) | ECharts | Victory | Source |
|---|---|---|---|
| No crashes over repeated navigation | PENDING | PENDING | matrix + memory sequence |
| No unbounded memory growth | PENDING | PENDING (catalogue 20k→144 left +29 MB — open) | memory sequence |
| Memory substantially returns after 10 mount cycles | PENDING | PENDING | memory sequence |
| No missing labels / legends / tooltips | **PENDING §1a** (mixed tooltip) | **FAIL → fix pending** (mixed chart has no legend, no y-units) | F2 / §1a |
| No interaction freeze > 100 ms | PENDING | PENDING | framestats |
| Pan/zoom smooth under worst-case data | PENDING | PENDING | matrix, ceiling fixture |
| Charts never delay first screen content | PENDING | PENDING | matrix, launch |
| Identical data → identical domain meaning | Pass (labels corrected `cb7b261`) | **Conditional** — mixed y-axis floats off zero (F2), continuous hour labels skip 10 PM (F3); both fixable in adapter | screenshots |
| Families fit one bounded renderer-independent architecture | Pass | Pass with the §2 caveat | code |

A gate marked FAIL that is fixed and re-evidenced becomes Pass; the defect stays in
the cost ledger. Nothing here is scored until every cell is Pass or the finalist is
rejected.

---

## 5. Scorecard shell

Filled only from raw logs. Cells stay PENDING until then.

| Criterion | Weight | ECharts | Victory | Evidence |
|---|---:|---|---|---|
| Smoothness (median + p95 frame, inter-frame gaps, >100 ms freezes, input-event→frame-completed) | 30 % | PENDING | PENDING | framestats, 7 reps × normal/dense/ceiling |
| Reliability & memory (crash-free, PSS at 0/10/25/50 remounts, return) | 25 % | PENDING | PENDING | memory sequence |
| Whole-catalogue scalability | 20 % | Draft: strong (4/4 library) | Draft: weaker (2/4 hand-drawn) | §2 — final after §1a |
| Behavioural parity | 15 % | PENDING (mixed tooltip) | PENDING (after F2/F3 fixes) | PARITY.md |
| Implementation cost | 10 % | Draft: lower code, higher upstream risk | Draft: higher code, more owned behaviour | §3 |
| **Inakshi's blind feel test** | qualitative gate | PENDING | PENDING | 2 min each, unlabelled |

**Stated limitations that go in the recommendation regardless of outcome:** one
device class only (Redmi Note 12, a *current* mid-range phone, weaker as a worst-case
proxy than the "A7 class" §6a named); no modern Android, iPhone or tablet; synthetic
ceiling standing in for the observed-heavy production response; screen-reader
validation deferred by prior decision; and — if the injection preflight fails — no
objective gesture measurement at all.

**Decision rule.** Gates first. If one finalist fails a gate and the other does not,
that decides it. Otherwise apply the weights. If the weighted margin is inside the
run-to-run spread of the smoothness measurements, the honest output is "too close to
separate on this device" and the cost ledger decides — with the reasoning shown.
