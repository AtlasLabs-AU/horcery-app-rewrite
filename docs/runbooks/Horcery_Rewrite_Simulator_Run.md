# Running the Horcery rewrite in the iPhone simulator

Verified end to end on 2026-08-27. This is the canonical path for the rewrite
simulator. It deliberately does not reuse the shipping app's device, port or
credentials from the macOS Passwords app.

## Fast path

From the Codex app, use the repository's **Run** action. From a terminal:

```bash
cd "/Users/inakshi/AI Projects/Horcery/horcery-app-rewrite"
./script/build_and_run.sh --ios
```

The launcher:

- targets the iPhone 17 Pro Max
  `53E8803D-9969-4B67-9130-38E560DD8622`;
- uses the rewrite dev client `com.atlaslabs.horcery.app`;
- uses Metro port `8083` (not the shipping app's or physical phone's port);
- loads and validates `.env.local` without printing its values;
- clears Metro when it starts a fresh iOS session, so preview-flag changes do
  not reuse a stale transformed bundle;
- reopens the existing dev client instead of starting a second Metro when
  port `8083` is already serving the rewrite.

When previews are enabled, a relaunch shows the **Unlock with Face ID**
prototype. Tap it once to reach Home; it is intentionally not real biometrics.

Run the non-secret preflight at any time:

```bash
./script/build_and_run.sh --check
```

## Known-good configuration

| Setting | Required value |
|---|---|
| Branch used for R&D | `rnd` |
| Simulator | iPhone 17 Pro Max, UDID above |
| Metro | `8083` |
| Dev-client link | `exp+horcery-app-rewrite://expo-development-client/?url=http%3A%2F%2Flocalhost%3A8083` |
| Firebase project | `horcery-app-dev` |
| iOS bundle ID | `com.atlaslabs.horcery.app` |
| QA email | `qa_atlas@atlaslabs.com.au` |
| Preview opt-in | `EXPO_PUBLIC_ENABLE_PREVIEWS=true` in the gitignored `.env.local` |

The rewrite plist, the installed shipping-app iOS plist and `.env.local` were
compared on 2026-08-27: project, bundle ID and API key matched. Do not replace
them to troubleshoot an `INVALID_LOGIN_CREDENTIALS` response without repeating
that comparison.

## Secret-safe QA sign-in

The valid QA password lives only as
`ARGENT_SECRET_HORCERY_QA_PASSWORD` in an Argent secrets file (normally
`~/.argent/secrets.env`). It is not stored in Git and must not be pasted into
chat, shell history or the simulator clipboard.

For an agent-driven sign-in:

1. Use Argent `describe` before every tap and target only the Pro Max UDID.
2. Enter `qa_atlas@atlaslabs.com.au`.
3. If the password field already contains bullets, clear that existing value.
   Do not trust the macOS Passwords suggestion: on 2026-08-27 it supplied a
   different, stale value while the protected Argent credential succeeded.
4. Type `{{secret:HORCERY_QA_PASSWORD}}` with Argent `keyboard`.
5. Put the secret typing and the submit tap in the same Argent `run-sequence`,
   so no intermediate screenshot can capture credential entry.
6. Verify the result from the accessibility tree (Home is visible); never call
   the login successful merely because the request was sent.

The credential was independently checked against Firebase's
`accounts:signInWithPassword` endpoint on 2026-08-27 and returned HTTP 200. The
response token and password were not printed or stored.

## Preview and password-reset trap

`EXPO_PUBLIC_ENABLE_PREVIEWS=true` intentionally enables sample screens, the
tap-to-unlock Face ID prototype, and Apple/Google buttons that only explain
they are previews. It also changes Forgot Password to the unwired six-digit
prototype. Those controls do not authenticate or reset a password.

If a real Firebase reset is genuinely required:

1. Change the gitignored `.env.local` flag to
   `EXPO_PUBLIC_ENABLE_PREVIEWS=false`.
2. Stop the Metro process owned by this session.
3. Run `./script/build_and_run.sh --ios` so Metro starts with a clean cache.
4. Use **Sign in with Email → Forgot Password**. The actual reset happens in
   the email link, not inside the app.
5. After signing in, restore the flag to `true` and repeat the clean launch.

The success screen deliberately also appears for Firebase `EMAIL_NOT_FOUND`,
to prevent account enumeration. It proves that the app handled the request;
it does not prove that an email was delivered.

## Do not collide with other sessions

- Do not drive the iPhone 17 Pro
  `09C755C6-BF27-4AC2-8D97-A9DA4C5E5442`; another agent may own it.
- Do not start the rewrite on `8081` or `8082`.
- Do not run an unscoped Argent cleanup. When cleanup is actually needed,
  scope it to the Pro Max UDID above.
- Do not delete simulator data or reset the keychain to fix login. Confirm the
  Firebase configuration and protected credential first.
