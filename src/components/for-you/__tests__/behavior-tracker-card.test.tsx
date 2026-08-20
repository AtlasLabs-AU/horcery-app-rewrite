import { fireEvent, render, screen } from '@testing-library/react-native';

import { BehaviorTrackerCard } from '@/components/for-you/behavior-tracker-card';

/**
 * The Lying Down chart is fixture-backed until the observation API exists.
 * A monitoring chart showing invented horse data is more dangerous than a fake
 * sign-in button, because a customer has no way to tell — so these tests pin
 * both halves of the guarantee: it is off by default, and when it is on it says
 * so on screen.
 *
 * The flag is mutated on a shared mock rather than reloaded with
 * `jest.resetModules()`: re-requiring the component pulls in a second copy of
 * React and every hook call then fails as "Invalid hook call".
 */
const mockPreviews = {
  passwordResetCodeFlow: false,
  faceIdUnlock: false,
  socialSignInButtons: false,
  lyingDownSampleData: false,
  peopleInStallSampleData: false,
};

// A getter, not a value: the factory is evaluated while the component's own
// imports resolve, which is before `mockPreviews` above has been initialised.
jest.mock('@/config/previews', () => ({
  get PREVIEWS() {
    return mockPreviews;
  },
}));

/**
 * The card reads the organization's `timezone` and `chart_start_time` — the
 * customer owns the barn day, we only fall back to 6 AM. Mocked at the hook
 * boundary because the real one reaches the auth store and its native
 * key-value storage, which this test has no business booting.
 *
 * `chart_start_time: null` is the common production case: most organizations
 * never set one, so the fallback is the path worth exercising here.
 */
jest.mock('@/hooks/use-session', () => ({
  useSession: () => ({
    status: 'signed-in',
    email: 'qa@example.com',
    organization: { timezone: 'America/Chicago', chart_start_time: null },
  }),
}));

afterEach(() => {
  mockPreviews.lyingDownSampleData = false;
  mockPreviews.peopleInStallSampleData = false;
});

describe('BehaviorTrackerCard', () => {
  it('shows the placeholder, never sample data, when previews are off', async () => {
    await render(<BehaviorTrackerCard />);

    expect(screen.getByTestId('for-you-tracker-chart')).toBeTruthy();
    expect(screen.queryByText('Sample data — not this horse')).toBeNull();
    expect(screen.queryByText('Apollo')).toBeNull();
  });

  it('labels the chart as sample data so it cannot be mistaken for the horse', async () => {
    mockPreviews.lyingDownSampleData = true;

    await render(<BehaviorTrackerCard />);

    expect(screen.getByText('Sample data — not this horse')).toBeTruthy();
    // One row per horse — the design must survive a customer with several.
    expect(screen.getByText('Apollo')).toBeTruthy();
    expect(screen.getByText('Juniper')).toBeTruthy();
    expect(screen.getByText('Pepper')).toBeTruthy();
    // And the states that matter are visible without tapping anything.
    expect(screen.getAllByText('Low').length).toBeGreaterThan(0);
    expect(screen.getByText('No data')).toBeTruthy();
  });

  /**
   * Pins what each sample horse is FOR.
   *
   * Their normals are stated rather than measured from the week on screen —
   * measuring was circular and made every weekly badge read "Usual". Stated
   * numbers can drift away from the fixtures instead, which is exactly how the
   * badge contradicted its own chart twice. This is the guard: if a fixture or a
   * normal changes so the demonstration no longer demonstrates, this fails.
   */
  it('shows the states each sample horse exists to demonstrate', async () => {
    mockPreviews.lyingDownSampleData = true;
    await render(<BehaviorTrackerCard />);

    // Daily judges TODAY. Juniper had a bad day; Willow is short every day.
    expect(screen.getAllByText('Low')).toHaveLength(2);
    // Two steady horses, plus a monitor that went offline.
    expect(screen.getAllByText('Usual')).toHaveLength(2);
    expect(screen.getByText('No data')).toBeTruthy();

    await fireEvent.press(screen.getByTestId('for-you-tracker-period-weekly'));
    // Confirm the tab actually switched before reading badges off it: an
    // un-awaited press left the assertions on the daily view, still passing for
    // the wrong reason. "Today" is the weekly axis's last column.
    expect(screen.getAllByText('Today').length).toBeGreaterThan(0);

    // Weekly judges the WEEK, so Juniper's single bad day no longer shows —
    // its week was normal. Only Willow, short all week, stays Low. That
    // difference between the two tabs is the point of having both.
    expect(screen.getAllByText('Low')).toHaveLength(1);
    expect(screen.getByText('Willow')).toBeTruthy();
  });

  /**
   * One panel at a time across the whole card.
   *
   * Each row owning its own open state let five stalls show five panels at
   * once, and tapping a different row left the previous one behind — the same
   * "why does it persist" complaint in a different form (Inakshi, 2026-08-20).
   */
  it('keeps only one day panel open across every row', async () => {
    mockPreviews.peopleInStallSampleData = true;
    await render(<BehaviorTrackerCard />);
    // The card opens on Lying Down; these panels live on the People in Stall
    // weekly view, so both selections have to be made.
    await fireEvent.press(screen.getByTestId('for-you-behavior-people-in-stall'));
    await fireEvent.press(screen.getByTestId('for-you-tracker-period-weekly'));

    const rows = screen.getAllByTestId('weekly-day-0');
    expect(rows.length).toBeGreaterThan(1);

    await fireEvent.press(rows[0]!);
    expect(screen.getAllByTestId('weekly-day-detail')).toHaveLength(1);

    // A different ROW, not just a different day.
    await fireEvent.press(rows[1]!);
    expect(screen.getAllByTestId('weekly-day-detail')).toHaveLength(1);
  });

  /**
   * Inakshi, 2026-08-20: unusual tags to the top, everything below alphabetical.
   * A card can carry twenty stalls; the ones needing attention must not be
   * buried in the middle of an alphabetical list.
   */
  it('puts the rows needing attention first', async () => {
    mockPreviews.lyingDownSampleData = true;
    await render(<BehaviorTrackerCard />);

    // Read the row names in the order they are actually rendered.
    const texts: string[] = [];
    const walk = (node: any) => {
      if (typeof node?.props?.children === 'string') texts.push(node.props.children);
      (node?.children ?? []).forEach(walk);
    };
    walk(screen.root);

    // Juniper (one bad day) and Willow (short every day) are the Low rows.
    const at = (name: string) => texts.indexOf(name);
    expect(at('Juniper')).toBeLessThan(at('Apollo'));
    expect(at('Willow')).toBeLessThan(at('Apollo'));
    // ...and the untroubled rows stay alphabetical below them.
    expect(at('Apollo')).toBeLessThan(at('Bubbles'));
    expect(at('Bubbles')).toBeLessThan(at('Pepper'));
  });

  it('closes the open panel when something other than a day is tapped', async () => {
    mockPreviews.peopleInStallSampleData = true;
    await render(<BehaviorTrackerCard />);
    // The card opens on Lying Down; these panels live on the People in Stall
    // weekly view, so both selections have to be made.
    await fireEvent.press(screen.getByTestId('for-you-behavior-people-in-stall'));
    await fireEvent.press(screen.getByTestId('for-you-tracker-period-weekly'));

    await fireEvent.press(screen.getAllByTestId('weekly-day-0')[0]!);
    expect(screen.getAllByTestId('weekly-day-detail')).toHaveLength(1);

    await fireEvent.press(screen.getByTestId('weekly-detail-dismiss'));
    expect(screen.queryByTestId('weekly-day-detail')).toBeNull();
  });
});
