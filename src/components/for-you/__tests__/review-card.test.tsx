import { render, screen, fireEvent } from '@testing-library/react-native';
import { Text } from 'react-native';

import { ReviewCard } from '@/components/for-you/review-card';

/**
 * Seed test 2 — component states.
 *
 * PRINCIPLES.md #5 (intuitive) and the §6b rule that a visible control must act
 * or not render. An empty state is a first-class layout here, not an accident of
 * having no data, so it is asserted as one.
 *
 * NOTE: React Native Testing Library v14 made `render` ASYNC (it awaits `act`
 * internally). Every render must be awaited — a forgotten `await` fails with the
 * misleading "`render` function has not been called".
 */
describe('ReviewCard', () => {
  it('renders the empty state when there is nothing to review', async () => {
    await render(<ReviewCard />);

    expect(screen.getByTestId('for-you-review-empty')).toBeTruthy();
    expect(
      screen.getByText(/Stall Monitor will feature recent events/i),
    ).toBeTruthy();
  });

  it('renders content instead of the empty state when there is something to review', async () => {
    await render(
      <ReviewCard>
        <Text>Rolling detected at 03:12</Text>
      </ReviewCard>,
    );

    expect(screen.getByText('Rolling detected at 03:12')).toBeTruthy();
    expect(screen.queryByTestId('for-you-review-empty')).toBeNull();
  });

  it('always offers its actions, accessibly, empty or not', async () => {
    await render(<ReviewCard />);

    expect(screen.getByTestId('for-you-review-history')).toBeTruthy();

    // PRINCIPLES.md #12 — accessible by default. An icon-only control with no
    // role and label is invisible to a screen reader.
    const filter = screen.getByLabelText('Filter behaviors');
    expect(filter.props.accessibilityRole).toBe('button');
  });

  it('invokes the handlers its controls advertise', async () => {
    const onFilter = jest.fn();
    const onSeeHistory = jest.fn();
    await render(<ReviewCard onFilter={onFilter} onSeeHistory={onSeeHistory} />);

    fireEvent.press(screen.getByLabelText('Filter behaviors'));
    fireEvent.press(screen.getByTestId('for-you-review-history'));

    expect(onFilter).toHaveBeenCalledTimes(1);
    expect(onSeeHistory).toHaveBeenCalledTimes(1);
  });
});
