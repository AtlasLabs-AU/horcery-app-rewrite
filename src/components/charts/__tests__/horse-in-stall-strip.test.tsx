import { fireEvent, render, screen } from '@testing-library/react-native';
import { DateTime } from 'luxon';

import { monitorGapMidday, routineTurnout } from '@/charts/fixtures/horse-in-stall-behavior';
import { buildHorseInStallStrip } from '@/charts/horse-in-stall-strip';
import { HorseInStallStrip } from '@/components/charts/horse-in-stall-strip';
import type { PrometheusRangeSeries } from '@/charts/occupancy-timeline';

const ZONE = 'America/Chicago';
const HOUR = 3600;
const NOW = DateTime.fromISO('2026-08-20T05:00:00', { zone: ZONE });

function chart(result: PrometheusRangeSeries[] = routineTurnout(NOW), sourceNote?: string) {
  const data = buildHorseInStallStrip({
    result,
    selectedDate: NOW.minus({ hours: 6 }).toFormat('yyyy-MM-dd'),
    zone: ZONE,
    dayStartHour: 6,
    now: NOW,
    usualSecondsByWeekday: Object.fromEntries([1, 2, 3, 4, 5, 6, 7].map((d) => [d, 19 * HOUR])),
    entityCreatedAt: NOW.minus({ months: 6 }).toISO(),
  });
  return <HorseInStallStrip data={data} width={340} sourceNote={sourceNote} testID="strip" />;
}

const rowIds = () =>
  screen
    .getAllByTestId(/^horse-in-stall-strip-row-/)
    .map((node) => String(node.props.testID).replace('horse-in-stall-strip-row-', ''));

/**
 * Three states and no legend (Inakshi, 2026-09-05 — "it's not a dashboard").
 * These pin that the strip explains itself through the tap panel and nothing
 * else, and that today sits at the top.
 */
