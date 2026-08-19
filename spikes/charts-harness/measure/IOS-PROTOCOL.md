# iOS simulator comparison protocol

Frozen 2026-08-18, **before any iOS numbers were collected**, at commit `44d27b1`
(includes the bounded occupancy overview and exact-zoom change).

## Why this run exists

Run 1's iOS table is the basis for the concern that "Victory did not work well on
the iPhone". That table is not trustworthy for Victory, by our own admission: its
first-paint reporter had been deleted, and its chart re-rendered once a second on
the stats ticker throughout the run. Both defects inflated Victory's cost and left
its first-paint cells blank. Both are fixed. This run re-asks the question cleanly.

## What this run can and cannot establish

**Can:** rank the two finalists against each other on the same machine, with the
same fixtures, the same gesture script and the same build settings — and detect UI
hangs, which is what "sticky" means on iOS.

**Cannot:** certify a physical iPhone. A simulator executes on the MacBook's CPU and
GPU. The available booted device is an **iPhone 17 Pro Max** — the fastest iPhone
Apple ships. A failure there is damning; an absence of failure is weak reassurance
and must be reported as such, not as a pass.

No physical iPhone or physical tablet has been tested at any point in this spike.
That gap stays open regardless of this run's outcome.

## Primary measures (decided before seeing results)

On Android the frame-count trap was decisive: ECharts scored a *perfect* frame-time
result at the ceiling precisely because it had stopped producing frames. The iOS
equivalent of that trap is reading main-thread time or CPU alone. Therefore:

1. **UI hangs** — count and duration, from the native profiler (Apple's own
   definition: the interface not responding). This is the primary signal.
2. **Main-thread time** over the gesture set.
3. **JS-thread CPU** over the gesture set.
4. **First paint**, from the now-restored harness reporter.
5. **Peak memory.**
6. **Did the chart actually change on screen during the gestures** — verified from
   before/after screenshots, not inferred from counters. A renderer that stops
   updating must not be able to score well by doing nothing.

Any renderer that stops responding, or whose chart does not visibly change across
the gesture set, fails regardless of every numeric measure.

## Loads

- **dense (374 intervals)** — the primary case. Real production measurement on
  2026-08-18 across devices sm-1275/1272/1212 found 36–350 state transitions per
  week, so 374 is representative of a busy real week. This load carries the
  decision.
- **ceiling (6,720 intervals)** — ~19× the busiest week observed. Retained as a
  stress case and as the exercise for the new overview path, **not** as a
  product-representative load. Its result is reported separately and must not be
  averaged with dense.

## Procedure, per renderer × load

1. Fresh isolated Release build; verify the on-screen renderer label and the
   foreground bundle identifier before measuring.
2. Launch clean, select the fixture, confirm on screen.
3. One unrecorded warm-up gesture set, then relaunch clean and settle 3 s.
4. Start the native profiler; run the fixed gesture script; stop the profiler.
5. Screenshot before and after the gesture set.
6. Seven repetitions. Renderer order alternated between rounds.
7. Nothing else running on the machine; no concurrent builds.

## Fixed gesture script (identical to the Android manual runs)

Pinch open ×2 about the plot centre · pause 1 s · pan left · pause 1 s ·
pan right · pause 1 s · pinch closed ×2.

Injected programmatically — the iOS simulator permits synthetic touch, unlike the
Redmi. This makes the iOS runs more repeatable than the Android manual runs, and
the two must not be compared to each other as if equally derived.

## Evidence

Raw profiler output, screenshots and hashes under
`spike-evidence/run2/ios-sim-iphone-17-pro-max/`. Tables generated from retained
files. Numbers are never hand-transcribed.
