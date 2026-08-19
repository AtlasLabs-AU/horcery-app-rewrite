import { fireEvent, render, screen } from '@testing-library/react-native';
import { DateTime } from 'luxon';

import { ScrubTimeline } from '@/components/timeline/scrub-timeline';
import { tickStep } from '@/components/timeline/timeline-data';

const ZONE = 'Australia/Melbourne';
const LATEST = DateTime.fromISO('2026-08-18T14:32:00.000', { zone: ZONE });
const EARLIEST = DateTime.fromISO('2026-08-01T09:00:00.000', { zone: ZONE });
const WIDTH = 390;

/**
 * Gestures themselves are not driven here — a pan on the UI thread is a device
 * test, and slice 4c's device pass is what covers it. What IS worth locking in
 * jest is everything around the gesture: that the track draws real ticks once
 * it has a width, that the control is reachable without dragging, and that it
 * never reports a moment it cannot actually show.
 */
async function setup(overrides: Partial<Parameters<typeof ScrubTimeline>[0]> = {}) {
  const onScrub = jest.fn();
  const view = await render(
    <ScrubTimeline
      cursor={LATEST}
      latest={LATEST}
      earliest={EARLIEST}
      zone={ZONE}
      isLive
      onScrub={onScrub}
      {...overrides}
    />,
  );
  await fireEvent(screen.getByTestId('scrub-timeline'), 'layout', {
    nativeEvent: { layout: { width: WIDTH, height: 76 } },
  });
  return { onScrub, view };
}

describe('ScrubTimeline', () => {
  it('draws nothing until it has been measured', async () => {
    const onScrub = jest.fn();
    await render(
      <ScrubTimeline
        cursor={LATEST}
        latest={LATEST}
        earliest={EARLIEST}
        zone={ZONE}
        isLive
        onScrub={onScrub}
      />,
    );

    // Before onLayout the scale is zero. Drawing ticks at that point would put
    // every one of them on top of the others at x = 0, and dividing by it is
    // what would poison the transform with Infinity.
    expect(screen.queryByText(/AM|PM/)).toBeNull();
  });

  it('labels the hours in barn time once measured', async () => {
    await setup();

    // Zoom 1 shows six hours across the screen, three screens are kept
    // mounted, so the labels around 2:32pm are the hours either side of it.
    expect(screen.getByText('2:00 PM')).toBeTruthy();
    expect(screen.getByText('12:00 PM')).toBeTruthy();
    expect(screen.getByText('5:00 PM')).toBeTruthy();
  });

  it('reads the barn’s clock, not the phone’s', async () => {
    await setup({ zone: 'Europe/London' });

    // 2:32pm in Melbourne is 5:32am in London, so the same nine hours either
    // side of the cursor carry different labels. 5:00 PM is inside the
    // Melbourne window (asserted above) and outside the London one, so it is
    // what separates "the zone is applied" from "the zone is ignored".
    expect(screen.getByText('5:00 AM')).toBeTruthy();
    expect(screen.queryByText('5:00 PM')).toBeNull();
  });

  it('re-centres on the page’s cursor the moment it moves', async () => {
    // The regression guard for the defect this component shipped with for one
    // afternoon (found on device, 2026-08-19). The window centre was DERIVED —
    // "use the cursor when the anchor is far away, unless a finger is down" —
    // so stepping to Yesterday and then touching the track flipped the centre
    // back to today, a whole day from the view, and every tick left the screen.
    // The track went blank under your finger.
    const { view } = await setup();
    expect(screen.getByText('2:00 PM')).toBeTruthy();

    // 1:05am yesterday: the window is nine hours either side, so no 2pm of
    // any day falls inside it — the old centre cannot survive by coincidence.
    const lastNight = LATEST.minus({ days: 1 }).set({ hour: 1, minute: 5 });
    await view.rerender(
      <ScrubTimeline
        cursor={lastNight}
        latest={LATEST}
        earliest={EARLIEST}
        zone={ZONE}
        isLive={false}
        onScrub={jest.fn()}
      />,
    );

    expect(screen.getByText('1:00 AM')).toBeTruthy();
    expect(screen.queryByText('2:00 PM')).toBeNull();
  });

  it('announces itself as live rather than as a frozen timestamp', async () => {
    await setup();

    expect(screen.getByTestId('scrub-timeline').props.accessibilityValue).toEqual({ text: 'Live' });
  });

  it('announces the exact moment when it is not live', async () => {
    const past = DateTime.fromISO('2026-08-16T03:34:00.000', { zone: ZONE });
    await setup({ cursor: past, isLive: false });

    expect(screen.getByTestId('scrub-timeline').props.accessibilityValue).toEqual({
      text: '3:34:00 AM',
    });
  });

  it('can be moved without a drag, for anyone who cannot make one', async () => {
    const past = DateTime.fromISO('2026-08-16T03:34:00.000', { zone: ZONE });
    const { onScrub } = await setup({ cursor: past, isLive: false });

    await fireEvent(screen.getByTestId('scrub-timeline'), 'accessibilityAction', {
      nativeEvent: { actionName: 'increment' },
    });

    expect(onScrub).toHaveBeenCalledTimes(1);
    const moved: DateTime = onScrub.mock.calls[0][0];
    expect(moved.toSeconds() - past.toSeconds()).toBe(tickStep(1).major);
  });

  it('will not step a screen reader past the live edge', async () => {
    const { onScrub } = await setup({ cursor: LATEST, isLive: false });

    await fireEvent(screen.getByTestId('scrub-timeline'), 'accessibilityAction', {
      nativeEvent: { actionName: 'increment' },
    });

    const moved: DateTime = onScrub.mock.calls[0][0];
    expect(moved.toSeconds()).toBe(LATEST.toSeconds());
  });

  it('will not step back past the horse’s first day', async () => {
    const { onScrub } = await setup({ cursor: EARLIEST, isLive: false });

    await fireEvent(screen.getByTestId('scrub-timeline'), 'accessibilityAction', {
      nativeEvent: { actionName: 'decrement' },
    });

    const moved: DateTime = onScrub.mock.calls[0][0];
    expect(moved.toSeconds()).toBe(EARLIEST.toSeconds());
  });
});
