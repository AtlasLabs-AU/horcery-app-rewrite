import { render, screen } from '@testing-library/react-native';
import { DateTime } from 'luxon';

import { LyingDownCard } from '@/components/charts/lying-down-card';
import { buildLyingDownWeek, type LyingDownComparison } from '@/charts/lying-down';
import {
  monitorWentOffline,
  neverLayDown,
  noData,
  typicalWeek,
} from '@/charts/fixtures/lying-down';

const ZONE = 'America/Chicago';
const NOW = DateTime.fromISO('2026-08-19T18:20:00', { zone: ZONE });

function week(
  result: ReturnType<typeof typicalWeek>,
  comparison?: LyingDownComparison,
) {
  return buildLyingDownWeek({
    result,
    selectedDate: NOW.toFormat('yyyy-MM-dd'),
    zone: ZONE,
    now: NOW,
    comparison,
  });
}

describe('LyingDownCard', () => {
  it('leads with how long the horse was down today', async () => {
    await render(<LyingDownCard week={week(typicalWeek(NOW))} width={360} />);
    expect(screen.getByText(/lying down today$/)).toBeTruthy();
  });

  it('shows when, and how many separate times', async () => {
    await render(<LyingDownCard week={week(typicalWeek(NOW))} width={360} />);
    expect(screen.getByText('When, today')).toBeTruthy();
    expect(screen.getByText(/separate times today|1 time today/)).toBeTruthy();
  });

  it('renders a dash, never a zero, for days with no observations', async () => {
    const offline = week(monitorWentOffline(NOW));
    await render(<LyingDownCard week={offline} width={360} />);
    // At least one day is uncovered, and it is shown as unknown.
    expect(offline.days.some((d) => d.totalSeconds === null)).toBe(true);
    expect(screen.getAllByText('—').length).toBeGreaterThan(0);
  });

  it('says no reading is available rather than showing a false zero', async () => {
    await render(<LyingDownCard week={week(noData)} width={360} />);
    expect(screen.getByText('No reading available')).toBeTruthy();
    expect(screen.queryByText(/lying down today$/)).toBeNull();
  });

  it('distinguishes a genuine zero from missing data', async () => {
    await render(<LyingDownCard week={week(neverLayDown(NOW))} width={360} />);
    expect(screen.getByText('0 min lying down today')).toBeTruthy();
  });

  it('omits the comparison when the verdict contradicts the numbers', async () => {
    // Today is well under the supplied typical, but upstream claims "more".
    const contradictory = week(typicalWeek(NOW), {
      typicalByNowSeconds: 10 * 3600,
      verdict: 'more-than-usual',
      basisDays: 28,
    });
    await render(<LyingDownCard week={contradictory} width={360} />);
    expect(screen.queryByText(/than usual by this time/)).toBeNull();
    // The headline still stands — we know how long the horse was down.
    expect(screen.getByText(/lying down today$/)).toBeTruthy();
  });

  it('renders the comparison when upstream and the numbers agree', async () => {
    const agreeing = week(typicalWeek(NOW), {
      typicalByNowSeconds: 95 * 60,
      verdict: 'less-than-usual',
      basisDays: 28,
    });
    await render(<LyingDownCard week={agreeing} width={360} />);
    expect(screen.getByText(/less than usual by this time/)).toBeTruthy();
  });
});
