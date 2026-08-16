/**
 * Preview features — UI that LOOKS functional but is not wired to anything.
 *
 * These exist so Inakshi can judge a design on-device before the backend or
 * native pieces exist (requirements §7 items 7–8). They must never reach a
 * customer: a reset flow that reports success without resetting anything, or
 * a "Face ID" gate that opens on a tap, is worse than the feature not existing.
 *
 * Gate: `__DEV__` AND an explicit opt-in env var. A release build cannot turn
 * these on; a dev build has to ask for them.
 *
 * Wording matters, and an earlier version of this comment got it wrong.
 * VERIFIED 2026-08-15 against a real `expo export --platform ios` bundle:
 * the preview strings ARE still shipped — Metro cannot tree-shake the branch
 * because the opt-in is a runtime `process.env` read. What holds is that the
 * flags are false whenever `__DEV__` is false, so previews are
 * **unreachable** in a release build. Asserted in
 * `src/config/__tests__/previews.test.ts`; making the code absent as well
 * would need a dynamic import release never references.
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
  /**
   * Review History falls back to invented events when the organization has
   * none on the selected day, so the page can be judged populated. A banner
   * says so on screen; real events always win.
   */
  sampleHistoryData: __DEV__ && optedIn,
  /**
   * Fills unfinished or empty For You sections with labelled sample data so
   * the complete dashboard can be reviewed on-device. Real API data still
   * wins wherever that read path already exists.
   */
  sampleForYouData: __DEV__ && optedIn,
  /**
   * Fills the Horses page only when the organization has no real horses, so
   * its populated layout can be reviewed without changing backend records.
   */
  sampleHorsesData: __DEV__ && optedIn,
} as const;
