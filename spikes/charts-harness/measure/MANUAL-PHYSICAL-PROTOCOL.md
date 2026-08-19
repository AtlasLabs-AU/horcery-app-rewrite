# Bounded manual physical interaction protocol

Date frozen: 2026-08-17, before the first corrected manual capture.

This protocol adds useful physical-device evidence after Xiaomi blocked automated
touch injection. It does **not** replace Run 2's randomized automated matrix and
does not measure touch latency. Android `gfxinfo` cannot see a JavaScript stall
that produces no frame, so frame durations and submission gaps are reported as
separate signals.

## Candidates and loads

- Isolated arm64 Android Release builds only: ECharts · Skia and Victory · Skia.
- Same corrected source graph and renderer-independent fixtures.
- Loads: dense People In Stall (374 intervals) and ceiling (6,720 intervals).
- Three runs per renderer/load, alternating renderer order between runs.

## Manual gesture sequence

After one unrecorded warm-up and a three-second settle:

1. Pinch open twice around the centre of the plot, about one second each.
2. Pause for one second.
3. Drag the plot left once, about one second.
4. Pause for one second.
5. Drag the plot right once, about one second.
6. Pause for one second.
7. Pinch closed twice around the centre, about one second each.

The same user performs every run. No screen recording, build, Metro process or
other device interaction runs during a scored capture.

## Capture

1. Verify the foreground package and on-screen renderer/load.
2. Reset `dumpsys gfxinfo` immediately before the gesture sequence.
3. Dump raw `framestats` immediately after it.
4. Generate tables with the tested `framestats.py`; never hand-type numbers.
5. Record visual corruption, app-not-responding dialogs or crashes verbatim.

## Interpretation

- An actual produced frame over 100 ms is direct threshold evidence.
- An inter-frame submission gap over 100 ms is diagnostic, not automatically a
  freeze: it can reflect JavaScript not submitting a frame or simple inactivity.
- Produced-frame count and cadence are compared only across these same bounded
  gesture instructions; manual timing prevents claiming laboratory equivalence.
- A repeated ECharts-only long-frame pattern, visible freezing, or materially
  worse user feel reopens the provisional selection.
