import assert from 'node:assert/strict';
import test from 'node:test';

import {
  clampHorizontalTransform,
  composeScreenSpacePinch,
} from './victory-transform.ts';

const domainAtPixel = (pixel: number, transform: { k: number; tx: number }) =>
  (pixel - transform.tx) / transform.k;

test('a second pinch preserves the data coordinate under its screen-space focal point', () => {
  const first = composeScreenSpacePinch({ k: 1, tx: 0 }, 2, 200);
  const focal = 210;
  const before = domainAtPixel(focal, first);
  const second = composeScreenSpacePinch(first, 2, focal);

  assert.deepEqual(first, { k: 2, tx: -200 });
  assert.equal(domainAtPixel(focal, second), before);
  assert.deepEqual(second, { k: 4, tx: -610 });
});

test('repeated centred pinches remain centred', () => {
  const centre = 180;
  const first = composeScreenSpacePinch({ k: 1, tx: 0 }, 2, centre);
  const second = composeScreenSpacePinch(first, 2, centre);

  assert.equal(domainAtPixel(centre, first), centre);
  assert.equal(domainAtPixel(centre, second), centre);
});

test('zoom and pan clamp to the catalogue 10 percent minimum span', () => {
  assert.deepEqual(
    clampHorizontalTransform({ k: 20, tx: -10_000 }, 20, 380, 0.1),
    { k: 10, tx: -3420 },
  );
  assert.deepEqual(
    clampHorizontalTransform({ k: 4, tx: 500 }, 20, 380, 0.1),
    { k: 4, tx: -60 },
  );
});
