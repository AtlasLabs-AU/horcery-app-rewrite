import { render, screen } from '@testing-library/react-native';
import { StyleSheet, Text, useWindowDimensions } from 'react-native';

import { LyingDownRowShell } from '@/components/charts/lying-down-row-shell';
import { STACK_ABOVE_SCALE } from '@/hooks/use-text-scale';

jest.mock('react-native/Libraries/Utilities/useWindowDimensions');

const mockedDimensions = useWindowDimensions as jest.MockedFunction<
  typeof useWindowDimensions
>;

function atTextScale(fontScale: number) {
  mockedDimensions.mockReturnValue({ width: 390, height: 844, scale: 3, fontScale });
}

function row() {
  return (
    <LyingDownRowShell
      horseName="Apollo"
      badgeLabel="Usual"
      badgeTone="quiet"
      figure="1h 40m"
      subline="1 h 40 min avg"
      width={340}>
      <Text>Chart</Text>
    </LyingDownRowShell>
  );
}

describe('LyingDownRowShell', () => {
  it('keeps the compact summary row at the default text size', async () => {
    atTextScale(1);
    await render(row());

    const style = StyleSheet.flatten(screen.getByTestId('lying-down-row-header').props.style);
    expect(style.flexDirection).toBe('row');
  });

  it('stacks the complete value below the horse name at accessibility sizes', async () => {
    atTextScale(STACK_ABOVE_SCALE);
    await render(row());

    const style = StyleSheet.flatten(screen.getByTestId('lying-down-row-header').props.style);
    const value = screen.getByText('1h 40m');

    expect(style.flexDirection).toBeUndefined();
    expect(value.props.numberOfLines).toBeUndefined();
    expect(StyleSheet.flatten(value.props.style).flexShrink).toBe(0);
    expect(screen.getByText('Apollo').props.numberOfLines).toBe(2);
  });
});
