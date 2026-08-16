# Run 2 behavioural and accessibility parity

This is the evidence ledger for `PEOPLE_IN_STALL.md` §§2–7. A screenshot is
visual evidence only; interaction and screen-reader rows require a recording,
accessibility-tree capture or platform trace. `Pending` is not parity.

Raw artefacts live outside git under `spike-evidence/run2/`; stable hashes and
paths are recorded in `RUN2-MANIFEST.md`.

| Required behaviour | ECharts · Skia | Victory · Skia | Evidence needed |
|---|---|---|---|
| Seven rows, oldest day at top | Verified on normal week | Verified on normal week | Clean Release screenshots in manifest |
| Shared clock axis, required labels and overlap hiding | Defect found in prior Release; shared tick fix is in source, rebuild proof pending | Provisional at 100% in prior Release; shared tick fix + zoom proof pending | Rebuild and capture both at 100% + 10% |
| Row guides, 16 px bars, 4 px radius, 1 px minimum | Pending | Pending | Screenshot / pixel inspection |
| With Horse / Without Horse colours and legend | Verified on normal week | Verified on normal week | Clean Release screenshots in manifest |
| 10%–100% horizontal zoom limits | Pending | Pending | Interaction recording |
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
| Summary is reachable without canvas semantics | Android tree only; spoken proof pending | Live Android inspection only; raw + spoken proof pending | VoiceOver + TalkBack capture |
| An interval announces series, date, times and people | Android tree only; spoken proof pending | Live Android inspection only; raw + spoken proof pending | VoiceOver + TalkBack capture |
| Worst case exposes bounded, pageable native nodes | Unit tests + 20-node normal tree; ceiling tree pending | Unit tests; raw tree pending | Ceiling accessibility tree + unit test |
| Phone | Release screenshot only | Release screenshot only | Interaction recording still required |
| Tablet layout | Prior Release screenshot; axis fix needs rebuild | Prior Release screenshot; shared fix needs rebuild | Interaction still pending; physical tablet is a decision gate |

## Open product-design call

The fall-back day repeats 1 AM. The shared clock grammar intentionally overlays
both occurrences. The adapter must keep both intervals distinguishable; whether
the axis also says “1 AM ×2” remains a product-design decision and cannot be
scored as implemented until resolved.

## Blocked decision evidence

- Observed-heavy anonymised QA response: unavailable.
- Physical mid-range Android, modern Android, iPhone and tablet: unavailable.
- No renderer recommendation may be issued until the required evidence lands.
