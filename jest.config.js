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
