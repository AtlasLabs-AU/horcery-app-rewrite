import { render, screen } from '@testing-library/react-native';
import { DateTime } from 'luxon';

import { LyingDownRow } from '@/components/charts/lying-down-row';
import { buildLyingDownWeek } from '@/charts/lying-down';
import { typicalWeek, monitorWentOffline, noData } from '@/charts/fixtures/lying-down';
import { palette } from '@/constants/tokens';

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
    expect(screen.getByText('Usual')).toBeTruthy();
    expect(screen.getByText('3 h 30 min avg')).toBeTruthy();
  });

  it('flags a low day in its own badge so it stands out down a list', async () => {
    await render(
      <LyingDownRow
        horseName="Juniper"
        week={week(typicalWeek(NOW))}
        verdict="low"
        averageSeconds={2.9 * 3600}
        width={340}
      />,
    );
    expect(screen.getByText('Low')).toBeTruthy();
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
    function readingColour(node: { props: Record<string, unknown> }): string | undefined {
      const style = node.props.style as { backgroundColor?: string } | undefined;
      return style?.backgroundColor;
    }

    it('draws an ordinary reading in the data colour', async () => {
      await render(
        <LyingDownRow
          horseName="Apollo"
          week={week(typicalWeek(NOW))}
          verdict="usual"
          averageSeconds={3.5 * 3600}
          width={340}
        />,
      );
      expect(readingColour(screen.getByTestId('lying-down-reading'))).toBe(
        palette.light.chartData,
      );
    });

    it.each(['low', 'high'] as const)(
      'draws a %s reading in the deviation colour, not the alert colour',
      async (verdict) => {
        await render(
          <LyingDownRow
            horseName="Juniper"
            week={week(typicalWeek(NOW))}
            verdict={verdict}
            averageSeconds={2.9 * 3600}
            width={340}
          />,
        );
        const colour = readingColour(screen.getByTestId('lying-down-reading'));
        expect(colour).toBe(palette.light.chartDeviation);
        // Severity is never coloured: a low day and a high day look the same,
        // and neither borrows red from real alerts.
        expect(colour).not.toBe(palette.light.statusAlert);
      },
    );

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
      expect(screen.queryByTestId('lying-down-reading')).toBeNull();
    });
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
  });
});
