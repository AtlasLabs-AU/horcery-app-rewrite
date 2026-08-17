#!/usr/bin/env python3
"""Turn raw `dumpsys gfxinfo <pkg> framestats` dumps into the Run 2 decision table.

    measure/framestats.py <file-or-dir> [...]      # one markdown row per file

§6a scores smoothness from platform frame data, and RUN2-PROTOCOL requires the
tables to be generated from the retained raw files rather than typed by hand.
This is that generator. It reads the PROFILEDATA blocks `gfx.sh framestats`
already saves, so no change to capture is needed.

Column layout is read from each block's own header, because it is not stable
across Android versions. On the Redmi Note 12 (Android 15) the header is the
FrameTimeline format:

    Flags,FrameTimelineVsyncId,IntendedVsync,Vsync,InputEventId,HandleInputStart,
    AnimationStart,PerformTraversalsStart,DrawStart,FrameDeadline,FrameInterval,
    FrameStartTime,SyncQueued,SyncStart,IssueDrawCommandsStart,SwapBuffers,
    FrameCompleted,DequeueBufferDuration,QueueBufferDuration,GpuCompleted,
    SwapBuffersCompleted,DisplayPresentTime,CommandSubmissionCompleted

IMPORTANT — input latency is NOT reported. The older `OldestInputEvent` /
`NewestInputEvent` timestamp columns do not exist in this format; `InputEventId`
is an identifier, not a time. The nearest available quantity,
`FrameCompleted - HandleInputStart`, starts when the app began handling the
event and therefore omits dispatch latency — the part a user actually feels. It
is printed as `handleInput→done` for diagnostics and must never be presented as
input latency. Touch-to-frame latency requires Perfetto.

Definitions used:
  frame time     FrameCompleted - IntendedVsync   (Android's own jank basis)
  over deadline  frame time > (FrameDeadline - IntendedVsync) when present,
                 else > 16.7 ms
  long frame     frame time over 100 ms; direct evidence that a produced frame
                 crossed the rejection threshold
  submission gap FrameCompleted[n] - FrameCompleted[n-1]; diagnostic only. A
                 gap may mean JavaScript did not submit a frame, or simply that
                 nothing changed. It is not labelled a freeze by this parser.

Only frames carrying Flags bit 0 (`WindowVisibilityChanged`) are excluded. The
older advice "ignore any non-zero Flags" is wrong on this device: every ordinary
frame in the Redmi Note 12 captures carries value 32 (a vendor/unknown flag not
defined in Android 15 AOSP), so discarding non-zero flags throws away the entire
sample — including, in the 20k freeze capture, the
103–160 ms frames that are the actual finding. The observed flag distribution is
printed with each run so the exclusion stays visible rather than assumed.
"""
from __future__ import annotations

import math
import sys
from pathlib import Path

NS_PER_MS = 1_000_000.0
FREEZE_MS = 100.0


def percentile(values: list[float], pct: float) -> float:
    """Nearest-rank percentile. No interpolation — these are observed frames."""
    if not values:
        return float("nan")
    ordered = sorted(values)
    rank = max(1, min(len(ordered), math.ceil(pct / 100.0 * len(ordered))))
    return ordered[rank - 1]


def parse_blocks(text: str) -> list[tuple[list[str], list[list[int]]]]:
    """Return (header, rows) for every ---PROFILEDATA--- block in a dump."""
    blocks: list[tuple[list[str], list[list[int]]]] = []
    header: list[str] | None = None
    rows: list[list[int]] = []
    inside = False

    for line in text.splitlines():
        line = line.strip()
        if line == "---PROFILEDATA---":
            if inside:
                if header:
                    blocks.append((header, rows))
                header, rows, inside = None, [], False
            else:
                inside = True
            continue
        if not inside or not line:
            continue
        if header is None:
            header = [name for name in line.split(",") if name]
            continue
        parts = [part for part in line.split(",") if part != ""]
        try:
            rows.append([int(part) for part in parts])
        except ValueError:
            continue  # a trailing or malformed line is not a frame

    if inside and header:
        blocks.append((header, rows))
    return blocks


