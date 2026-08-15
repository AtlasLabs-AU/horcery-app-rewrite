/**
 * Globals installed by `jest.setup.js`. Declared here so tests get them typed
 * without importing anything, matching how `jest` and `expect` already work.
 */

/**
 * Declare that the current test expects console output matching `pattern`.
 * Matching output is permitted; anything else fails the test.
 */
declare function expectConsole(pattern: RegExp): void;
