import { render, screen } from '@testing-library/react-native';

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
    expect(screen.getByText('Low')).toBeTruthy();
    expect(screen.getByText('No data')).toBeTruthy();
  });
});
