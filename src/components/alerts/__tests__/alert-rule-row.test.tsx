import { render } from '@testing-library/react-native';
import { DateTime } from 'luxon';

import { AlertRuleRow } from '@/components/alerts/alert-rule-row';
import { SAMPLE_ALERT_RULES, SAMPLE_ALERT_TYPES, SAMPLE_CURRENT_MEMBER_ID } from '@/config/sample/alerts-sample';
import { resolveDescriptors } from '@/domain/alerts/descriptors';
import { describeRule, type AlertRuleView } from '@/domain/alerts/view';

const { byId } = resolveDescriptors(SAMPLE_ALERT_TYPES);
const JAN = DateTime.fromISO('2026-01-15T12:00:00Z'); // winter: the July-saved sample has drifted

function view(id: string, now = JAN): AlertRuleView {
  const rule = SAMPLE_ALERT_RULES.find((r) => r.id === id)!;
  const v = describeRule(rule, {
    descriptorsById: byId,
    units: 'metric',
    zone: 'America/Chicago',
    zoneFallback: false,
    now,
    currentMemberId: SAMPLE_CURRENT_MEMBER_ID,
  });
  if (!v) throw new Error(`no view for ${id}`);
  return v;
}

describe('AlertRuleRow', () => {
  it('shows the type, the sentence and both scope tags', async () => {
    const v = view('sample-lying-time-single');
    const screen = await render(<AlertRuleRow view={v} />);
    expect(screen.getByText('Lying Down Time')).toBeTruthy();
    expect(screen.getByText(/lie down for more than 2 h/)).toBeTruthy();
    // Tags are hidden from assistive tech (the row label carries them), so
    // look them up as elements rather than as accessible text.
    expect(screen.getByText('2 Horses', { includeHiddenElements: true })).toBeTruthy();
    expect(screen.getByText('Everyone', { includeHiddenElements: true })).toBeTruthy();
  });

  it('labels the whole row with the sentence and tags for a screen reader — never "Alert item"', async () => {
    const v = view('sample-people-time-total');
    const screen = await render(<AlertRuleRow view={v} />);
    const row = screen.getByTestId('alert-rule-sample-people-time-total');
    expect(row.props.accessibilityLabel).toContain('People in Stall Time');
    expect(row.props.accessibilityLabel).toContain('someone is in your stall for more than 2 h 30 min in total');
    expect(row.props.accessibilityLabel).toContain('All Stalls, Me');
    expect(row.props.accessibilityLabel).not.toContain('Alert item');
  });

  it('is a button ONLY when a press is wired (read-only slice: no dead control)', async () => {
    const v = view('sample-light-high');
    const inert = await render(<AlertRuleRow view={v} />);
    expect(inert.getByTestId('alert-rule-sample-light-high').props.accessibilityRole).toBeUndefined();

    const onPress = jest.fn();
    const wired = await render(<AlertRuleRow view={v} onPress={onPress} />);
    expect(wired.getByTestId('alert-rule-sample-light-high').props.accessibilityRole).toBe('button');
  });

  it('shows the drift badge only when the stored window has moved since it was saved', async () => {
    const drifted = await render(<AlertRuleRow view={view('sample-temp-drift', JAN)} />);
    expect(drifted.getByTestId('sample-temp-drift-drift')).toBeTruthy();
    expect(drifted.getByText(/Shifted 1 h since the clocks changed/)).toBeTruthy();

    // Same rule, read in the season it was saved: nothing has moved.
    const JULY = DateTime.fromISO('2026-07-15T12:00:00Z');
    const fresh = await render(<AlertRuleRow view={view('sample-temp-drift', JULY)} />);
    expect(fresh.queryByTestId('sample-temp-drift-drift')).toBeNull();

    // A rule saved by the old app has no metadata: we claim nothing.
    const oldApp = await render(<AlertRuleRow view={view('sample-temp-imperial', JAN)} />);
    expect(oldApp.queryByTestId('sample-temp-imperial-drift')).toBeNull();
  });

  it('reads an imperial author\'s rule in their own units', async () => {
    const rule = SAMPLE_ALERT_RULES.find((r) => r.id === 'sample-temp-imperial')!;
    const v = describeRule(rule, {
      descriptorsById: byId,
      units: 'imperial',
      zone: 'America/Chicago',
      zoneFallback: false,
      now: JAN,
      currentMemberId: null,
    })!;
    const screen = await render(<AlertRuleRow view={v} />);
    expect(screen.getByText(/temperature is more than 30 °F/)).toBeTruthy();
  });
});
