import type { Verdict } from '@/charts/lying-down';
import { sortRowsByAttention } from '@/charts/row-order';

const row = (name: string, verdict: Verdict) => ({ name, verdict });
const order = (rows: { name: string; verdict: Verdict }[]) =>
  sortRowsByAttention(rows, (r) => r.verdict, (r) => r.name).map((r) => r.name);

/**
 * Inakshi, 2026-08-20: "all unusual tags come to the top of the list. Everything
 * below should be alphabetically sorted."
 *
 * The reason is a card with twenty stalls on it: the two that need attention
 * must not be buried in the middle of an alphabetical list.
 */
describe('sortRowsByAttention', () => {
  it('lifts every departure from normal above the ordinary rows', () => {
    expect(
      order([
        row('Apollo', 'usual'),
        row('Willow', 'low'),
        row('Bubbles', 'usual'),
        row('Juniper', 'high'),
      ]),
    ).toEqual(['Juniper', 'Willow', 'Apollo', 'Bubbles']);
  });

  it('sorts alphabetically inside each group, so rows do not wander', () => {
    expect(order([row('Storm', 'low'), row('Apollo', 'low')])).toEqual(['Apollo', 'Storm']);
  });

  it('orders stall numbers the way a person counts them', () => {
    // Plain string comparison puts "Stall 10" before "Stall 2" — invisible until
    // a customer has more than nine stalls.
    expect(
      order([
        row('Stall 10 · Pepper', 'usual'),
        row('Stall 2 · Storm', 'usual'),
        row('Stall 1 · Apollo', 'usual'),
      ]),
    ).toEqual(['Stall 1 · Apollo', 'Stall 2 · Storm', 'Stall 10 · Pepper']);
  });

  it('treats a bare unusual as needing attention too', () => {
    expect(order([row('Apollo', 'usual'), row('Zephyr', 'unusual')])).toEqual([
      'Zephyr',
      'Apollo',
    ]);
  });

  it('does not lift a row we simply cannot judge', () => {
    // `unknown` and `no-data` are absences of a verdict, not verdicts. Floating
    // them would make "we do not know" look like an alarm.
    expect(
      order([row('Willow', 'low'), row('Apollo', 'no-data'), row('Bubbles', 'unknown')]),
    ).toEqual(['Willow', 'Apollo', 'Bubbles']);
  });

  it('leaves the caller array untouched', () => {
    // A useMemo returning a sorted copy must not mutate what other renders read.
    const rows = [row('Zephyr', 'usual'), row('Apollo', 'low')];
    sortRowsByAttention(rows, (r) => r.verdict, (r) => r.name);
    expect(rows.map((r) => r.name)).toEqual(['Zephyr', 'Apollo']);
  });
});
