import { render, fireEvent } from '@testing-library/react-native';
import { Text } from 'react-native';

import { ReviewCard } from '@/components/for-you/review-card';

/**
 * Seed test 2 — component states.
 *
 * PRINCIPLES.md #5 (intuitive) and the standing rule from requirements §6b
 * item 3: **a visible control must navigate, act, be visibly disabled with a
 * reason, or not render.**
 *
 * This file previously asserted the opposite — that the actions render
 * "empty or not", with no handlers — which protected the dead-control bug
 * rather than catching it (review, 2026-08-15). Passing handlers in a unit
 * test also proves nothing about the real screen, so screen-level wiring is
 * asserted in `src/__tests__/no-dead-controls.test.ts`.
 *
 * NOTE — RNTL v14: `render` is async and its cleanup is not awaited between
 * tests, so the GLOBAL `screen` can go stale in a file with several renders
 * (see the note in jest.setup.js). Every test here queries its own render
 * result instead, which is immune to that.
 */
describe('ReviewCard', () => {
  it('renders the empty state, and no actions, when nothing is wired', async () => {
    const view = await render(<ReviewCard />);

    expect(view.getByTestId('for-you-review-empty')).toBeTruthy();
    expect(
      view.getByText(/Stall Monitor will feature recent events/i),
    ).toBeTruthy();

    // A button that does nothing is worse than no button: it teaches the
    // customer the app is broken, and a screen reader announces a control
    // that cannot be operated.
    expect(view.queryByTestId('for-you-review-history')).toBeNull();
    expect(view.queryByLabelText('Filter behaviors')).toBeNull();

    // Wiring one action must not conjure the other. Done as a re-render
    // rather than a third `render` — see the RNTL note above. `rerender` is
    // ASYNC in v14 exactly like `render`; without the await the assertions
    // below run against the previous tree.
    await view.rerender(<ReviewCard onSeeHistory={jest.fn()} />);
    expect(view.getByTestId('for-you-review-history')).toBeTruthy();
    expect(view.queryByLabelText('Filter behaviors')).toBeNull();
  });

  it('renders content instead of the empty state, and invokes wired actions', async () => {
    const onFilter = jest.fn();
    const onSeeHistory = jest.fn();
    const view = await render(
      <ReviewCard onFilter={onFilter} onSeeHistory={onSeeHistory}>
        <Text>Rolling detected at 03:12</Text>
      </ReviewCard>,
    );

    expect(view.getByText('Rolling detected at 03:12')).toBeTruthy();
    expect(view.queryByTestId('for-you-review-empty')).toBeNull();

    const filter = view.getByLabelText('Filter behaviors');
    // PRINCIPLES.md #12 — accessible by default. An icon-only control with no
    // role and label is invisible to a screen reader.
    expect(filter.props.accessibilityRole).toBe('button');

    // `fireEvent.press` is async in RNTL v14 — see the note in jest.setup.js.
    // Without these awaits React logs overlapping act() calls and the following
    // assertions can run against a stale tree.
    await fireEvent.press(filter);
    await fireEvent.press(view.getByTestId('for-you-review-history'));

    expect(onFilter).toHaveBeenCalledTimes(1);
    expect(onSeeHistory).toHaveBeenCalledTimes(1);
  });


});