class Summary:
    def __init__(self, label: str) -> None:
        self.label = label
        self.frames: list[float] = []
        self.gaps: list[float] = []
        self.handled: list[float] = []
        self.over_deadline = 0
        self.excluded = 0
        self.flag_counts: dict[int, int] = {}

    def add_file(self, path: Path) -> None:
        for header, rows in parse_blocks(path.read_text(errors="replace")):
            index = {name: position for position, name in enumerate(header)}
            required = ("Flags", "IntendedVsync", "FrameCompleted")
            if any(name not in index for name in required):
                print(f"  ! {path.name}: unrecognised header, skipped", file=sys.stderr)
                continue

            previous_completed: int | None = None
            for row in rows:
                if len(row) < len(header):
                    continue
                flags = row[index["Flags"]]
                self.flag_counts[flags] = self.flag_counts.get(flags, 0) + 1
                if flags & 0x1:  # WindowVisibilityChanged — not a representative frame
                    self.excluded += 1
                    previous_completed = None  # do not span an excluded frame
                    continue

                intended = row[index["IntendedVsync"]]
                completed = row[index["FrameCompleted"]]
                if completed <= 0 or intended <= 0:
                    continue

                frame_ms = (completed - intended) / NS_PER_MS
                self.frames.append(frame_ms)

                if "FrameDeadline" in index and row[index["FrameDeadline"]] > intended:
                    budget = (row[index["FrameDeadline"]] - intended) / NS_PER_MS
                else:
                    budget = 16.7
                if frame_ms > budget:
                    self.over_deadline += 1

                if previous_completed is not None and completed > previous_completed:
                    self.gaps.append((completed - previous_completed) / NS_PER_MS)
                previous_completed = completed

                # Diagnostic only — see the module docstring. Not input latency.
                if "HandleInputStart" in index:
                    handle = row[index["HandleInputStart"]]
                    if 0 < handle < completed:
                        self.handled.append((completed - handle) / NS_PER_MS)

    @property
    def long_frames(self) -> int:
        return sum(1 for frame in self.frames if frame > FREEZE_MS)

    @property
    def long_submission_gaps(self) -> int:
        return sum(1 for gap in self.gaps if gap > FREEZE_MS)

    def row(self) -> str:
        if not self.frames:
            return f"| {self.label} | no frames | | | | | | | |"
        return (
            f"| {self.label} "
            f"| {len(self.frames)} "
            f"| {percentile(self.frames, 50):.1f} "
            f"| {percentile(self.frames, 95):.1f} "
            f"| {percentile(self.frames, 99):.1f} "
            f"| {max(self.frames):.1f} "
            f"| {self.over_deadline} ({100.0 * self.over_deadline / len(self.frames):.1f}%) "
            f"| **{self.long_frames}** "
            f"| {percentile(self.gaps, 95):.1f} "
            f"| {self.long_submission_gaps} |"
        )


def collect(paths: list[str]) -> list[Path]:
    files: list[Path] = []
    for raw in paths:
        path = Path(raw)
        if path.is_dir():
            files.extend(sorted(path.rglob("*framestats*")))
        elif path.is_file():
            files.append(path)
        else:
            print(f"! not found: {path}", file=sys.stderr)
    return [f for f in files if f.is_file()]


def main(argv: list[str]) -> int:
    args = list(argv)
    if not args:
        print(__doc__)
        return 2

    files = collect(args)
    if not files:
        print("no framestats files found", file=sys.stderr)
        return 1

    # One row per file; the file name carries renderer/fixture/rep by convention.
    summaries: list[Summary] = []
    for path in files:
        summary = Summary(path.stem)
        summary.add_file(path)
        summaries.append(summary)

    print("| run | frames | p50 ms | p95 ms | p99 ms | max ms | over deadline | actual frames >100 ms | gap p95 ms | submission gaps >100 ms (diagnostic) |")
    print("|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|")
    for summary in summaries:
        print(summary.row())

    combined = Summary("**all runs**")
    for summary in summaries:
        combined.frames.extend(summary.frames)
        combined.gaps.extend(summary.gaps)
        combined.handled.extend(summary.handled)
        combined.over_deadline += summary.over_deadline
        combined.excluded += summary.excluded
        for flags, count in summary.flag_counts.items():
            combined.flag_counts[flags] = combined.flag_counts.get(flags, 0) + count
    print(combined.row())

    print()
    distribution = ", ".join(
        f"{flags}×{count}" for flags, count in sorted(combined.flag_counts.items())
    )
    print(f"Flag values seen: {distribution}.")
    print(f"Excluded {combined.excluded} frames carrying WindowVisibilityChanged (bit 0).")
    if combined.handled:
        print(
            f"Diagnostic handleInput→done p50 {percentile(combined.handled, 50):.1f} ms, "
            f"p95 {percentile(combined.handled, 95):.1f} ms — "
            "NOT input latency (excludes dispatch); do not score it."
        )
    return 0


if __name__ == "__main__":
    raise SystemExit(main(sys.argv[1:]))
