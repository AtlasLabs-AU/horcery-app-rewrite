import type { Verdict } from './lying-down';

/**
 * The order rows appear in on a Behavior Tracker card.
 *
 * Inakshi, 2026-08-20: "Should be sorted by tag — all unusual tags come to the
 * top of the list. Everything below should be alphabetically sorted."
 *
 * The point is that a card can carry twenty stalls, and the two that need
 * attention must not be somewhere in the middle of an alphabetical list. The
 * shipping app sorts the same way, so this is not a new idea to customers.
 *
 * Two groups, not three. Anything that reads as a departure from normal — Low,
 * High, or a bare Unusual — floats; everything else keeps a stable alphabetical
 * order so a row does not move around under the reader between refreshes.
 *
 * NOTE for a later decision: `no-data` currently sits in the lower group with
 * the ordinary rows. A dead camera is arguably also something a barn manager
 * should see near the top, but that was not what was asked for, so it is not
 * silently assumed here.
 */

/** Verdicts that say "look at this one" and therefore lift a row to the top. */
const NEEDS_ATTENTION: ReadonlySet<Verdict> = new Set<Verdict>(['low', 'high', 'unusual']);

export function isAttentionVerdict(verdict: Verdict): boolean {
  return NEEDS_ATTENTION.has(verdict);
}

/**
 * Sorts a copy — never the caller's array, which in a `useMemo` would mutate
 * the value other renders are reading.
 *
 * Names are compared with `numeric: true` so "Stall 2" precedes "Stall 10".
 * Plain string comparison puts 10 before 2, which is the kind of thing nobody
 * notices until a customer with a big yard does.
 */
export function sortRowsByAttention<T>(
  rows: readonly T[],
  verdictOf: (row: T) => Verdict,
  nameOf: (row: T) => string,
): T[] {
  return [...rows].sort((a, b) => {
    const lift = Number(isAttentionVerdict(verdictOf(b))) - Number(isAttentionVerdict(verdictOf(a)));
    if (lift !== 0) return lift;
    return nameOf(a).localeCompare(nameOf(b), undefined, { numeric: true, sensitivity: 'base' });
  });
}
