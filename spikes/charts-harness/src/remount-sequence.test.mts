import assert from 'node:assert/strict';
import test from 'node:test';

import { advanceRemountSequence, startRemountSequence } from './remount-sequence.ts';

test('pauses at 10, 25 and 50 remounts without changing the process', () => {
  let sequence = startRemountSequence();
  const checkpoints: number[] = [];

  while (sequence.count < 50 || sequence.phase !== 'checkpoint') {
    sequence = advanceRemountSequence(sequence);
    if (sequence.phase === 'checkpoint') {
      checkpoints.push(sequence.count);
      if (sequence.count < 50) sequence = advanceRemountSequence(sequence);
    }
  }

  assert.deepEqual(checkpoints, [10, 25, 50]);
});

test('the final checkpoint remains stable for external PSS sampling', () => {
  const final = { count: 50, phase: 'checkpoint' } as const;
  assert.deepEqual(advanceRemountSequence(final), final);
});
