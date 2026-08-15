// expo-symbols renders SF Symbols natively; in tests it only needs to be a
// recognisable placeholder so queries can assert around it.
jest.mock('expo-symbols', () => {
  const React = require('react');
  return {
    SymbolView: ({ name, ...rest }) =>
      React.createElement('SymbolView', { testID: `symbol-${name}`, ...rest }),
  };
});

// Silence the Reanimated startup warning in test output.
global.__reanimatedWorkletInit = () => {};

/**
 * REACT NATIVE TESTING LIBRARY v14 — everything that touches the tree is ASYNC.
 *
 *     await render(<X />)
 *     await view.rerender(<X />)
 *     await fireEvent.press(button)
 *     await userEvent.press(button)
 *
 * `fireEvent.press` returns `Promise<void>`; so do `render` and `rerender`.
 * Each wraps its work in `act()`, so a missing `await` leaves an act() scope
 * open while the next one starts. Two symptoms follow, and neither one names
 * its cause:
 *
 *   1. "You seem to have overlapping act() calls" on the console, while the
 *      test still reports PASS.
 *   2. Assertions running against the PREVIOUS tree — an element that is
 *      plainly in the markup "cannot be found", or a handler that was pressed
 *      appears never to have been called. Passes alone, fails in sequence.
 *
 * An earlier note in this file called this a library quirk and said awaiting
 * `cleanup()` did not help. That was wrong on both counts (2026-08-15): RNTL's
 * auto-cleanup already awaits itself, and the real cause was our own un-awaited
 * calls. If you see either symptom, look for a missing `await` first.
 *
 * The console guard below turns symptom 1 into a test failure, so this can no
 * longer be discovered by reading scrollback.
 */

// ---------------------------------------------------------------------------
// Console guard — an unexpected console.error/console.warn FAILS the test.
//
// Without it a suite reports PASS while React prints real complaints
// underneath: overlapping act() calls, updates outside act, key warnings.
// Every one of those is React saying the test is not exercising the component
// the way the app does. Once a suite has two accepted errors nobody reads the
// third, which is how a genuine regression arrives silently — a sharper risk
// here than on a human-reviewed project, because nobody is watching the
// scrollback of an agent's test run.
//
// A test that legitimately drives a warning path opts in:
//
//     expectConsole(/deprecated/);
//
// The console is patched ONCE and never restored, so output emitted during
// teardown (RNTL's cleanup runs after the test body) stays inside the net
// instead of escaping it. That way the guard does not depend on the order Jest
// happens to run afterEach hooks in.
// ---------------------------------------------------------------------------

const REAL_ERROR = console.error;
const REAL_WARN = console.warn;

/** @type {{ level: string, text: string }[]} */
let captured = [];
/** @type {RegExp[]} */
let allowed = [];

const format = (args) =>
  args
    .map((arg) => (arg instanceof Error ? (arg.stack ?? arg.message) : String(arg)))
    .join(' ');

console.error = (...args) => {
  captured.push({ level: 'error', text: format(args) });
  REAL_ERROR(...args); // still visible while debugging
};

console.warn = (...args) => {
  captured.push({ level: 'warn', text: format(args) });
  REAL_WARN(...args);
};

/**
 * Declare that this test expects console output matching `pattern`. Matching
 * output is permitted; everything else still fails.
 *
 * @param {RegExp} pattern
 */
global.expectConsole = (pattern) => {
  allowed.push(pattern);
};

/**
 * Returns the captured output that no `expectConsole` pattern accounts for, and
 * clears the buffer. Exposed so `console-guard.test.ts` can exercise this exact
 * filter rather than a copy of it — a guard nobody tests is a guard nobody
 * knows is working.
 *
 * @returns {{ level: string, text: string }[]}
 */
function drainUnexpected() {
  const unexpected = captured.filter(
    ({ text }) => !allowed.some((pattern) => pattern.test(text)),
  );
  captured = [];
  return unexpected;
}

global.__drainUnexpectedConsole = drainUnexpected;

function assertConsoleClean(scope) {
  const unexpected = drainUnexpected();

  if (unexpected.length === 0) return;

  const detail = unexpected
    .map(({ level, text }) => `  console.${level}: ${text.split('\n')[0]}`)
    .join('\n');

  throw new Error(
    `Unexpected console output during ${scope}:\n${detail}\n\n` +
      'React does not print these for decoration — each one means the test is ' +
      'not driving the component the way the app does. Fix the cause; if the ' +
      'output is genuinely expected, opt in with expectConsole(/pattern/).',
  );
}

beforeEach(() => {
  captured = [];
  allowed = [];
});

// Runs after the test body. Anything produced during teardown lands in
// `captured` too and is reported against the next test, or by the final sweep.
afterEach(() => {
  assertConsoleClean('this test');
});

afterAll(() => {
  assertConsoleClean('teardown');
});
