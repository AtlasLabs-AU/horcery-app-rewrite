/**
 * Hermetic test environment.
 *
 * Runs as a `setupFiles` entry — before any module is imported — because
 * src/config/env throws at import time if its endpoints are unset. That guard is
 * deliberate (it stops the app silently defaulting to the production API, which
 * is a real bug in the current app), so tests supply obviously-fake values
 * rather than weakening it.
 *
 * These hosts use the reserved .invalid TLD: if a test ever escapes its mocks
 * and attempts a real request, it fails to resolve instead of reaching a live
 * Horcery service.
 */
process.env.EXPO_PUBLIC_BASE_SERVICE_URL = 'https://api.horcery.invalid/';
process.env.EXPO_PUBLIC_FEDERATED_PROMETHEUS_BASE_URL =
  'https://metrics.horcery.invalid/api/v1';
process.env.EXPO_PUBLIC_ACCOUNT_MANAGEMENT_URL =
  'https://accounts.horcery.invalid/';

// Never enable production writes from a test run.
process.env.EXPO_PUBLIC_ALLOW_PRODUCTION_WRITES = 'false';
// Previews off by default so tests assert real behaviour, not preview stand-ins.
process.env.EXPO_PUBLIC_ENABLE_PREVIEWS = 'false';
