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
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/**/*.d.ts',
    '!src/app/**', // routes are covered by component tests of what they render
  ],
};