describe('HorseInStallStrip', () => {
  it('shows seven rows with today at the top', async () => {
    await render(chart());
    const keys = rowIds();
    expect(keys).toHaveLength(7);
    expect(screen.getByText('Today')).toBeTruthy();
    // Keys are yyyy-MM-dd; today first means descending.
    expect([...keys].sort().reverse()).toEqual(keys);
  });

  it('carries no legend or instruction line', async () => {
    await render(chart());
    expect(screen.queryByText(/colour/i)).toBeNull();
    expect(screen.queryByText(/legend/i)).toBeNull();
    expect(screen.queryByText(/not recorded/i)).toBeNull();
  });

  it('says nothing until a row is tapped, then says it in words', async () => {
    await render(chart());
    expect(screen.queryByTestId('horse-in-stall-strip-detail')).toBeNull();

    await fireEvent.press(screen.getAllByTestId(/^horse-in-stall-strip-row-/)[1]!);
    const panel = screen.getByTestId('horse-in-stall-strip-detail');
    expect(panel).toBeTruthy();
    // The wording is the absence-first wording agreed for Horse in Stall.
    expect(screen.getByText(/^Out \d/)).toBeTruthy();
  });

  it('closes the panel when anything that is not a row is tapped', async () => {
    await render(chart());
    await fireEvent.press(screen.getAllByTestId(/^horse-in-stall-strip-row-/)[1]!);
    expect(screen.getByTestId('horse-in-stall-strip-detail')).toBeTruthy();
    await fireEvent.press(screen.getByTestId('strip'));
    expect(screen.queryByTestId('horse-in-stall-strip-detail')).toBeNull();
  });

  it('reports today as ongoing, never as a finished total', async () => {
    await render(chart());
    await fireEvent.press(screen.getAllByTestId(/^horse-in-stall-strip-row-/)[0]!);
    expect(screen.getByText(/^Today · Ongoing$/)).toBeTruthy();
    expect(screen.getByTestId('horse-in-stall-strip-remaining')).toBeTruthy();
  });

  it('never presents a silent day as a horse that was out', async () => {
    await render(chart(monitorGapMidday(NOW)));
    const rows = screen.getAllByTestId(/^horse-in-stall-strip-row-/);
    // Find a silent day by its accessibility label rather than its position.
    const silent = rows.find((row) => /No data/.test(String(row.props.accessibilityLabel)));
    expect(silent).toBeTruthy();
    expect(String(silent!.props.accessibilityLabel)).not.toMatch(/Out/);
  });

  it('shows a dash and no rows when nothing came back', async () => {
    await render(chart([]));
    expect(screen.getByText('—')).toBeTruthy();
    expect(screen.queryAllByTestId(/^horse-in-stall-strip-row-/)).toHaveLength(0);
    expect(screen.getByText('No in-stall readings for this period')).toBeTruthy();
  });

  it('draws not-recorded over in-stall, and the bed only over elapsed time', async () => {
    await render(chart(monitorGapMidday(NOW)));
    const today = screen.getAllByTestId(/^horse-in-stall-strip-row-/)[0]!;
    const track = today.children[1] as unknown as {
      children: { props: { testID?: string; style: unknown } }[];
    };
    const kinds = track.children.map((child) => child.props.testID ?? 'run');
    // bed, in-stall runs, grey gaps, then the dashed remainder — in that order.
    expect(kinds[0]).toBe('horse-in-stall-strip-bed');
    expect(kinds.at(-1)).toBe('horse-in-stall-strip-remaining');
    const flat = (style: unknown) => Object.assign({}, ...([] as object[]).concat(style as object[]));
    const bed = flat(track.children[0]!.props.style) as { width: number };
    const remaining = flat(track.children.at(-1)!.props.style) as { left: number; width: number };
    expect(remaining.left).toBeCloseTo(bed.width, 5);
    expect(bed.width + remaining.width).toBeCloseTo(340 - 44, 5);
  });

  it('gives the screen reader exactly what the panel says', async () => {
    await render(chart());
    const row = screen.getAllByTestId(/^horse-in-stall-strip-row-/)[1]!;
    await fireEvent.press(row);
    const panel = screen.getByTestId('horse-in-stall-strip-detail');
    const panelText = panel.children
      .map((child) =>
        typeof child === 'string'
          ? child
          : (child as unknown as { props: { children: string } }).props.children,
      )
      .join('. ');
    expect(String(row.props.accessibilityLabel)).toBe(panelText);
  });

  it('says in words that a partly recorded day is partly recorded', async () => {
    // Cut a four-hour hole out of YESTERDAY'S barn day, so the partial day is
    // a finished one whose panel would otherwise carry only a total. NOW is
    // 05:00, an hour before rollover, so yesterday's barn day is the calendar
    // day two back.
    const raw = routineTurnout(NOW)[0]!;
    const holeFrom = NOW.minus({ days: 2 }).set({ hour: 11, minute: 40 }).toSeconds();
    const holeTo = NOW.minus({ days: 2 }).set({ hour: 15, minute: 30 }).toSeconds();
    await render(
      chart([{ ...raw, values: raw.values.filter(([t]) => t < holeFrom || t > holeTo) }]),
    );
    const rows = screen.getAllByTestId(/^horse-in-stall-strip-row-/);
    const partial = rows.find((row) =>
      /Partly recorded/.test(String(row.props.accessibilityLabel)),
    );
    expect(partial).toBeTruthy();
    // And never a guessed absence on that day.
    expect(String(partial!.props.accessibilityLabel)).not.toMatch(/Out \d/);
  });

  it('recedes the other rows while one is open', async () => {
    await render(chart());
    const rows = () => screen.getAllByTestId(/^horse-in-stall-strip-row-/);
    await fireEvent.press(rows()[2]!);
    const flat = (style: unknown) => Object.assign({}, ...([] as object[]).concat(style as object[]));
    expect((flat(rows()[2]!.props.style) as { opacity: number }).opacity).toBe(1);
    expect((flat(rows()[0]!.props.style) as { opacity: number }).opacity).toBeLessThan(1);
    expect(rows()[2]!.props.accessibilityState).toEqual({ selected: true });
  });

  it('says where the rows come from while assignment history is undated', async () => {
    await render(chart(routineTurnout(NOW), 'From Stall 4, the stall this horse is in now'));
    expect(screen.getByText(/From Stall 4/)).toBeTruthy();
  });
});
