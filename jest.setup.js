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
 * KNOWN QUIRK — React Native Testing Library v14.
 *
 * `render` is async in v14 and its automatic cleanup is not awaited between
 * tests. In a file with several renders, a later test can occasionally query an
 * empty tree — the tell-tale symptom is a test that passes on its own and when
 * reordered, but fails in sequence.
 *
 * Explicitly awaiting `cleanup()` in an `afterEach` was tried and does NOT fix
 * it, so it is deliberately not done here. If you hit this: prefer fewer, richer
 * renders per file over many near-identical ones, and assert related things
 * inside a single render rather than re-rendering the same component.
 */
