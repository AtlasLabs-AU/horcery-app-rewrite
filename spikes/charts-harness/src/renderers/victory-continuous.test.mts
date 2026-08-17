import assert from 'node:assert/strict';
import test from 'node:test';

import type { ContinuousObservationChart } from '../../../../src/charts/chart-catalogue.ts';
import { buildVictoryContinuousTable } from './victory-continuous.ts';

const chart: ContinuousObservationChart = {
  kind: 'continuous',
  title: 'Independent sensors',
  zone: 'America/Chicago',
  unit: '°F',
  threshold: 75,
  series: [
    {
      id: 'stall',
      label: 'Stall',
      points: [
        { at: 100, value: 70 },
        { at: 300, value: null },
        { at: 500, value: 72 },
      ],
    },
    {
      id: 'barn',
      label: 'Barn',
      points: [
        { at: 200, value: 68 },
        { at: 400, value: 69 },
      ],
    },
  ],
};

test('keeps independently sampled values on their original timestamps', () => {
  const table = buildVictoryContinuousTable(chart);

  assert.deepEqual(
    table.lines.flatMap((line) => line.points.map((point) => [line.seriesId, point.at, point.value])),
    [
      ['stall', 100, 70],
      ['stall', 500, 72],
      ['barn', 200, 68],
      ['barn', 400, 69],
    ],
  );
});

test('uses separate paths on either side of a true null gap', () => {
  const table = buildVictoryContinuousTable(chart);

  assert.deepEqual(
    table.lines.map(({ seriesId, points }) => ({ seriesId, timestamps: points.map((point) => point.at) })),
    [
      { seriesId: 'stall', timestamps: [100] },
      { seriesId: 'stall', timestamps: [500] },
      { seriesId: 'barn', timestamps: [200, 400] },
    ],
  );
});

test('keeps the scale table linear instead of multiplying rows by gap segments', () => {
  const table = buildVictoryContinuousTable(chart);

  assert.equal(table.data.length, 6);
  assert.ok(table.data.every((row) => Object.keys(row).sort().join(',') === 'domainValue,x'));
  assert.equal(table.data.filter((row) => row.domainValue === 75).length, 2);
});
