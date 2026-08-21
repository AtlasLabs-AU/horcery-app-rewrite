import { fireEvent, render, screen } from '@testing-library/react-native';

import { BehaviorTrackerCard } from '@/components/for-you/behavior-tracker-card';
import { ToastHost } from '@/components/ui/toast';

// `mock`-prefixed so the factory may reference it — jest hoists the factory
// above this declaration.
const mockOpenBrowser = jest.fn((url: string) => Promise.resolve({ type: 'dismiss', url }));
jest.mock('expo-web-browser', () => ({
  openBrowserAsync: (url: string) => mockOpenBrowser(url),
  WebBrowserPresentationStyle: {},
}));

jest.mock('@/hooks/use-session', () => ({
  useSession: () => ({
    status: 'signed-in',
    email: 'qa@example.com',
    organization: { timezone: 'America/Chicago', chart_start_time: null },
  }),
}));

beforeEach(() => mockOpenBrowser.mockClear());

/**
 * Consumption has no chart yet. The shipping app shows two different things
 * here and the difference matters commercially: an organization that has
 * already bought bucket meters must never be shown an advert to buy them.
 */
describe('Consumption', () => {
  // Wrapped as the app wraps it: the Buy Now handler toasts if the browser
  // cannot open, and `useToast` refuses to run outside its host.
  const card = (props: { hasBucketMeters?: boolean } = {}) => (
    <ToastHost>
      <BehaviorTrackerCard {...props} />
    </ToastHost>
  );

  const selectConsumption = async () => {
    await render(card({ hasBucketMeters: false }));
    await fireEvent.press(screen.getByTestId('for-you-behavior-feed'));
  };

  it('offers the meter to an organization that has none', async () => {
    await selectConsumption();
    expect(screen.getByTestId('for-you-consumption-upsell')).toBeTruthy();
    expect(screen.getByText(/Install a/)).toBeTruthy();
    expect(screen.getByText('Horcery Wireless Bucket Meter')).toBeTruthy();
    expect(screen.getByText('Buy Now')).toBeTruthy();
  });

  it('shows Coming Soon instead once meters are installed', async () => {
    await render(card({ hasBucketMeters: true }));
    await fireEvent.press(screen.getByTestId('for-you-behavior-feed'));

    expect(screen.getByText('Coming Soon!')).toBeTruthy();
    // The advert must not appear to someone who already owns the hardware.
    expect(screen.queryByTestId('for-you-consumption-upsell')).toBeNull();
    expect(screen.queryByText('Buy Now')).toBeNull();
  });

  it('opens the bucket meter page rather than being a dead button', async () => {
    await selectConsumption();
    await fireEvent.press(screen.getByTestId('consumption-buy-now'));

    expect(mockOpenBrowser).toHaveBeenCalledTimes(1);
    expect(mockOpenBrowser).toHaveBeenCalledWith(expect.stringMatching(/bucket-meter/));
  });

  it('names the behaviour the way the current app names it', async () => {
    await render(card());
    expect(screen.getByText('Consumption')).toBeTruthy();
  });
});
