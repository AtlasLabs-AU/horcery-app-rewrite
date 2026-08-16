import assert from 'node:assert/strict';
import test from 'node:test';

import { clockLabelAtPosition } from './axis-ticks.ts';

test('labels exact whole-hour positions', () => {
  assert.equal(clockLabelAtPosition(0), '12 AM');
  assert.equal(clockLabelAtPosition(8 / 24), '8 AM');
  assert.equal(clockLabelAtPosition(13 / 24), '1 PM');
  assert.equal(clockLabelAtPosition(1), '12 AM');
});

test('formats fractional-hour positions instead of rounding them', () => {
  assert.equal(clockLabelAtPosition(12.5 / 24), '12:30 PM');
  assert.equal(clockLabelAtPosition(23.5 / 24), '11:30 PM');
});

test('tolerates harmless floating-point noise and clamps the day endpoints', () => {
  assert.equal(clockLabelAtPosition(13 / 24 + 1e-10), '1 PM');
  assert.equal(clockLabelAtPosition(-0.1), '12 AM');
  assert.equal(clockLabelAtPosition(1.1), '12 AM');
});
