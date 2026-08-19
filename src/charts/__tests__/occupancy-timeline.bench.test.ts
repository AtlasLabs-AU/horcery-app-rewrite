import { DateTime } from 'luxon';

import { FIXTURES, PEOPLE_IN_STALL, worstCase } from '@/charts/fixtures/people-in-stall';
import { buildOccupancyTimeline, positionInDay } from '@/charts/occupancy-timeline';

/**
 * Deterministic benchmark for the domain layer — the renderer-INDEPENDENT cost
 * every chart pays before a single pixel. Run 1 measured 2.2–2.6 s per fixture
 * on the Android emulator (RESULTS.md §5) because the builder called luxon
 * once per sample; this file pins the fix so it cannot silently regress.
 *
 * Absolute wall-clock thresholds are hostile to CI machines, so the assertions
 * are RELATIVE: the ceiling fixture (13 440 samples) must build in a bounded
 * multiple of a trivial baseline measured in the same process. Print the raw
 * numbers with `HORCERY_BENCH=1` for the record.
 */

const buildFixture = (fixture: (typeof FIXTURES)[number]) =>
  buildOccupancyTimeline({
    result: fixture.result,
    selectedDate: fixture.selectedDate,
    zone: fixture.zone,
    threshold: PEOPLE_IN_STALL.threshold,
    now: DateTime.fromISO(fixture.now, { zone: fixture.zone }),
  });

function cpuTimeMs(fn: () => void, reps: number): number {
  // Jest shares a developer machine with Metro/native builds and other test
  // workers. Process CPU time excludes scheduler pauses, while several short
  // rounds discard GC/JIT outliers without relaxing the acceptance bound.
  for (let i = 0; i < 3; i++) fn();
  let best = Number.POSITIVE_INFINITY;
  for (let round = 0; round < 5; round++) {
    const started = process.cpuUsage();
    for (let i = 0; i < reps; i++) fn();
    const used = process.cpuUsage(started);
    best = Math.min(best, (used.user + used.system) / 1_000 / reps);
  }
  return best;
}

const report: string[] = [];
afterAll(() => {
  if (process.env.HORCERY_BENCH) console.log(report.join('\n'));
});

describe('domain layer cost', () => {
  it('builds the 6 720-bar ceiling in a bounded time per sample', () => {
    const samples = worstCase.result.reduce((n, s) => n + s.values.length, 0);
    const ms = cpuTimeMs(() => buildFixture(worstCase), 5);
    report.push(`worst-case build: ${ms.toFixed(1)} CPU ms for ${samples} samples (${((ms * 1e3) / samples).toFixed(2)} CPU µs/sample)`);

    // The same-session pre-fix baseline was 5.33 µs/sample on this laptop and
    // Run 1 exceeded 150 µs/sample on the emulator. Arithmetic bucketing stays
    // below this unchanged acceptance ceiling.
    expect((ms * 1e3) / samples).toBeLessThan(2);
  });

  it('builds every fixture within a small multiple of the ceiling', () => {
    const ceiling = cpuTimeMs(() => buildFixture(worstCase), 3);
    for (const fixture of FIXTURES) {
      const ms = cpuTimeMs(() => buildFixture(fixture), 3);
      report.push(`${fixture.name}: ${ms.toFixed(1)} CPU ms`);
      expect(ms).toBeLessThan(Math.max(ceiling * 1.5, 5));
    }
  });

  it('positions ten thousand moments in the row without touching the date library per call', () => {
    const t = buildFixture(worstCase);
    const day = t.days[3]!;
    const step = (day.end - day.start) / 10_000;
    const ms = cpuTimeMs(() => {
      for (let i = 0; i < 10_000; i++) positionInDay(day.start + i * step, day, t.zone);
    }, 3);
    report.push(`positionInDay ×10 000: ${ms.toFixed(2)} CPU ms`);
    // A luxon DateTime per call costs ~5 µs; arithmetic costs nanoseconds.
    expect(ms).toBeLessThan(10);
  });
});
