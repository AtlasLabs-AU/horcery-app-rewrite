import { fireEvent, render, screen } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';

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

const mockTextScale = { stack: false };

jest.mock('@/hooks/use-text-scale', () => ({
  ...jest.requireActual('@/hooks/use-text-scale'),
  useTextScale: () => ({
    scale: mockTextScale.stack ? 1.3 : 1,
    stack: mockTextScale.stack,
  }),
}));

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
  mockTextScale.stack = false;
});

describe('BehaviorTrackerCard', () => {
  it('names the horse occupancy behaviour Horse in Stall', async () => {
    await render(<BehaviorTrackerCard />);

    await fireEvent.press(screen.getByTestId('for-you-behavior-in-stall'));

    // The compact selector uses its reserved second line rather than squeezing
    // three words together. Its spoken label and section heading stay natural.
    const tile = screen.getByTestId('for-you-behavior-in-stall');
    expect(
      tile.children.some((child: any) => child?.props?.children === 'Horse in\nStall'),
    ).toBe(true);
    expect(screen.getAllByText('Horse in Stall')).toHaveLength(2);
    expect(tile.props.accessibilityLabel).toBe('Horse in Stall');
    expect(screen.queryByText(/^In Stall$/)).toBeNull();
  });

  it('gives every behavior enough width at accessibility text sizes', async () => {
    mockTextScale.stack = true;
    await render(<BehaviorTrackerCard />);

    expect(
      StyleSheet.flatten(screen.getByTestId('for-you-behavior-selector').props.style),
    ).toMatchObject({ flexWrap: 'wrap' });

    for (const id of ['lying-down', 'people-in-stall', 'in-stall', 'feed']) {
      expect(
        StyleSheet.flatten(screen.getByTestId(`for-you-behavior-${id}`).props.style)
          .flexBasis,
      ).toBe('45%');
    }

    expect(screen.getByTestId('for-you-behavior-in-stall').props.accessibilityLabel).toBe(
      'Horse in Stall',
    );
  });

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
    // One row per horse, named stall-first: the stall is the default view
    // (Inakshi, 2026-08-20), so a camera with no horse assigned still appears.
    expect(screen.getByText('Stall 4 · Apollo')).toBeTruthy();
    expect(screen.getByText('Stall 7 · Juniper')).toBeTruthy();
    expect(screen.getByText('Stall 9 · Pepper')).toBeTruthy();
    // The states we can PROVE are visible without tapping anything. Deviation
    // verdicts are withheld (Inakshi, 2026-08-23) — "No data" is a fact about
    // the readings, "Low" would be a judgement on an unowned threshold.
    expect(screen.getByText('No data')).toBeTruthy();
    expect(screen.queryByText('Low')).toBeNull();
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
  it('shows the data states it can prove, and withholds the ones it cannot', async () => {
    mockPreviews.lyingDownSampleData = true;
    await render(<BehaviorTrackerCard />);

    // Usual / Low / High all rest on the 25% threshold, which nobody owns and
    // which flags a quarter to two-thirds of ordinary days when measured
    // against 45 days of real monitor data. None of them may appear.
    for (const verdict of ['Usual', 'Low', 'High', 'Unusual']) {
      expect(screen.queryByText(verdict)).toBeNull();
    }

    // What survives is everything the row can back: the horse, its figure,
    // its average, and the honest data states.
    expect(screen.getByText('Stall 4 · Apollo')).toBeTruthy();
    expect(screen.getByText('No data')).toBeTruthy();

    await fireEvent.press(screen.getByTestId('for-you-tracker-period-weekly'));
    expect(screen.getAllByText('Today').length).toBeGreaterThan(0);
    // The weekly badge rests on the same threshold, so it goes too.
    for (const verdict of ['Usual', 'Low', 'High', 'Unusual']) {
      expect(screen.queryByText(verdict)).toBeNull();
    }
    expect(screen.getByText('Stall 8 · Willow')).toBeTruthy();
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
    expect(at('Stall 7 · Juniper')).toBeLessThan(at('Stall 4 · Apollo'));
    expect(at('Stall 8 · Willow')).toBeLessThan(at('Stall 4 · Apollo'));
    // ...and the untroubled rows stay in stall order below them.
    expect(at('Stall 4 · Apollo')).toBeLessThan(at('Stall 5 · Bubbles'));
    expect(at('Stall 5 · Bubbles')).toBeLessThan(at('Stall 9 · Pepper'));
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
