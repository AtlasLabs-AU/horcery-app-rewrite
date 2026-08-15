import {
  snapshotPage,
  snapshotPageCount,
  snapshotPages,
} from '@/components/for-you/snapshot-paging';

/**
 * The Snapshots truncation bug, held shut.
 *
 * §6b finding 6: `snapshots.slice(0, columns)` rendered the first page and
 * threw the rest away while page dots claimed they existed. The test that
 * matters is not "page 2 shows items 3 and 4" — it is the invariant that no
 * stall can be dropped, at any list length, at any column count. So the central
 * case here is exhaustive rather than illustrative.
 */
describe('snapshot paging', () => {
  const items = (n: number) => Array.from({ length: n }, (_, i) => `stall-${i}`);

  it('never loses or duplicates a stall — every length, every column count', () => {
    for (let columns = 1; columns <= 6; columns++) {
      for (let length = 0; length <= 40; length++) {
        const source = items(length);
        const flattened = snapshotPages(source, columns).flat();

        // Exactly the input, in order. This single assertion is the whole
        // point of the module: it is false for `slice(0, columns)` at every
        // length greater than `columns`.
        expect(flattened).toEqual(source);
      }
    }
  });

  it('reports the page count the dots draw, and never fewer than one', () => {
    expect(snapshotPageCount(0, 2)).toBe(1); // an empty card still has a page
    expect(snapshotPageCount(1, 2)).toBe(1);
    expect(snapshotPageCount(2, 2)).toBe(1);
    expect(snapshotPageCount(3, 2)).toBe(2);
    expect(snapshotPageCount(8, 3)).toBe(3);
  });

  it('agrees with the pages it actually produces', () => {
    // The dots and the content are drawn from two different calls; if these
    // ever disagree the customer sees a dot for a page that renders nothing.
    for (let columns = 1; columns <= 5; columns++) {
      for (let length = 0; length <= 25; length++) {
        expect(snapshotPages(items(length), columns)).toHaveLength(
          snapshotPageCount(length, columns),
        );
      }
    }
  });

  it('gives the last page its remainder rather than padding or dropping it', () => {
    const pages = snapshotPages(items(7), 3);

    expect(pages).toHaveLength(3);
    expect(pages[2]).toEqual(['stall-6']); // one item, not three, not none
  });

  it('selects the requested page', () => {
    const source = items(6);

    expect(snapshotPage(source, 2, 0)).toEqual(['stall-0', 'stall-1']);
    expect(snapshotPage(source, 2, 1)).toEqual(['stall-2', 'stall-3']);
    expect(snapshotPage(source, 2, 2)).toEqual(['stall-4', 'stall-5']);
  });

  it('clamps an out-of-range page instead of blanking the card', () => {
    const source = items(4);

    // Rotating a tablet to landscape raises the column count and so lowers the
    // page count. If the retained page index then fell off the end, the card
    // would go empty — which reads as "no stalls", not "wrong page".
    expect(snapshotPage(source, 4, 3)).toEqual(source);
    expect(snapshotPage(source, 2, -1)).toEqual(['stall-0', 'stall-1']);
  });

  it('survives nonsense column counts rather than hanging', () => {
    // `columns` is derived from a measured width, which is 0 on the first
    // layout pass and NaN if a dimension is missing. A naive loop steps by 0
    // here and never terminates.
    expect(snapshotPages(items(3), 0)).toEqual([['stall-0'], ['stall-1'], ['stall-2']]);
    expect(snapshotPages(items(2), Number.NaN)).toEqual([['stall-0'], ['stall-1']]);
    expect(snapshotPageCount(3, 0)).toBe(3);
  });

  it('returns one empty page for an empty list', () => {
    expect(snapshotPages([], 3)).toEqual([[]]);
    expect(snapshotPage([], 3, 0)).toEqual([]);
  });
});
