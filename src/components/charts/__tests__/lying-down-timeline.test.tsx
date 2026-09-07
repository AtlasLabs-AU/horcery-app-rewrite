import { fireEvent, render, screen } from '@testing-library/react-native';
import { DateTime } from 'luxon';

import { buildLyingDownTimeline } from '@/charts/lying-down-timeline';
import {
  noData,
  previewWeek,
  singleSampleAnd235830,
} from '@/charts/fixtures/lying-down-timeline';
import { LyingDownTimeline } from '@/components/charts/lying-down-timeline';

const ZONE = 'America/Chicago';
const NOW = DateTime.fromISO('2026-08-21T14:00:00', { zone: ZONE });

function chart(result: ReturnType<typeof previewWeek>, assignedAt?: number) {
  return (
    <LyingDownTimeline
      timeline={buildLyingDownTimeline({
        result,
        selectedDate: '2026-08-21',
        zone: ZONE,
        now: NOW,
        assignedAt,
      })}
      width={340}
      testID="timeline"
    />
  );
}

describe('LyingDownTimeline', () => {
  it('draws seven rows, oldest first, today last', async () => {
    await render(chart(previewWeek(ZONE, NOW)));
    expect(screen.getByText('Sat 15')).toBeTruthy();
    expect(screen.getByText('Today')).toBeTruthy();
  });

  it('draws a dashed stretch where readings are missing, never a bar', async () => {
    await render(chart(previewWeek(ZONE, NOW)));
    // The outage four days back in the fixture.
    expect(screen.getAllByTestId('lying-down-timeline-gap').length).toBeGreaterThan(0);
  });

  it('treats the hours before the assignment as no readings too', async () => {
    const assignedAt = DateTime.fromISO('2026-08-19T12:10:00', { zone: ZONE }).toSeconds();
    await render(chart(previewWeek(ZONE, NOW), assignedAt));
    // Four whole earlier days plus Tuesday morning plus the Monday outage — at
    // least five dashed stretches, and no bar before Tuesday noon.
    expect(screen.getAllByTestId('lying-down-timeline-gap').length).toBeGreaterThanOrEqual(5);
  });

  it('reports the supported duration in the tooltip, not the drawn width', async () => {
    await render(chart(singleSampleAnd235830(ZONE)));
    const bouts = screen.getAllByTestId('lying-down-timeline-bout');
    // The single 30-second reading is drawn wide enough to tap, but says 30 s —
    // not "1 min", which minute-rounding would manufacture.
    const single = bouts.find((b) => /2:00 PM – 2:00 PM/.test(String(b.props.accessibilityLabel)));
    expect(single).toBeTruthy();
    await fireEvent.press(single!);
    expect(screen.getByTestId('lying-down-timeline-tooltip')).toBeTruthy();
    expect(screen.getByText('30 s')).toBeTruthy();
  });

  it('closes the tooltip on a second tap', async () => {
    await render(chart(previewWeek(ZONE, NOW)));
    const first = screen.getAllByTestId('lying-down-timeline-bout')[0]!;
    await fireEvent.press(first);
    expect(screen.getByTestId('lying-down-timeline-tooltip')).toBeTruthy();
    await fireEvent.press(first);
    expect(screen.queryByTestId('lying-down-timeline-tooltip')).toBeNull();
  });

  it('says so plainly when there is nothing at all', async () => {
    await render(chart(noData()));
    expect(screen.getByText('No lying-down readings for this period')).toBeTruthy();
  });
});
