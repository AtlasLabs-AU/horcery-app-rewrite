// Horcery rewrite — the lint BASELINE.
//
// `npm run lint` runs with `--max-warnings=0`, so a warning fails the build the
// same as an error. That is only honest if the pre-existing violations are a
// short, named, shrinking list rather than permanent background noise — which is
// what this file is.
//
// It lives in its own module so it can be ASSERTED. `src/__tests__/lint-baseline.test.ts`
// lints the tree with these exceptions removed and requires the resulting set of
// offending files to equal this list exactly. That means:
//
//   * a NEW violation cannot be hidden by quietly adding an entry here — the
//     test names the file and the diff shows it;
//   * a FIXED violation cannot leave a stale exception behind — the test fails
//     until the entry is deleted.
//
// So the list can only shrink, and it is provably the truth rather than a claim.
//
// Every entry needs: what is exempt, why it is not being fixed in this slice,
// and which task removes it. No entry is an approval of the code it covers.

/**
 * @typedef {object} BaselineEntry
 * @property {string}   id      Stable identifier, used in test failure output.
 * @property {string[]} files   Exact paths — never a directory glob.
 * @property {string[]} rules   The rules switched off for those paths.
 * @property {string}   reason  Why this is not fixed here.
 * @property {string}   owner   The task that deletes this entry.
 */

/** @type {BaselineEntry[]} */
const BASELINE = [
  {
    id: 'menu-animation-refs',
    files: ['src/app/menu.tsx'],
    rules: ['react-hooks/refs'],
    reason:
      'The slide-in panel holds its Animated.Value in a ref and reads it during render to build the transform. React Compiler is right that this is a ref read in render; the fix is a real animation refactor (useAnimatedValue or Reanimated shared value), which changes motion behaviour and cannot be validated by lint.',
    owner: 'Menu animation refactor — scheduled with the localization slice, which rewrites this screen anyway.',
  },
  {
    id: 'auth-flow-unused-import',
    files: ['src/components/auth/auth-flow.tsx'],
    rules: ['@typescript-eslint/no-unused-vars'],
    reason:
      'A dead React import. One-token fix, but this file is being edited in a concurrent session; touching line 2 here would collide with that work for no benefit.',
    owner: 'Preview-auth slice (requirements §6b finding 4), which compiles this file out of production builds.',
  },
  {
    id: 'for-you-data-unused-import',
    files: ['src/hooks/use-for-you-data.ts'],
    rules: ['@typescript-eslint/no-unused-vars'],
    reason:
      'An unused `DateTime` import left over from the organization-clock work. Same concurrent-edit reason as above.',
    owner: 'Organization clock slice (requirements §6b finding 9).',
  },
];

/** The baseline as ESLint flat-config blocks. */
const baselineBlocks = () =>
  BASELINE.map(({ files, rules }) => ({
    files,
    rules: Object.fromEntries(rules.map((rule) => [rule, 'off'])),
  }));

module.exports = { BASELINE, baselineBlocks };
