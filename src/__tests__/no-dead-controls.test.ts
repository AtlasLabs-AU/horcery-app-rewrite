import { readFileSync } from 'node:fs';
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
  });

  it('components hide their optional actions rather than rendering them inert', () => {
    // Each of these renders an action ONLY when its handler is supplied.
    const guards: [string, RegExp][] = [
      [join('components', 'for-you', 'review-card.tsx'), /onFilter \? \(/],
      [join('components', 'for-you', 'review-card.tsx'), /onSeeHistory \? \(/],
      [join('components', 'for-you', 'organization-card.tsx'), /onSeeHistory \? \(/],
      [join('components', 'for-you', 'organization-card.tsx'), /onManageOrganization \? \(/],
      [join('components', 'for-you', 'organization-card.tsx'), /onManageAlerts \? \(/],
      [
        join('components', 'for-you', 'behavior-tracker-card.tsx'),
        /onSwitchToStalls \? \(/,
      ],
      [join('components', 'for-you', 'header.tsx'), /onSearch \? \(/],
      [join('components', 'for-you', 'header.tsx'), /onCustomize \? \(/],
    ];

    const missing = guards
      .filter(([file, pattern]) => !pattern.test(read(file)))
      .map(([file, pattern]) => `${file} :: ${pattern}`);

    expect(missing).toEqual([]);
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
});
