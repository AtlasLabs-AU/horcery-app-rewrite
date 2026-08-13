/**
 * Environment configuration.
 *
 * Ported from the current app's `packages/config/src/env/index.ts` with ONE
 * deliberate change: **no silent fallback to production**.
 *
 * The original defaults a missing `EXPO_PUBLIC_BASE_SERVICE_URL` to
 * `https://api.magichoof.com/` — the production API — so a misconfigured build
 * quietly talks to live customer data instead of failing. Here, the endpoints
 * that decide *which backend we talk to* are required: if one is missing the
 * app throws at startup with the name of the variable to set.
 *
 * Cosmetic values (support links, blur-hash placeholder) keep their defaults;
 * getting those wrong is harmless.
 */

/** Reads a variable that determines which backend we talk to. No default. */
function requiredEndpoint(name: string, value: string | undefined): string {
  if (!value || value.trim() === '') {
    throw new Error(
      `Missing required environment variable ${name}. ` +
        `Set it in .env.local (see .env.example). Refusing to start rather ` +
        `than silently defaulting to the production API.`,
    );
  }
  return value;
}

const BASE_SERVICE_URL = requiredEndpoint(
  'EXPO_PUBLIC_BASE_SERVICE_URL',
  process.env.EXPO_PUBLIC_BASE_SERVICE_URL,
);

const FEDERATED_PROMETHEUS_BASE_URL = requiredEndpoint(
  'EXPO_PUBLIC_FEDERATED_PROMETHEUS_BASE_URL',
  process.env.EXPO_PUBLIC_FEDERATED_PROMETHEUS_BASE_URL,
);

const ACCOUNT_MANAGEMENT_URL = requiredEndpoint(
  'EXPO_PUBLIC_ACCOUNT_MANAGEMENT_URL',
  process.env.EXPO_PUBLIC_ACCOUNT_MANAGEMENT_URL,
);

/**
 * True when we are pointed at the production backend. Used to gate anything
 * that writes, so a development session cannot mutate live customer data.
 */
const IS_PRODUCTION_API = /(^|\/\/)api\.magichoof\.com/.test(BASE_SERVICE_URL);

const config = {
  web: {
    BASE_SERVICE_URL,
    ACCOUNT_MANAGEMENT_URL,
    FEDERATED_PROMETHEUS_BASE_URL,
    DEFAULT_STALL_BLUR_HASH:
      process.env.EXPO_PUBLIC_DEFAULT_STALL_BLUR_HASH ??
      'L584lB-;_NWBozWBkCf600IU8_js',
    FEEDBACK_FORM_URL: process.env.EXPO_PUBLIC_FEEDBACK_FORM_URL ?? '',
    SUPPORT_URL:
      process.env.EXPO_PUBLIC_SUPPORT_URL ?? 'https://www.horcery.com/support',
    BUCKET_METER_URL:
      process.env.EXPO_PUBLIC_BUCKET_METER_URL ??
      'https://www.horcery.com/bucket-meter',
    DEFAULT_CLIP_DURATION_SECONDS:
      process.env.EXPO_PUBLIC_DEFAULT_CLIP_DURATION_SECONDS ?? 600,
    MIN_CLIP_DURATION_SECONDS:
      process.env.EXPO_PUBLIC_MIN_CLIP_DURATION_SECONDS ?? 10,
    SENTRY_DSN: process.env.EXPO_PUBLIC_SENTRY_DSN ?? '',
  },
  METRICS_HIDDEN_HOURS: process.env.EXPO_PUBLIC_METRICS_HIDDEN_HOURS ?? 72,
  experiments: {
    SANDBOX: process.env.EXPO_PUBLIC_SANDBOX ?? false,
  },
  analytics: {
    POSTHOG_API_KEY: process.env.EXPO_PUBLIC_POSTHOG_API_KEY ?? '',
    POSTHOG_HOST:
      process.env.EXPO_PUBLIC_POSTHOG_HOST ?? 'https://us.i.posthog.com',
    POSTHOG_FEEDBACK_SURVEY_ID:
      process.env.EXPO_PUBLIC_POSTHOG_FEEDBACK_SURVEY_ID ?? '',
    POSTHOG_NAME_QUESTION_ID:
      process.env.EXPO_PUBLIC_POSTHOG_NAME_QUESTION_ID ?? '',
    POSTHOG_EMAIL_QUESTION_ID:
      process.env.EXPO_PUBLIC_POSTHOG_EMAIL_QUESTION_ID ?? '',
    POSTHOG_SATISFACTION_QUESTION_ID:
      process.env.EXPO_PUBLIC_POSTHOG_SATISFACTION_QUESTION_ID ?? '',
    POSTHOG_COMMENTS_QUESTION_ID:
      process.env.EXPO_PUBLIC_POSTHOG_COMMENTS_QUESTION_ID ?? '',
  },
  /** @see IS_PRODUCTION_API */
  IS_PRODUCTION_API,
};

export { config, IS_PRODUCTION_API };
