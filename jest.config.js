/**
 * Test configuration — jest-expo preset (Expo SDK 57, React 19).
 *
 * Deliberately NOT using react-test-renderer, which is deprecated and does not
 * support React 19. Component tests use @testing-library/react-native.
 */
module.exports = {
  preset: 'jest-expo',
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
