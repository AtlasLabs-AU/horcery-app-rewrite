import { render, screen } from '@testing-library/react-native';

import { HorseStallCard } from '@/components/horses/horse-stall-card';

const mockPreviews = { horseInStallSampleData: false };

jest.mock('@/config/previews', () => ({
  get PREVIEWS() {
    return mockPreviews;
  },
}));

jest.mock('@/hooks/use-session', () => ({
  useSession: () => ({
    status: 'signed-in',
    email: 'qa@example.com',
    organization: { timezone: 'America/Chicago', chart_start_time: null },
  }),
}));

afterEach(() => {
  mockPreviews.horseInStallSampleData = false;
});

/**
 * A monitoring chart drawn from invented data is more dangerous than a fake
 * button — a customer has no way to tell. So the chart is off by default, and
 * when it is on it says so, and says which stall it is from.
 */
describe('HorseStallCard', () => {
  it('shows only the stall row when previews are off', async () => {
    await render(<HorseStallCard stallName="Stall 4" />);
    expect(screen.getByText('Stall 4')).toBeTruthy();
    expect(screen.queryByTestId('horse-stall-chart')).toBeNull();
  });

  it('never draws a chart for a horse with no stall', async () => {
    mockPreviews.horseInStallSampleData = true;
    await render(<HorseStallCard />);
    expect(screen.getByText('No stall assigned')).toBeTruthy();
    expect(screen.queryByTestId('horse-stall-chart')).toBeNull();
  });

  it('labels the sample chart and names the stall it comes from', async () => {
    mockPreviews.horseInStallSampleData = true;
    await render(<HorseStallCard stallName="Stall 4" />);
    expect(screen.getByTestId('horse-stall-chart')).toBeTruthy();
    expect(screen.getByText('Sample data — not this horse')).toBeTruthy();
    expect(screen.getByText('From Stall 4, the stall this horse is in now')).toBeTruthy();
    expect(screen.getByText('Today')).toBeTruthy();
  });

  it('lets a long stall name wrap instead of cutting it off', async () => {
    await render(<HorseStallCard stallName="Stall 12 – Barn B north aisle, end box" />);
    const name = screen.getByText('Stall 12 – Barn B north aisle, end box');
    expect(name.props.numberOfLines).toBeUndefined();
  });
});
