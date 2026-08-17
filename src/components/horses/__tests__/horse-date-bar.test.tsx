import { fireEvent, render } from '@testing-library/react-native';
import { DateTime } from 'luxon';

import { HorseDateBar } from '@/components/horses/horse-date-bar';

const NOW = DateTime.fromISO('2026-08-17T14:32:00.000', { zone: 'Australia/Sydney' });
const CREATED = DateTime.fromISO('2026-08-15T09:00:00.000', { zone: 'Australia/Sydney' });

async function setup(
  day: DateTime,
  overrides: Partial<Parameters<typeof HorseDateBar>[0]> = {},
) {
  const onChange = jest.fn();
  const onToday = jest.fn();
  // RNTL v14: render is async, as are rerender and fireEvent.press.
  const view = await render(
    <HorseDateBar
      day={day}
      now={NOW}
      earliest={CREATED}
      onChange={onChange}
      onToday={onToday}
      {...overrides}
    />,
  );
  return { view, onChange, onToday };
}

describe('HorseDateBar', () => {
  it('names today in words and offers no way back to it', async () => {
    const { view } = await setup(NOW);

    expect(view.getByText('Today')).toBeTruthy();
    // "Back to today" would be a control that does nothing while already there.
    expect(view.queryByTestId('horse-date-today')).toBeNull();
  });

  it('steps back a day', async () => {
    const { view, onChange } = await setup(NOW);

    await fireEvent.press(view.getByTestId('horse-date-back'));

    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange.mock.calls[0][0].toISODate()).toBe('2026-08-16');
  });

  it('steps forward from an earlier day', async () => {
    const { view, onChange } = await setup(NOW.minus({ days: 1 }));

    expect(view.getByText('Yesterday')).toBeTruthy();
    await fireEvent.press(view.getByTestId('horse-date-forward'));

    expect(onChange.mock.calls[0][0].toISODate()).toBe('2026-08-17');
  });

  it('cannot step past today, and says why', async () => {
    const { view, onChange } = await setup(NOW);
    const forward = view.getByTestId('horse-date-forward');

    // Disabled, role dropped, and the reason spoken — not a silent dead arrow.
    expect(forward.props.accessibilityRole).toBeUndefined();
    expect(forward.props.accessibilityLabel).toBe('Today is the latest day');

    await fireEvent.press(forward);
    expect(onChange).not.toHaveBeenCalled();
  });

  it('cannot step before the horse existed, and says why', async () => {
    const { view, onChange } = await setup(CREATED);
    const back = view.getByTestId('horse-date-back');

    expect(back.props.accessibilityRole).toBeUndefined();
    expect(back.props.accessibilityLabel).toBe('No earlier days for this horse');

    await fireEvent.press(back);
    expect(onChange).not.toHaveBeenCalled();
  });

  it('offers a way back to today, and re-tracks the clock rather than freezing it', async () => {
    const { view, onChange, onToday } = await setup(NOW.minus({ days: 2 }));

    await fireEvent.press(view.getByTestId('horse-date-today'));

    // `onToday`, not `onChange(now)`: the second would pin the page to the
    // instant of the tap, which is the frozen-clock bug this page exists to
    // avoid (parity C7).
    expect(onToday).toHaveBeenCalledTimes(1);
    expect(onChange).not.toHaveBeenCalled();
  });
});
