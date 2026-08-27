import { lyingDownSeriesColor } from '@/components/charts/lying-down-badge';
import { LyingDownRow } from '@/components/charts/lying-down-row';
import { buildLyingDownWeek, type LyingDownState } from '@/charts/lying-down';
import { typicalWeek, monitorWentOffline, noData } from '@/charts/fixtures/lying-down';
import { palette } from '@/constants/tokens';
import { render, screen } from '@testing-library/react-native';
import { DateTime } from 'luxon';

const ZONE = 'America/Chicago';
const NOW = DateTime.fromISO('2026-08-19T18:20:00', { zone: ZONE });

function week(result: ReturnType<typeof typicalWeek>, inStall?: ReturnType<typeof typicalWeek>) {
  return buildLyingDownWeek({
    result,
    inStallResult: inStall,
    selectedDate: NOW.toFormat('yyyy-MM-dd'),
    zone: ZONE,
    now: NOW,
  });
}

describe('LyingDownRow', () => {
  it('leads with the horse, its verdict, and today against the average', async () => {
    await render(
      <LyingDownRow
        horseName="Apollo"
        week={week(typicalWeek(NOW))}
        verdict="usual"
        averageSeconds={3.5 * 3600}
        width={340}
      />,
    );
    expect(screen.getByText('Apollo')).toBeTruthy();
    expect(screen.getByText('3 h 30 min avg')).toBeTruthy();
    // No verdict badge: withheld until Data Science approves a comparison
    // (Inakshi, 2026-08-23). The figure and the average still stand.
    expect(screen.queryByText('Usual')).toBeNull();
  });

  it('withholds the deviation badge rather than judging on an unowned threshold', async () => {
    await render(
      <LyingDownRow
        horseName="Juniper"
        week={week(typicalWeek(NOW))}
        verdict="low"
        averageSeconds={2.9 * 3600}
        width={340}
      />,
    );
    // Measured on 45 days from three monitors, the 25% threshold flags a
    // quarter to two-thirds of ordinary days and nobody owns the number.
    expect(screen.queryByText('Low')).toBeNull();
    // The row still carries everything we can actually prove.
    expect(screen.getByText('Juniper')).toBeTruthy();
  });

  it('shows in-stall time as the denominator when it is known', async () => {
    await render(
      <LyingDownRow
        horseName="Apollo"
        week={week(typicalWeek(NOW), typicalWeek(NOW))}
        verdict="usual"
        averageSeconds={3.5 * 3600}
        width={340}
      />,
    );
    expect(screen.getByText(/^In stall /)).toBeTruthy();
  });

  it('says in-stall time is unavailable rather than implying zero', async () => {
    await render(
      <LyingDownRow
        horseName="Apollo"
        week={week(typicalWeek(NOW))}
        verdict="usual"
        averageSeconds={3.5 * 3600}
        width={340}
      />,
    );
    expect(screen.getByText('In-stall time unavailable')).toBeTruthy();
    expect(screen.queryByText('In stall 0 min')).toBeNull();
  });

  it('renders a dash, never a zero, when today has no observations', async () => {
    await render(
      <LyingDownRow
        horseName="Pepper"
        week={week(noData)}
        verdict="no-data"
        averageSeconds={2.6 * 3600}
        width={340}
      />,
    );
    expect(screen.getByText('—')).toBeTruthy();
    expect(screen.getByText('No data')).toBeTruthy();
  });

  it('says so when there is no average yet, rather than showing 0', async () => {
    await render(
      <LyingDownRow
        horseName="Newcomer"
        week={week(typicalWeek(NOW))}
        verdict="unknown"
        averageSeconds={null}
        width={340}
      />,
    );
    expect(screen.getByText('no average yet')).toBeTruthy();
  });

  it('labels the axis from the barn day, not midnight', async () => {
    await render(
      <LyingDownRow
        horseName="Apollo"
        week={week(typicalWeek(NOW))}
        verdict="usual"
        averageSeconds={3.5 * 3600}
        width={340}
      />,
    );
    // Barn day starts at 6 AM, so the axis opens and closes there.
    expect(screen.getAllByText('6 AM').length).toBe(2);
    expect(screen.queryByText('12 AM')).toBeTruthy();
  });

  /**
   * The colour rule, pinned as behaviour rather than left to review.
   *
   * PRINCIPLES.md allows a reading to be coloured when it DEVIATES from this
   * horse's own usual range, and forbids colouring it by how bad the deviation
   * is. So there are exactly two series colours and the choice between them
   * depends only on the verdict — never on the magnitude, and never on red.
   */
  describe('colour', () => {
    it('draws an ordinary reading in the data colour', () => {
      expect(lyingDownSeriesColor('usual', palette.light)).toBe(palette.light.chartData);
    });

    it.each(['low', 'high'] as const)(
      'draws a %s reading in the ordinary colour while the verdict is withheld',
      (verdict) => {
        // An ochre line says "outside normal" as plainly as the badge does.
        // Hiding the words while keeping the colour would only move the
        // unapproved claim somewhere harder to argue with.
        const colour = lyingDownSeriesColor(verdict, palette.light);
        expect(colour).toBe(palette.light.chartData);
        expect(colour).not.toBe(palette.light.statusAlert);
      },
    );

    it('keeps the deviation colour ready for when the comparison is approved', () => {
      // Pins the rule itself, so flipping DEVIATION_VERDICTS_APPROVED restores
      // ochre for deviation and nothing else. Severity is still never coloured:
      // a low day and a high day look the same, and neither borrows alert red.
      expect(palette.light.chartDeviation).not.toBe(palette.light.chartData);
      expect(palette.light.chartDeviation).not.toBe(palette.light.statusAlert);
    });

    it('treats missing data as an absence, not a deviation', async () => {
      await render(
        <LyingDownRow
          horseName="Pepper"
          week={week(noData)}
          verdict="no-data"
          averageSeconds={2.6 * 3600}
          width={340}
        />,
      );
      // Nothing is drawn at all — an absence must not be dressed as a reading.
      expect(screen.queryByTestId('lying-down-daily-plot')).toBeNull();
    });
  });

  it.each<{
    state: Exclude<LyingDownState, 'ready'>;
    message: string | RegExp;
    blocks: boolean;
  }>([
    { state: 'loading', message: 'Loading lying-down readings', blocks: true },
    { state: 'refreshing', message: 'Updating lying-down readings', blocks: false },
    { state: 'no-data', message: 'No lying-down readings for this period', blocks: true },
    {
      state: 'out-of-stall',
      message: 'The horse was not in the stall during this period',
      blocks: true,
    },
    { state: 'stale', message: /^Last reading .+ ago$/, blocks: false },
    { state: 'partial', message: 'Some readings are missing', blocks: false },
    {
      state: 'unavailable',
      message: 'These readings are temporarily unavailable',
      blocks: true,
    },
    {
      state: 'unsupported',
      message: 'This monitor does not report lying-down readings',
      blocks: true,
    },
  ])('presents $state without leaving misleading chart content', async ({ state, message, blocks }) => {
    const source = week(typicalWeek(NOW));
    await render(
      <LyingDownRow
        horseName="Apollo"
        week={{ ...source, state }}
        verdict="usual"
        averageSeconds={3.5 * 3600}
        width={340}
      />,
    );

    expect(screen.getByText(message)).toBeTruthy();
    if (blocks) {
      expect(screen.queryByTestId('lying-down-daily-plot')).toBeNull();
      expect(screen.getByText('—')).toBeTruthy();
    } else {
      expect(screen.getByTestId('lying-down-daily-plot')).toBeTruthy();
    }
    // Either way, no deviation verdict while the threshold is unapproved.
    expect(screen.queryByText('Usual')).toBeNull();
  });

  it('survives a monitor that went offline mid-week', async () => {
    await render(
      <LyingDownRow
        horseName="Pepper"
        week={week(monitorWentOffline(NOW))}
        verdict="no-data"
        averageSeconds={2.6 * 3600}
        width={340}
      />,
    );
    expect(screen.getByText('Pepper')).toBeTruthy();
    expect(screen.getByText('Some readings are missing')).toBeTruthy();
  });
});
