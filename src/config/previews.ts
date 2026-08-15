/**
 * Preview features — UI that LOOKS functional but is not wired to anything.
 *
 * These exist so Inakshi can judge a design on-device before the backend or
 * native pieces exist (requirements §7 items 7–8). They must never reach a
 * customer: a reset flow that reports success without resetting anything, or
 * a "Face ID" gate that opens on a tap, is worse than the feature not existing.
 *
 * Gate: `__DEV__` (compile-time constant, dead-code eliminated in release
 * bundles) AND an explicit opt-in env var. A production build cannot turn
 * these on; a dev build has to ask for them.
 *
 * Review finding 2026-08-15 (requirements §6b, item 4).
 */
const optedIn = process.env.EXPO_PUBLIC_ENABLE_PREVIEWS === 'true';

export const PREVIEWS = {
  /** 6-digit-code password reset: no email, any code accepted, no submit. */
  passwordResetCodeFlow: __DEV__ && optedIn,
  /** Face ID unlock gate that opens on tap (no biometrics). */
  faceIdUnlock: __DEV__ && optedIn,
  /** Apple / Google sign-in buttons that only explain themselves. */
  socialSignInButtons: __DEV__ && optedIn,
} as const;
