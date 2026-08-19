import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * Seed test 4 — the standing rule, enforced at the screen level.
 *
 * Requirements §6b item 3: a visible interactive element must navigate, act,
 * be visibly disabled with a reason, or not render.
 *
 * A component unit test cannot prove this: it supplies its own handlers, so a
 * screen that forgets to wire one still passes. This test reads the SCREENS
 * and asserts that any control-bearing prop they pass is either absent (the
 * component then hides the control) or a real handler — never a placeholder.
 *
 * It is deliberately source-level rather than render-level: rendering For You
 * needs the API, a session and an organization, which is a journey test (H5),
 * not a fast gate. This catches the specific regression cheaply, today.
 */
const SRC = join(__dirname, '..');

function read(rel: string) {
  return readFileSync(join(SRC, rel), 'utf8');
}

describe('no dead controls on the screens', () => {
  it('For You passes no empty or no-op handlers', () => {
    const body = read(join('app', '(tabs)', 'index.tsx'));

    // `onX={() => {}}` / `onX={undefined}` / `onX={noop}` are the shapes that
    // produce a control that renders but does nothing.
    const noOps = body.match(/on[A-Z]\w*=\{\s*\(\s*\)\s*=>\s*\{\s*\}\s*\}/g) ?? [];
    const undefineds = body.match(/on[A-Z]\w*=\{undefined\}/g) ?? [];

    expect([...noOps, ...undefineds]).toEqual([]);
    expect(body).toContain('onManageAlerts={openAlerts}');
  });

  it('removes retired Home search instead of leaving an inert icon', () => {
    const header = read(join('components', 'for-you', 'header.tsx'));

    expect(header).not.toContain('for-you-search-button');
    expect(header).not.toMatch(/name="search"/);
    expect(header).not.toContain('onSearch');
  });

  it('only renders Give Feedback when it has a real destination', () => {
    const more = read(join('app', '(tabs)', 'more.tsx'));

    expect(more).toContain('const feedbackUrl = config.web.FEEDBACK_FORM_URL.trim()');
    expect(more).toMatch(/\{feedbackUrl \? \([\s\S]*onPress=\{openFeedback\}/);
    expect(more).toContain('Linking.openURL(feedbackUrl)');
  });

  it('dismisses the native sheet through its imperative close method', () => {
    const menu = read(join('components', 'ui', 'menu.tsx'));

    // A state-only `setOpen(false)` from inside the native host left the
    // visible X inert on iOS. Every app sheet uses this shared wrapper, so the
    // close affordance and action rows must both call the native modal itself.
    expect(menu).toContain('sheetRef.current?.close()');
    expect(menu).toContain('ref={sheetRef}');
    expect(menu).toContain('onPress={closeSheet}');
    expect(menu).toContain("accessibilityLabel={multiSelect ? 'Done' : 'Close'}");
  });

  it('never claims a control is a button unconditionally', () => {
    /**
     * Inakshi chose the "visibly disabled" branch of the rule on 2026-08-15:
     * unwired controls stay on screen, dimmed, so a page can be judged whole.
     * The danger that swaps in is a control that still ANNOUNCES itself as a
     * button. Every component below takes optional handlers, so none of them
     * may hard-code a button role — it has to be conditional on the handler.
     *
     * Per-control behaviour is asserted by render in the component tests;
     * this is the cheap sweep that catches a new component forgetting.
     */
    const files = [
      join('components', 'for-you', 'review-card.tsx'),
      join('components', 'for-you', 'organization-card.tsx'),
      join('components', 'for-you', 'header.tsx'),
      join('components', 'for-you', 'link-button.tsx'),
      join('components', 'horses', 'horse-card.tsx'),
    ];

    const offenders = files.filter((file) =>
      /accessibilityRole="button"/.test(read(file)),
    );

    expect(offenders).toEqual([]);
  });

  it('rows without a destination drop their button role', () => {
    // More and the main menu render every row, wired or not; the unwired ones
    // must not claim to be buttons.
    for (const file of [join('app', '(tabs)', 'more.tsx'), join('app', 'menu.tsx')]) {
      const body = read(file);
      expect(body).toMatch(/accessibilityRole=\{wired \? 'button' : undefined\}/);
      expect(body).toMatch(/disabled=\{!wired\}/);
    }
  });

  it('keeps unfinished Horses writes visibly disabled and removes fake routes', () => {
    const groupChips = read(join('components', 'horses', 'group-chips.tsx'));
    const horseCard = read(join('components', 'horses', 'horse-card.tsx'));

    expect(groupChips).not.toContain('router.push');
    expect(horseCard).not.toContain('router.push');
    expect(groupChips.match(/disabled: true/g)?.length).toBe(3);
    expect(horseCard.match(/disabled: true/g)?.length).toBe(3);

    for (const route of [
      'delete-horse.tsx',
      'group-form.tsx',
      'group-management.tsx',
      'horse-form.tsx',
      'horse-groups.tsx',
    ]) {
      expect(existsSync(join(SRC, 'app', '(tabs)', 'horses', route))).toBe(false);
    }
  });

  it('keeps the Horse Details writes visibly disabled and routes nowhere', () => {
    const detail = read(join('app', '(tabs)', 'horses', '[id].tsx'));
    const stallCard = read(join('components', 'horses', 'horse-stall-card.tsx'));

    // Edit, Manage Groups, Remove — the same three the list card offers, and
    // all three dimmed until the write side exists.
    expect(detail.match(/disabled: true/g)?.length).toBe(3);
    expect(detail).not.toContain('router.push');

    // Re-assign and the stall row are disabled by being non-interactive
    // Views, so they must not claim a button role or hold a press handler.
    expect(stallCard).not.toContain('accessibilityRole="button"');
    expect(stallCard).not.toContain('onPress');
    expect(stallCard).not.toContain('Pressable');
  });

  it('keeps the alerts screens honest (A3: create/edit built, saving gated)', () => {
    const list = read(join('app', 'alerts', 'index.tsx'));
    const row = read(join('components', 'alerts', 'alert-rule-row.tsx'));
    const configure = read(join('app', 'alerts', 'configure.tsx'));
    const scopeRow = read(join('components', 'alerts', 'scope-row.tsx'));

    // The "+" and the empty-state button exist ONLY for roles that may create.
    expect(list).toMatch(/headerRight: permissions\.create/);
    expect(list).toMatch(/permissions\.create \? \(/);
    // A row is a button only when a press is wired.
    expect(row).toMatch(/accessibilityRole=\{onPress \? 'button' : undefined\}/);
    expect(row).toMatch(/disabled=\{!onPress\}/);
    // Save: role and press only when it can act; otherwise the reason is on screen.
    expect(configure).toMatch(/accessibilityRole=\{canPressSave \? 'button' : undefined\}/);
    expect(configure).toMatch(/disabled=\{!canPressSave\}/);
    expect(configure).toContain('configure-save-reason');
    // Delete is not a button in A3 — it is text with its reason beside it.
    expect(configure).toContain('deleteReason');
    expect(configure).not.toMatch(/accessibilityLabel="Remove alert"[\s\S]*accessibilityRole="button"/);
    // The service is never called from Configure in A3.
    expect(configure).not.toContain('alertRuleService');
    expect(configure).not.toContain('useMutation');
    // Scope rows drop their button role when read-only.
    expect(scopeRow).toMatch(/accessibilityRole=\{disabled \? undefined : 'button'\}/);
  });

  it('keeps the date bar arrows honest at the ends of the range', () => {
    const bar = read(join('components', 'horses', 'horse-date-bar.tsx'));

    // At the first day of the horse's life and at today, the arrows cannot
    // act. They must lose the button role rather than announce a button that
    // does nothing, and they must say WHY they are disabled — a bare dimmed
    // chevron leaves the reader guessing whether the app is broken.
    expect(bar).toMatch(/accessibilityRole=\{enabled \? 'button' : undefined\}/);
    expect(bar).toContain('disabled={!enabled}');
    expect(bar).toContain('No earlier days for this horse');
    expect(bar).toContain('Today is the latest day');
  });

  it('does not reintroduce the removed surfaces on Horse Details', () => {
    const detail = read(join('app', '(tabs)', 'horses', '[id].tsx'));
    // D4 no feedback card, D8 no Special Instructions, D1 no settings cog —
    // each decided 2026-08-17 and each easy to re-add by accident during a
    // later parity pass.
    // Match rendered components and imports, not prose: the file's own header
    // names these decisions, and a test that trips on its own documentation
    // teaches people to delete the documentation.
    const rendered = detail.match(/<[A-Z][A-Za-z]*/g) ?? [];
    const imported = detail.match(/^import .*$/gm) ?? [];
    const surface = [...rendered, ...imported].join('\n');

    expect(surface).not.toMatch(/feedback/i);
    expect(surface).not.toMatch(/special.?instruction/i);
    expect(surface).not.toMatch(/animal-settings|settings-page/i);
    // The cog is what D1 removed; the ⋮ replaced it.
    expect(detail).not.toMatch(/name="settings"\s+size=\{\d+\}\s+color=\{colors\.(accent|foreground)\}/);
  });
});
