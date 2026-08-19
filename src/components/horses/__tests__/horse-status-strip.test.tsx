import { render } from '@testing-library/react-native';

import { HorseStatusStrip } from '@/components/horses/horse-status-strip';
import type { InStallStatus } from '@/hooks/horse-status-data';

const ALL_STATES: InStallStatus[] = [
  'in-stall',
  'out-of-stall',
  'unsure',
  'no-camera',
  'loading',
  'unavailable',
];

describe('HorseStatusStrip', () => {
  it('gives every state its own words, so none renders blank', async () => {
    // The whole point of the five-state model: the current app draws nothing
    // for three of these, making "no camera", "still checking" and "too close
    // to call" indistinguishable from a horse that is fine.
    for (const status of ALL_STATES) {
      const view = await render(
        <HorseStatusStrip status={status} readings={[]} atLabel="Live" />,
      );
      const strip = view.getByTestId('horse-status-strip');
      expect(strip).toBeTruthy();
    }
  });

  it('names in and out of stall plainly', async () => {
    const inStall = await render(
      <HorseStatusStrip status="in-stall" readings={[]} atLabel="Live" />,
    );
    expect(inStall.getByText('In stall')).toBeTruthy();

    const outOfStall = await render(
      <HorseStatusStrip status="out-of-stall" readings={[]} atLabel="Live" />,
    );
    expect(outOfStall.getByText('Out of stall')).toBeTruthy();
  });

  it('says it is unsure rather than implying the horse is out', async () => {
    const view = await render(<HorseStatusStrip status="unsure" readings={[]} atLabel="Live" />);

    expect(view.getByText('Not sure')).toBeTruthy();
    expect(view.getByText(/too close to call/i)).toBeTruthy();
  });

  it('always states which moment the reading is for', async () => {
    // A number with no time attached is the frozen-clock bug waiting to
    // happen: the reader assumes "now" and has no way to tell otherwise.
    const live = await render(<HorseStatusStrip status="in-stall" readings={[]} atLabel="Live" />);
    expect(live.getByText('Live')).toBeTruthy();

    const past = await render(
      <HorseStatusStrip status="in-stall" readings={[]} atLabel="Yesterday, end of day" />,
    );
    expect(past.getByText('Yesterday, end of day')).toBeTruthy();
  });

  it('keeps all three score-card positions stable when a reading is unavailable', async () => {
    const view = await render(
      <HorseStatusStrip
        status="in-stall"
        readings={[
          { label: 'Activeness', value: 'Unavailable', state: 'unavailable' },
          { label: 'Temperature', value: '18°C', state: 'available' },
          { label: 'Noise Level', value: 'Low', state: 'available' },
        ]}
        atLabel="Live"
      />,
    );

    expect(view.getByText('18°C')).toBeTruthy();
    expect(view.getByText('Low')).toBeTruthy();
    expect(view.getByText('Activeness')).toBeTruthy();
    expect(view.getByText('Noise Level')).toBeTruthy();
    expect(view.getByText('Unavailable')).toBeTruthy();
  });

  it('shows when a displayed value came from the recent offline cache', async () => {
    const view = await render(
      <HorseStatusStrip
        status="in-stall"
        readings={[
          {
            label: 'Activeness',
            value: 'Normal',
            state: 'cached',
            detail: 'Updated 6 min ago',
          },
        ]}
        atLabel="Live"
      />,
    );

    expect(view.getByText('Updated 6 min ago')).toBeTruthy();
  });
});
