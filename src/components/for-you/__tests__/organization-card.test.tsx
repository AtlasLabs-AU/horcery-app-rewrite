import { render } from '@testing-library/react-native';

import { OrganizationCard } from '@/components/for-you/organization-card';
import type { AlertStatus } from '@/hooks/use-alert-status';

/**
 * Component states — loading and unavailable especially.
 *
 * This is requirements §6b finding 2, which is the most consequential bug found
 * in the promoted slice: the card hardcoded "Everything looks normal" beside a
 * green dot. On a monitoring product that is not a cosmetic defect. If the
 * alert query is still in flight, or has failed, the customer is told their
 * horses are fine by an app that does not know.
 *
 * So these tests are mostly about what must NOT be on screen. Asserting that
 * the loading state renders a spinner is easy and nearly worthless; asserting
 * that it does not simultaneously claim everything is normal is the test that
 * would have caught the bug.
 */

const baseProps = {
  organizationName: 'Willow Creek',
  organizations: [{ id: 'org-1', name: 'Willow Creek' }],
  organizationID: 'org-1',
  onSelectOrganization: jest.fn(),
  localTime: '10:29 am',
};

const renderWith = (alertStatus: AlertStatus) =>
  render(<OrganizationCard {...baseProps} alertStatus={alertStatus} />);

/** The reassurances that may only ever appear alongside a known-good state. */
function expectNoReassurance(view: Awaited<ReturnType<typeof renderWith>>) {
  expect(view.queryByText('Everything looks normal')).toBeNull();
  // "AI watching N metrics" implies a working alert pipeline.
  expect(view.queryByText(/AI watching/)).toBeNull();
  expect(view.queryByTestId('for-you-manage-alerts')).toBeNull();
}

describe('OrganizationCard alert status', () => {
  it('shows a spinner while loading, and claims nothing about health', async () => {
    const view = await renderWith({ kind: 'loading' });

    expect(view.getByTestId('for-you-alert-status-loading')).toBeTruthy();
    expect(view.getByText('Checking alerts…')).toBeTruthy();
    expectNoReassurance(view);
  });

  it('says so when the status is unavailable, rather than falling back to normal', async () => {
    const view = await renderWith({ kind: 'unavailable' });

    expect(view.getByTestId('for-you-alert-status-unavailable')).toBeTruthy();
    expect(view.getByText('Alert status unavailable')).toBeTruthy();
    expectNoReassurance(view);
  });

  it('distinguishes "no alerts configured" from "no alerts firing"', async () => {
    const view = await renderWith({ kind: 'not_set' });

    // These two are the states most easily conflated, and conflating them is
    // how a barn with zero alert rules is told everything looks normal.
    expect(view.getByText('No alerts set')).toBeTruthy();
    expectNoReassurance(view);
  });

  it('reassures only when the alert pipeline is known good', async () => {
    const view = await renderWith({ kind: 'normal', rulesConfigured: 4 });

    expect(view.getByTestId('for-you-alert-status-normal')).toBeTruthy();
    expect(view.getByText('Everything looks normal')).toBeTruthy();
    expect(view.getByText('AI watching 4 metrics')).toBeTruthy();
  });

  it('reports the day’s alerts, and counts one correctly', async () => {
    const many = await renderWith({ kind: 'today', count: 3, rulesConfigured: 4 });
    expect(many.getByText('3 alerts today')).toBeTruthy();
    expect(many.queryByText('Everything looks normal')).toBeNull();

    const one = await renderWith({ kind: 'today', count: 1, rulesConfigured: 1 });
    // An off-by-one in pluralisation is trivial; "1 alerts today" on a barn
    // manager's phone at 3am is not the tone this product wants.
    expect(one.getByText('1 alert today')).toBeTruthy();
    expect(one.getByText('AI watching 1 metric')).toBeTruthy();
  });

  it('shows unwired actions dimmed and inert, never as buttons', async () => {
    /**
     * The standing rule (§6b finding 3) allows either branch: not rendering,
     * or rendering VISIBLY DISABLED. Inakshi chose the second on 2026-08-15 —
     * she cannot sign off a page's look and feel if half of it is missing —
     * so an unwired action stays on screen but must not claim to be operable:
     * no button role, and disabled so it cannot be pressed.
     */
    const view = await renderWith({ kind: 'normal', rulesConfigured: 2 });

    const history = view.getByTestId('for-you-ai-history');
    expect(history.props.accessibilityRole).toBeUndefined();
    expect(history.props.accessibilityState?.disabled).toBe(true);

    const manage = view.getByTestId('for-you-manage-alerts');
    expect(manage.props.accessibilityRole).toBeUndefined();
    expect(manage.props.accessibilityState?.disabled).toBe(true);
  });
});
