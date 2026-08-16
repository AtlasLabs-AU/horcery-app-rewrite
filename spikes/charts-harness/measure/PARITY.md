# Run 2 behavioural parity

This is the evidence ledger for `PEOPLE_IN_STALL.md` §§2–7. A screenshot is
visual evidence only; interaction rows require a recording or platform trace.
`Pending` is not parity.

Raw artefacts live outside git under `spike-evidence/run2/`; stable hashes and
paths are recorded in `RUN2-MANIFEST.md`.

| Required behaviour | ECharts · Skia | Victory · Skia | Evidence needed |
|---|---|---|---|
| Seven rows, oldest day at top | Verified on normal week | Verified on normal week | Clean Release screenshots in manifest |
| Shared clock axis, required labels and overlap hiding | Verified in corrected iOS Release at 100% and maximum zoom | Verified in corrected iOS Release at 100% and maximum zoom | Corrected screenshots in manifest; Android rebuild still pending |
| Row guides, 16 px bars, 4 px radius, 1 px minimum | Pending | Pending | Screenshot / pixel inspection |
| With Horse / Without Horse colours and legend | Verified on normal week | Verified on normal week | Clean Release screenshots in manifest |
| 10%–100% horizontal zoom limits | Provisional on iOS: maximum-zoom screenshot retained; interaction recording pending | Verified on iOS for relayout and matrix: four repeated centred pinches remain centred and clamp at the floor | Corrected screenshots and Victory recordings in manifest; Android proof pending |
| Pan clamps inside one day | Pending | Pending | Interaction recording |
| Exact tooltip text and two-second dismissal | Pending | Pending | Recording + accessibility label |
| Near-tap hint: “Zoom to click” within one hour | Pending | Pending | Interaction recording |
| Quiet week remains seven empty rows with legend | Pending | Pending | Screenshot |
| No-data overlay; no stale rows, legend or tooltip | Pending | Pending | Transition recording |
| Loading presentation; no stale chart | Pending | Pending | Transition recording |
| Error copy; no stale chart | Pending | Pending | Transition recording |
| Overnight intervals split at the correct day edge | Pending | Pending | Screenshot |
| Spring-forward clock grammar retained | Pending | Pending | Screenshot + domain test |
| Fall-back overlap remains distinguishable | Pending | Pending | Screenshot + design note |
| Organization-zone labels retained | Pending | Pending | Domain test + screenshot |
| Parent ScrollView does not steal chart pinch/pan | Pending | Pending | Interaction recording |
| Background → foreground remount is correct | Pending | Pending | Transition recording + memory trace |
| Native semantic summary exists | Android tree captured | Live Android inspection; clean raw tree optional | Automated layer retained; spoken testing deferred |
| Native interval semantics contain series/date/time/count | Android tree captured | Live Android inspection; clean raw tree optional | Automated layer retained; spoken testing deferred |
| Semantic nodes remain bounded and pageable | Unit tests + 20-node normal tree | Unit tests | Automated guard retained; spoken testing deferred |
| Phone | Corrected iOS Release screenshot; recording pending | Corrected iOS Release screenshots plus repeated-pinch recordings | Android and physical-device evidence still required |
| Tablet layout | Prior Release screenshot; axis fix needs rebuild | Prior Release screenshot; shared fix needs rebuild | Interaction still pending; physical tablet is a decision gate |

## Open product-design call

The fall-back day repeats 1 AM. The shared clock grammar intentionally overlays
both occurrences. The adapter must keep both intervals distinguishable; whether
the axis also says “1 AM ×2” remains a product-design decision and cannot be
scored as implemented until resolved.

## Corrected Victory cumulative-pinch defect

The first corrected Victory Release build exposed a real adapter defect: one
pinch stayed centred, but later pinches drifted toward the end of the day in
both render modes. The failed screenshots are retained in the manifest. The
installed Victory Native pinch handler composes a new scale around the raw
screen focal point on the wrong side of the existing transform, so that focal
point is treated as an untransformed chart coordinate after the first pinch.

The harness now supplies a screen-space cumulative pinch through Victory's
public `customGestures` hook. Three pure math tests pin focal-point invariance,
repeat-centre invariance, and the 10% clamp. A fresh isolated iOS Release build
and two recordings verify the same four-pinch sequence for `relayout` and
`matrix`. This restores iOS interaction parity; it is not performance evidence.

## Blocked decision evidence

- Observed-heavy anonymised QA response: unavailable.
- Physical mid-range Android, modern Android, iPhone and tablet: unavailable.
- No renderer recommendation may be issued until the required evidence lands.
