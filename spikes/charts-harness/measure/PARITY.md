# Run 2 behavioural parity

This is the evidence ledger for `PEOPLE_IN_STALL.md` §§2–7. A screenshot is
visual evidence only; interaction rows require a recording or platform trace.
`Pending` is not parity.

Raw artefacts live outside git under `spike-evidence/run2/`; stable hashes and
paths are recorded in `RUN2-MANIFEST.md`.

| Required behaviour | ECharts · Skia | Victory · Skia | Evidence needed |
|---|---|---|---|
| Seven rows, oldest day at top | Verified on normal week | Verified on normal week | Clean Release screenshots in manifest |
| Shared clock axis, required labels and overlap hiding | Verified in corrected iOS and Android Release at 100%, maximum zoom and both pan boundaries | Verified in corrected iOS and Android Release at 100% and maximum zoom | Corrected screenshots in manifest; ECharts fractional ticks now show their true minute instead of being rounded to a false hour |
| Row guides, 16 px bars, 4 px radius, 1 px minimum | Pending | Pending | Screenshot / pixel inspection |
| With Horse / Without Horse colours and legend | Verified on normal week | Verified on normal week | Clean Release screenshots in manifest |
| 10%–100% horizontal zoom limits | Verified on Android: repeated fixed-focal pinches clamp at the floor; corrected iOS maximum-zoom screenshot retained | Verified on iOS and Android for relayout and matrix: ten aggressive fixed-focal pinches remain under that focal and clamp at the floor | Corrected screenshots and recordings in manifest; physical devices remain required |
| Pan clamps inside one day | Verified on Android at both midnight boundaries | Pending | Final ECharts interaction recording and boundary screenshots in manifest |
| Exact tooltip text and two-second dismissal | Verified on Android Release | Pending | ECharts screenshot + dismissal recording; exact formatter remains pinned by domain tests |
| Near-tap hint: “Zoom to click” within one hour | **Failed: not implemented** | **Failed: not implemented** | Live empty-space tap produced no hint; implement renderer-independent behavior before parity can pass |
| Quiet week remains seven empty rows with legend | Verified on Android Release | Pending | ECharts screenshot |
| No-data overlay; no stale rows, legend or tooltip | Verified on Android Release | Pending | ECharts transition recording + screenshot |
| Loading presentation; no stale chart | Verified on Android Release | Pending | ECharts transition recording + screenshot |
| Error copy; no stale chart | Verified on Android Release | Pending | ECharts transition recording + screenshot |
| Overnight intervals split at the correct day edge | Verified on Android: both midnight halves selectable with exact tooltips | Pending | ECharts right-edge and left-edge tooltip screenshots |
| Spring-forward clock grammar retained | Pending | Pending | Screenshot + domain test |
| Fall-back overlap remains distinguishable | Pending | Pending | Screenshot + design note |
| Organization-zone labels retained | Pending | Pending | Domain test + screenshot |
| Parent ScrollView does not steal chart pinch/pan | Pending | Pending | Interaction recording |
| Background → foreground remount is correct | Pending | Pending | Transition recording + memory trace |
| Native semantic summary exists | Android tree captured | Clean Android raw tree captured | Automated layer retained; spoken testing deferred |
| Native interval semantics contain series/date/time/count | Android tree captured | Clean Android raw tree captured | Automated layer retained; spoken testing deferred |
| Semantic nodes remain bounded and pageable | Unit tests + 20-node normal tree | Unit tests | Automated guard retained; spoken testing deferred |
| Phone | Corrected iOS and Android Release screenshots plus Android zoom/pan recording | Corrected iOS and Android Release screenshots plus repeated-pinch recordings | Physical-device evidence still required |
| Tablet layout | Prior Release screenshot; axis fix needs rebuild | Prior Release screenshot; shared fix needs rebuild | Interaction still pending; physical tablet is a decision gate |

## Open product-design call

The fall-back day repeats 1 AM. The shared clock grammar intentionally overlays
both occurrences. The adapter must keep both intervals distinguishable; whether
the axis also says “1 AM ×2” remains a product-design decision and cannot be
scored as implemented until resolved.

## Corrected ECharts fractional-label defect

The first corrected Android build exposed a separate ECharts-adapter error at
maximum zoom: the formatter rounded every generated value-axis tick to the
nearest hour. A 12:30 PM tick could therefore be labelled 1 PM, and adjacent
ticks could display the same clock time. The first attempted correction hid
all fractional ticks and failed Release readback because ECharts legitimately
regenerates non-whole-hour ticks after `dataZoom`.

The final formatter labels the actual generated time, including minutes when
needed, and retains the midnight endpoints. Unit tests cover whole hours,
fractional hours, floating-point noise and both day bounds. A fresh isolated
Android Release shows truthful regenerated labels at the zoom floor and one
midnight label at each pan boundary. The failed rounded-label screenshot and
recording remain in the manifest.

## Corrected Victory cumulative-pinch defect

The first corrected Victory Release build exposed a real adapter defect: one
pinch stayed centred, but later pinches drifted toward the end of the day in
both render modes. The failed screenshots are retained in the manifest. The
installed Victory Native pinch handler composes a new scale around the raw
screen focal point on the wrong side of the existing transform, so that focal
point is treated as an untransformed chart coordinate after the first pinch.

The harness now supplies a screen-space cumulative pinch through Victory's
public `customGestures` hook. Android then exposed two further clamp defects
that the lighter iOS sequence did not reach. First, reducing an overshooting
scale reused translation calculated for the larger scale and snapped to a day
edge. Second, Android did not provide a reliable focal point in `onBegin`; the
clamp now uses the latest active `onChange` focal instead. Both failed attempts
are retained.

Four pure math tests pin focal-point invariance, repeat-centre invariance, the
10% clamp and overshoot rebasing. Fresh isolated Release builds and recordings
on iOS and Android verify ten aggressive fixed-focal pinches for both
`relayout` and `matrix`. This restores simulator/emulator interaction parity;
it is not performance or physical-device evidence.

## Blocked decision evidence

- Observed-heavy anonymised QA response: unavailable.
- Physical mid-range Android, modern Android, iPhone and tablet: unavailable.
- No renderer recommendation may be issued until the required evidence lands.
