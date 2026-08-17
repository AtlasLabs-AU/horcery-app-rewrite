import { fireEvent, render } from '@testing-library/react-native';

import { AlertDetailsCard } from '@/components/alerts/alert-details-card';
import { ScopeRow } from '@/components/alerts/scope-row';
import { WindowCard } from '@/components/alerts/window-card';
import { resolveDescriptors } from '@/domain/alerts/descriptors';
import { emptyForm } from '@/domain/alerts/payload';
import type { ServerAlertType } from '@/domain/alerts/types';
import { validate } from '@/domain/alerts/validate';

import typesFixture from '@/domain/alerts/__fixtures__/alert-types.json';

const { list, bySlug } = resolveDescriptors(typesFixture as unknown as ServerAlertType[]);
const ZONE = 'America/Chicago';

describe('AlertDetailsCard renders every real alert type from its descriptor', () => {
  it.each(list.map((d) => [d.slug, d] as const))('%s', async (_slug, descriptor) => {
    const form = emptyForm(descriptor, ZONE);
    const dispatch = jest.fn();
    const screen = await render(
      <AlertDetailsCard form={form} descriptor={descriptor} units="metric" errors={validate(form, descriptor)} dispatch={dispatch} disabled={false} />,
    );
    expect(screen.getByTestId('alert-details')).toBeTruthy();
    // the field set follows the descriptor, not the slug
    if (descriptor.conditions.length > 1) expect(screen.getByTestId('field-condition')).toBeTruthy();
    if (descriptor.threshold.kind === 'boolean') expect(screen.getByTestId('field-boolean')).toBeTruthy();
    if (descriptor.threshold.kind === 'selection') expect(screen.getByTestId('field-selection')).toBeTruthy();
    if (descriptor.basedOn) expect(screen.getByTestId('field-based-on')).toBeTruthy();
    if (descriptor.queryRange) expect(screen.getByTestId('field-query-range')).toBeTruthy();
    if (descriptor.threshold.kind === 'duration' || descriptor.triggerDuration) {
      expect(screen.getByTestId('field-duration-presets')).toBeTruthy();
    }
  });

  it('a boolean type toggles through dispatch', async () => {
    const d = bySlug.get('entering-stall')!;
    const form = emptyForm(d, ZONE);
    const dispatch = jest.fn();
    const screen = await render(
      <AlertDetailsCard form={form} descriptor={d} units="metric" errors={{}} dispatch={dispatch} disabled={false} />,
    );
    // The universal Toggle fallback is a Switch-like control; flip it.
    await fireEvent(screen.getByTestId('field-boolean'), 'valueChange', false);
    expect(dispatch).toHaveBeenCalledWith({ type: 'boolean', value: false });
  });

  it('shows the error under the field, and the generic note for unknown types', async () => {
    const d = bySlug.get('temp-change')!;
    const form = { ...emptyForm(d, ZONE), queryRangeMinutes: null };
    const screen = await render(
      <AlertDetailsCard form={form} descriptor={d} units="metric" errors={validate(form, d)} dispatch={jest.fn()} disabled={false} />,
    );
    expect(screen.getByText('Enter a value for "within any".')).toBeTruthy();

    const generic = { ...d, slug: 'generic', isGeneric: true };
    const g = await render(
      <AlertDetailsCard form={emptyForm(generic, ZONE)} descriptor={generic} units="metric" errors={{}} dispatch={jest.fn()} disabled={false} />,
    );
    expect(g.getByText(/showing basic settings/)).toBeTruthy();
  });
});

describe('WindowCard', () => {
  it('states the barn zone; shouts when it is a fallback; shows the drift banner', async () => {
    const d = bySlug.get('temperature')!;
    const dispatch = jest.fn();
    const any = await render(
      <WindowCard window={emptyForm(d, ZONE).window} drift={null} dispatch={dispatch} disabled={false} />,
    );
    expect(any.getByTestId('alert-window-zone').props.children).toContain('Times are in barn time (America/Chicago).');
    expect(any.queryByTestId('field-window-start')).toBeNull();

    const fallback = await render(
      <WindowCard
        window={{ mode: 'custom', start: { hour: 6, minute: 0 }, end: { hour: 18, minute: 0 }, zone: 'Asia/Colombo', zoneFallback: true }}
        drift={{ kind: 'offset', minutes: -60 }}
        dispatch={dispatch}
        disabled={false}
      />,
    );
    expect(fallback.getByTestId('alert-window-zone').props.children).toContain('using your phone’s');
    expect(fallback.getByTestId('field-window-start')).toBeTruthy();
    expect(fallback.getByTestId('field-window-end')).toBeTruthy();
    expect(fallback.getByTestId('alert-window-drift')).toBeTruthy();
    expect(fallback.getByText(/Shifted 1 h since the clocks changed/)).toBeTruthy();
  });
});

describe('ScopeRow', () => {
  it('is a button only when enabled, and shows the scope error under it', async () => {
    const onPress = jest.fn();
    const live = await render(<ScopeRow icon="horse" title="Apply to" value="All Horses" onPress={onPress} disabled={false} testID="row" />);
    expect(live.getByTestId('row').props.accessibilityRole).toBe('button');
    await fireEvent.press(live.getByTestId('row'));
    expect(onPress).toHaveBeenCalled();

    const dead = await render(
      <ScopeRow icon="horse" title="Apply to" value="No Horses" onPress={onPress} disabled error="Choose at least one horse." testID="row" />,
    );
    expect(dead.getByTestId('row').props.accessibilityRole).toBeUndefined();
    expect(dead.getByText('Choose at least one horse.')).toBeTruthy();
  });
});
