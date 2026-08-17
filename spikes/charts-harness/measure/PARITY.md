# Run 2 behavioural parity

This is the evidence ledger for `PEOPLE_IN_STALL.md` §§2–7. A screenshot is
visual evidence only; interaction rows require a recording or platform trace.
`Pending` is not parity.

Raw artefacts live outside git under `spike-evidence/run2/`; stable hashes and
paths are recorded in `RUN2-MANIFEST.md`.

## Current ceiling-gate outcome — physical Redmi Note 12

| Finalist | Accuracy at 6,720 intervals | Useful-content / interaction gate | Status |
|---|---|---|---|
| ECharts · Skia | Exact fixture retained | Three unrecoverable interaction freezes, including LOD on | Rejected |
| Victory · Skia | Exact alternating series retained after batching | Recovers, but initial layout remains 5.7–6.4 seconds; final bounded remediation measured 5,770 ms | Does not pass yet |

An interval-merging Victory attempt is not accepted parity evidence: it loaded
quickly only by collapsing alternating series into solid bands. The exact
14-path implementation preserves chart meaning, but its physical Release still
misses the delayed-content gate. The protocol outcome is therefore **neither
passed** until the requirement or architecture is changed explicitly.

| Required behaviour | ECharts · Skia | Victory · Skia | Evidence needed |
|---|---|---|---|
| Seven rows, oldest day at top | Verified on normal week | Verified on normal week | Clean Release screenshots in manifest |
| Shared clock axis, required labels and overlap hiding | Verified on the final corrected Android Release at full day, intermediate zoom, maximum zoom and after pan; iOS must be rebuilt from this final source | Verified in corrected iOS and Android Release at full day and maximum zoom | Corrected screenshots in manifest; the ECharts adapter now changes its tick interval with the visible span and formats every emitted tick truthfully |
| Row guides, 16 px bars, 4 px radius, 1 px minimum | Pending | Pending | Screenshot / pixel inspection |
| With Horse / Without Horse colours and legend | Verified on normal week | Verified on normal week | Clean Release screenshots in manifest |
| 10%–100% horizontal zoom limits | Verified on Android: repeated fixed-focal pinches clamp at the floor; corrected iOS maximum-zoom screenshot retained | Verified on iOS and Android for relayout and matrix: ten aggressive fixed-focal pinches remain under that focal and clamp at the floor | Corrected screenshots and recordings in manifest; physical devices remain required |
| Pan clamps inside one day | Verified on Android at both midnight boundaries | Verified on Android for both relayout and matrix | Boundary screenshots and recordings in manifest |
| Exact tooltip text and two-second dismissal | Verified on Android Release | Verified on Android Release | Screenshots + dismissal recordings; exact formatter remains pinned by domain tests |
| Near-tap hint: “Zoom to click” within one hour | Deferred from renderer selection | Deferred from renderer selection | Shared product behavior remains a shipping-parity task; it does not distinguish the renderer finalists |
| Quiet week remains seven empty rows with legend | Verified on Android Release | Verified on Android Release | Screenshots in manifest |
| No-data overlay; no stale rows, legend or tooltip | Verified on Android Release | Verified on Android Release | Transition recordings + screenshots |
| Loading presentation; no stale chart | Verified on Android Release | Verified on Android Release | Transition recordings + screenshots |
| Error copy; no stale chart | Verified on Android Release | Verified on Android Release | Transition recordings + screenshots |
| Overnight intervals split at the correct day edge | Verified on Android: both midnight halves selectable with exact tooltips | Verified on Android: both midnight halves selectable with exact tooltips | Right-edge and left-edge tooltip screenshots |
| Spring-forward clock grammar retained | Verified on final Android Release | Verified on Android Release | Screenshots + domain tests |
| Fall-back overlap remains distinguishable | Pending | Pending | Screenshot + design note |
| Organization-zone labels retained | Verified by the shared domain tests and zoned fixture readback | Verified by the shared domain tests and zoned fixture readback | Domain tests + daylight-saving screenshots |
| Parent ScrollView does not steal chart pinch/pan | Observed live on final Android Release; still pending a retained recording because the recorder lacked `ffmpeg` | Verified by Android recording | ECharts final post-gesture screenshot; Victory recording in manifest |
| Background → foreground remount is correct | Visual unmount/remount verified on final Android Release; memory return still pending | Visual transition verified by Android recording; memory return still pending | Screenshots/recording now retained; protocol memory trace still required |
| Native semantic summary exists | Android tree captured | Clean Android raw tree captured | Automated layer retained; spoken testing deferred |
| Native interval semantics contain series/date/time/count | Android tree captured | Clean Android raw tree captured | Automated layer retained; spoken testing deferred |
| Semantic nodes remain bounded and pageable | Unit tests + 20-node normal tree | Unit tests | Automated guard retained; spoken testing deferred |
| Phone | Corrected iOS and Android Release screenshots plus Android zoom/pan recording | Corrected iOS and Android Release screenshots plus repeated-pinch recordings | Physical-device evidence still required |
| Tablet layout | Prior Release screenshot is stale; final zoom-aware axis needs rebuild | Prior Release screenshot remains valid for layout; interaction still pending | Physical tablet remains a decision gate |

## Physical catalogue checkpoint — Redmi Note 12

The renderer-wide scalability slice is separate from the People In Stall rows
above. On the physical Redmi Note 12, Victory passed the exact April joined
tooltip and the compact 68.2% / no-data distinction. Its corrected 20,000-point
continuous view remained responsive while retaining independent timestamps and
true gaps in tested adapter inputs. ECharts rendered the five static catalogue
states, but its mixed tooltip did not appear after a bounded rich-text attempt.

This is smoke and correction evidence, not performance parity. Memory return,
repeated-run smoothness, the other physical devices and the observed-heavy QA
fixture remain open.

## Open product-design call

The fall-back day repeats 1 AM. The shared clock grammar intentionally overlays
both occurrences. The adapter must keep both intervals distinguishable; whether
the axis also says “1 AM ×2” remains a product-design decision and cannot be
scored as implemented until resolved.

## Corrected ECharts axis-label defects

The first corrected Android build exposed a separate ECharts-adapter error at
maximum zoom: the formatter rounded every generated value-axis tick to the
nearest hour. A 12:30 PM tick could therefore be labelled 1 PM, and adjacent
ticks could display the same clock time. The first attempted correction hid
all fractional ticks and failed Release readback because ECharts legitimately
regenerates non-whole-hour ticks after `dataZoom`.

Two more Release readbacks then rejected superficially plausible fixes. A
truthful formatter with no density control printed all 25 hourly labels over
one another on the daylight-saving fixture. Filtering labels to selected whole
hours fixed that view but could remove every label at an intermediate zoom,
because ECharts offsets value-axis ticks after `dataZoom`. Using ECharts'
native `hideOverlap` alone removed the required midnight endpoints.

The accepted adapter instead changes the value-axis interval with the visible
span, formats every emitted tick truthfully, and retains both endpoints. Unit
tests cover whole and fractional times, floating-point noise, day bounds, and
the wide/close interval choices. A fresh isolated Android Release now retains
readable labels at full day, intermediate zoom, the 10% floor and after pan.
All rejected builds and screenshots remain in the manifest. The iOS and tablet
builds still need rebuilding from this final source before their rows pass.

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
- Physical mid-range Android: Redmi Note 12 supplied; bounded catalogue smoke
  complete, protocol interaction matrix still pending.
- Modern Android, real iPhone and physical tablet: unavailable.
- No renderer recommendation may be issued until the required evidence lands.
