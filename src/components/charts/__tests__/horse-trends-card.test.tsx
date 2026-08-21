import { fireEvent, render, screen } from '@testing-library/react-native';
import { DateTime } from 'luxon';

import { buildActivenessDay, buildRollingWeek } from '@/charts/horse-trends';
import {
  activenessWithGap,
  observedDaysWithOutage,
  rollingPreviousWeek,
  rollingWeek,
} from '@/charts/fixtures/horse-trends';
import { HorseTrendsCard } from '@/components/charts/horse-trends-card';

const mockPush = jest.fn();
jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush }),
}));

const ZONE = 'America/Chicago';
const NOW = DateTime.fromISO('2026-08-21T15:00:00', { zone: ZONE });

function card() {
  return (
    <HorseTrendsCard
      activeness={buildActivenessDay({ samples: activenessWithGap(NOW), now: NOW })}
      rollingEvents={rollingWeek(NOW).filter(
        (event) => event.at >= NOW.minus({ hours: 24 }).toSeconds(),
      )}
      rollingWeek={buildRollingWeek({
        events: rollingWeek(NOW),
        previousEvents: rollingPreviousWeek(NOW),
        observedDays: observedDaysWithOutage(NOW, 6),
        zone: ZONE,
        now: NOW,
      })}
      zone={ZONE}
      now={NOW}
      width={340}
    />
  );
}

describe('HorseTrendsCard', () => {
  afterEach(() => mockPush.mockClear());

  it('names the ranges for what they show, not how they are computed', async () => {
    // Decided over the Figma annotation's Daily/Weekly (Inakshi, 2026-08-21):
    // the short view is a rolling window ending now, not a calendar day.
    await render(card());
    expect(screen.getByText('24 hours')).toBeTruthy();
    expect(screen.getByText('7 days')).toBeTruthy();
    expect(screen.queryByText('Hourly')).toBeNull();
    expect(screen.queryByText('Daily')).toBeNull();
  });

  it('shows no Higher/Usual/Lower pill until the comparison is approved', async () => {
    // The shipping pill fires on ANY difference — one extra minute reads
    // "Higher" — and its replacement thresholds are unapproved.
    await render(card());
    expect(screen.queryByText('Higher')).toBeNull();
    expect(screen.queryByText('Lower')).toBeNull();
    expect(screen.queryByText('Usual')).toBeNull();
  });

  it('captions rolling with exact times, never hour buckets', async () => {
    await render(card());
    expect(screen.getByText(/^Rolled \d+ times? · .+[AP]M/)).toBeTruthy();
  });

  it('keeps the established Partial Rolling vocabulary', async () => {
    // The 103/104/105 grouping Review History was fixed to use — one
    // vocabulary across the app, not relitigated per chart.
    await render(card());
    expect(screen.getByText('Partial Rolling')).toBeTruthy();
  });

  it('opens Review History when the rolling row is tapped', async () => {
    await render(card());
    await fireEvent.press(screen.getByTestId('horse-trends-rolling'));
    expect(mockPush).toHaveBeenCalledWith('/review-history');
  });

  it('draws the 7-day bars with an unobserved day and a hollow today', async () => {
    await render(card());
    await fireEvent.press(screen.getByText('7 days'));
    expect(screen.getByTestId('rolling-week-bars')).toBeTruthy();
    expect(screen.getByText('Today')).toBeTruthy();
  });
});
