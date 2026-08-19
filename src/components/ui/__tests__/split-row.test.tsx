import { render, screen } from '@testing-library/react-native';
import { StyleSheet, Text, useWindowDimensions } from 'react-native';

import { SplitRow } from '@/components/ui/split-row';
import { STACK_ABOVE_SCALE } from '@/hooks/use-text-scale';

jest.mock('react-native/Libraries/Utilities/useWindowDimensions');

const mockedDimensions = useWindowDimensions as jest.MockedFunction<
  typeof useWindowDimensions
>;

/** The reader's text size, as `useWindowDimensions` reports it. */
function atTextScale(fontScale: number) {
  mockedDimensions.mockReturnValue({ width: 390, height: 844, scale: 3, fontScale });
}

/** The row's own style, flattened — RN hands it over as a nested array. */
const rowStyle = () => StyleSheet.flatten(screen.getByTestId('row').props.style) ?? {};

const row = (
  <SplitRow
    testID="row"
    leading={<Text>Behavior Tracker</Text>}
    trailing={<Text>Switch to Stalls</Text>}
  />
);

describe('SplitRow', () => {
  it('keeps a label and its action on one line at the default text size', async () => {
    atTextScale(1);
    await render(row);

    expect(rowStyle().flexDirection).toBe('row');
  });

  it('stacks the action below the label once the text is large', async () => {
    // The failure this prevents: at large text the label is the only thing that
    // can shrink, so it does — "Behavior Tracker" became "Behavior Trac…" one
    // notch above the default size on the largest iPhone we have. Stacking is
    // what gives the label the whole width instead (device, 2026-08-19; the
    // same fault the shipping app is patching in PR 2174).
    atTextScale(STACK_ABOVE_SCALE);
    await render(row);

    expect(rowStyle().flexDirection).toBeUndefined();
  });

  it('lets a row insist on one line when the control must stay beside its label', async () => {
    atTextScale(3);
    await render(
      <SplitRow
        testID="row"
        stack={false}
        leading={<Text>Label</Text>}
        trailing={<Text>Action</Text>}
      />,
    );

    expect(rowStyle().flexDirection).toBe('row');
  });

  it('does not build a two-sided layout when there is nothing on the right', async () => {
    atTextScale(1);
    await render(<SplitRow testID="row" leading={<Text>Alone</Text>} />);

    expect(screen.getByText('Alone')).toBeTruthy();
  });
});
