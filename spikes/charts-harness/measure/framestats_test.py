import tempfile
import unittest
from pathlib import Path

from framestats import Summary, parse_blocks, percentile


class FrameStatsTest(unittest.TestCase):
    def test_percentile_uses_observed_nearest_rank(self) -> None:
        values = [float(value) for value in range(1, 16)]
        self.assertEqual(percentile(values, 50), 8.0)
        self.assertEqual(percentile(values, 95), 15.0)
        self.assertEqual(percentile(values, 99), 15.0)

    def test_parses_profile_block(self) -> None:
        text = """ignored
---PROFILEDATA---
Flags,IntendedVsync,FrameDeadline,HandleInputStart,FrameCompleted,
32,1000000000,1016000000,1001000000,1020000000,
---PROFILEDATA---
"""
        self.assertEqual(
            parse_blocks(text),
            [
                (
                    ["Flags", "IntendedVsync", "FrameDeadline", "HandleInputStart", "FrameCompleted"],
                    [[32, 1_000_000_000, 1_016_000_000, 1_001_000_000, 1_020_000_000]],
                )
            ],
        )

    def test_separates_long_frames_from_submission_gaps(self) -> None:
        text = """---PROFILEDATA---
Flags,IntendedVsync,FrameDeadline,HandleInputStart,FrameCompleted,
32,1000000000,1016000000,1001000000,1020000000,
32,1016000000,1032000000,1017000000,1150000000,
1,1032000000,1048000000,1033000000,1050000000,
---PROFILEDATA---
"""
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / "sample-framestats.txt"
            path.write_text(text)
            summary = Summary("sample")
            summary.add_file(path)

        self.assertEqual(summary.frames, [20.0, 134.0])
        self.assertEqual(summary.long_frames, 1)
        self.assertEqual(summary.gaps, [130.0])
        self.assertEqual(summary.long_submission_gaps, 1)
        self.assertEqual(summary.excluded, 1)
        self.assertEqual(summary.flag_counts, {32: 2, 1: 1})


if __name__ == "__main__":
    unittest.main()
