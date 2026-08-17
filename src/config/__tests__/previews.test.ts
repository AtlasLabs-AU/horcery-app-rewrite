/**
 * Seed test 5 — preview features cannot activate for a customer.
 *
 * Requirements §6b item 4. A reset flow that reports success without
 * resetting anything, and a "Face ID" gate that opens on a tap, are worse
 * than the features not existing.
 *
 * **What is guaranteed, precisely.** A release export was inspected on
 * 2026-08-15 (`expo export --platform ios`, strings over the .hbc bundle):
 * the preview STRINGS are still present — Metro does not tree-shake the
 * branch, because the opt-in is a runtime `process.env` read. So the earlier
 * claim "compiled out of release builds" was WRONG and has been corrected
 * everywhere. What holds is stronger than wording and is asserted here: the
 * flags are false whenever `__DEV__` is false, so the previews are
 * unreachable no matter what the environment says.
 *
 * If we later want the code absent as well (defence in depth), the previews
 * have to move behind a dynamic import that release never references — a
 * separate task, not a wording change.
 */

function loadFlags(dev: boolean, optIn: string | undefined) {
  jest.resetModules();
  const previousDev = (globalThis as { __DEV__?: boolean }).__DEV__;
  const previousEnv = process.env.EXPO_PUBLIC_ENABLE_PREVIEWS;

  (globalThis as { __DEV__?: boolean }).__DEV__ = dev;
  if (optIn === undefined) delete process.env.EXPO_PUBLIC_ENABLE_PREVIEWS;
  else process.env.EXPO_PUBLIC_ENABLE_PREVIEWS = optIn;

  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { PREVIEWS } = require('@/config/previews') as typeof import('@/config/previews');
  const snapshot = { ...PREVIEWS };

  (globalThis as { __DEV__?: boolean }).__DEV__ = previousDev;
  if (previousEnv === undefined) delete process.env.EXPO_PUBLIC_ENABLE_PREVIEWS;
  else process.env.EXPO_PUBLIC_ENABLE_PREVIEWS = previousEnv;

  return snapshot;
}

describe('preview features', () => {
  it('are all OFF in a release build, even when the env var asks for them', () => {
    const flags = loadFlags(false, 'true');

    expect(Object.values(flags).some(Boolean)).toBe(false);
  });

  it('are all OFF in a dev build that has not opted in', () => {
    const flags = loadFlags(true, undefined);

    expect(Object.values(flags).some(Boolean)).toBe(false);
  });

  it('are ON only for a dev build that explicitly opts in', () => {
    const flags = loadFlags(true, 'true');

    expect(flags.passwordResetCodeFlow).toBe(true);
    expect(flags.faceIdUnlock).toBe(true);
    expect(flags.socialSignInButtons).toBe(true);
    expect(flags.sampleHistoryData).toBe(true);
    expect(flags.sampleForYouData).toBe(true);
    expect(flags.sampleHorsesData).toBe(true);
    expect(flags.sampleAlertsData).toBe(true);
  });

  it('covers every declared flag — a new preview cannot escape this test', () => {
    const release = loadFlags(false, 'true');
    const optedIn = loadFlags(true, 'true');

    // Same key set, so adding a flag without gating it fails here.
    expect(Object.keys(release).sort()).toEqual(Object.keys(optedIn).sort());
    for (const key of Object.keys(release)) {
      expect(release[key as keyof typeof release]).toBe(false);
    }
  });
});
