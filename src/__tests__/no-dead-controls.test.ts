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
});
