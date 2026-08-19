/**
 * Test configuration — jest-expo preset (Expo SDK 57, React 19).
 *
 * Deliberately NOT using react-test-renderer, which is deprecated and does not
 * support React 19. Component tests use @testing-library/react-native.
 */
module.exports = {
  preset: 'jest-expo',
  // Reanimated 4 boots react-native-worklets at import time, and its `.native`
  // entry point reaches for a native module jest does not have — importing
  // anything from reanimated fails with "Cannot read properties of undefined
  // (reading 'loadUnpackers')" before a test runs. Worklets ships this resolver
  // for exactly that: it drops the `.native` extension inside the package so
  // the JS implementation is loaded instead.
  resolver: 'react-native-worklets/jest/resolver.js',
  // jest.env.js runs BEFORE modules load (src/config/env throws at import time
  // when endpoints are unset); jest.setup.js runs after the framework is ready.
  setupFiles: ['<rootDir>/jest.env.js'],
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  testMatch: ['**/__tests__/**/*.test.{ts,tsx}', '**/*.test.{ts,tsx}'],
  // spikes/ holds throwaway measurement apps with their OWN package.json and
  // node_modules (the §6a chart harness). They are not part of the app: keep
  // their modules out of the haste map (duplicate-package collisions) and
  // their tests, if any, out of this run.
  modulePathIgnorePatterns: ['<rootDir>/spikes/'],
  testPathIgnorePatterns: ['/node_modules/', '<rootDir>/spikes/'],
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/**/*.d.ts',
    '!src/app/**', // routes are covered by component tests of what they render
  ],
};
