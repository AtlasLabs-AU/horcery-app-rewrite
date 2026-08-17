# Handoff: Horcery apps on an Android emulator

**Written:** 2026-08-13, by Claude, for Codex.
**Goal:** get **both** Horcery apps — the current shipping app and the rewrite — running on an Android emulator on Inakshi's Mac, driveable by an agent and by her.

Inakshi is non-technical. Keep explanations plain and skip jargon when reporting back to her.

---

## 1. Where things stand right now

A setup script is **already running detached** and will keep going on its own:

```
~/Downloads/horcery-android/android-setup.sh     # the script
~/Downloads/horcery-android/setup.log            # progress
~/Downloads/horcery-android/run.log              # raw stdout
```

Check it before doing anything:

```bash
pgrep -fl android-setup.sh; tail -20 ~/Downloads/horcery-android/setup.log
```

- **If running:** leave it alone. It is downloading Android Studio (~4 h remaining, see §2).
- **If not running:** just re-run it. It is idempotent and resumes partial downloads:

```bash
cd ~/Downloads/horcery-android && nohup ./android-setup.sh > run.log 2>&1 &
```

It finishes at "=== DONE — toolchain ready ===". Everything in §4 happens after that.

---

## 2. Machine facts (already verified — don't re-check)

| | |
|---|---|
| Hardware | Apple Silicon (arm64), macOS 26.6.1, 16 GB RAM, 172 GB free |
| Android tooling | **None.** No Android Studio, no SDK, no AVDs |
| Java | **None.** No system JDK, and no Homebrew to install one |
| Xcode | 26.6 present (iOS side already works) |
| **Network** | **~1.5 Mbps sustained — this is the dominant constraint** |

**On the network:** ~90 KB/s per connection. Parallel connections do *not* help — 4 concurrent downloads split the same pipe (tested). Total download for this task is ~3 GB, so roughly **4–5 hours**. This is not a broken download; don't "fix" it by restarting, and don't add parallelism.

Because there is no system Java, **Android Studio is not optional** — its bundled JetBrains Runtime at
`/Applications/Android Studio.app/Contents/jbr/Contents/Home` is the JDK that `sdkmanager` and `avdmanager` run on.

**Decisions Inakshi already made** (don't reopen): full Android Studio install, and both apps on the emulator.

**EAS Simulator (cloud emulator) is not an option** — `simulator:availability` returns `available: false` for `horcery_dev`; the account is still waitlisted.

---

## 3. What the running script does

Ends with a booted-ready toolchain, no GUI wizard:

1. Resumes/verifies both downloads against Google's published SHA-256.
2. Mounts the DMG, copies **Android Studio.app** to `/Applications`, clears the quarantine flag.
3. Unpacks command-line tools to `~/Library/Android/sdk/cmdline-tools/latest`.
4. Accepts SDK licences, then installs `platform-tools` (adb), `emulator`, the platform, and the newest stable
   **`system-images;android-NN;google_apis;arm64-v8a`**.
   `google_apis` (not `google_apis_playstore`) is deliberate: it ships Google Play services, which
   `@react-native-firebase` needs, without the Play Store bulk. arm64 is required on Apple Silicon.
5. Creates AVD **`Horcery_Pixel`** (Pixel 7 profile), tuned to 4 GB RAM / 8 GB data so both apps fit.
6. Appends an `ANDROID_HOME` block to `~/.zshrc`.

---

## 4. Remaining work after the script finishes

### Step A — boot the emulator

Argent is installed and is the preferred way to drive devices (see `.claude/rules/argent.md`).

```
mcp__argent__boot-device   { avdName: "Horcery_Pixel" }
mcp__argent__list-devices  → confirm platform "android", state "device"
```

First cold boot takes several minutes. Use `await-ui-element` rather than polling screenshots.
Element discovery before any tap: `describe` (never derive tap coordinates from a screenshot).

### Step B — the current app (this one is ready; do it first)

Repo: `/Users/inakshi/AI Projects/Horcery/84-horcery-app-react-native`
This repo is a **read-only blueprint** — never commit to it. Revert any temporary edits when done.

Facts already established:
- **EAS is logged in** as `developer@horcery.com`, Owner of `horcery_dev` and `horcery_llc`. No password needed.
- Every `pnpm`/`eas` command needs `export PATH="$HOME/.local/bin:$PATH"` first.
- Android package (non-production): **`com.horcery.rn.app.dev`**, app name "Horcery Testing".
- Android Firebase config is already wired: `apps/expo/app.config.ts:74` reads `envConfig.androidGoogleServicesFile`,
  which resolves to the `DEV_GOOGLE_SERVICES_JSON` **EAS secret** (confirmed present in the `development` environment).
- A real `apps/expo/google-services.json` also exists locally (project `horcery-app-dev`, client
  `com.horcery.rn.app.dev`) and is gitignored. It matters because **`eas build` runs a local config
  introspection that fails if the file is absent** — the same trap that needed a placeholder plist on iOS.

Build and install:

```bash
export PATH="$HOME/.local/bin:$PATH"
cd "/Users/inakshi/AI Projects/Horcery/84-horcery-app-react-native/apps/expo"
npx eas-cli@latest build --platform android --profile preview --non-interactive --no-wait
# then download the artifact and:
adb install -r <artifact>.apk
adb shell monkey -p com.horcery.rn.app.dev -c android.intent.category.LAUNCHER 1
```

`preview` is the right profile: `developmentClient: false` + `distribution: internal`, and internal
distribution defaults to **APK** (not AAB), which is what an emulator can install. If EAS produces an
`.aab` anyway, add `"android": { "buildType": "apk" }` to the `preview` profile in `apps/expo/eas.json`,
build, then `git checkout -- apps/expo/eas.json`.

> **Config quirk, not a bug to fix:** `packages/config/src/utils/app-config-helper.ts:3` reads
> `APP_ENV ?? EXPO_PUBLIC_APP_ENV ?? 'preview'`, but `eas.json` sets `APP_ENVIRONMENT`. So the app config
> always falls through to its `'preview'` default. Harmless here — it yields exactly the dev package and
> dev Firebase config we want — but don't be surprised, and don't "correct" it in this read-only repo.

Login credentials for the QA account are in `Horcery_App_Agent_Runbook.md` in this same folder, along with
the update-wall bypass.

### Step C — the rewrite (has a real blocker — read before starting)

Repo: `/Users/inakshi/AI Projects/Horcery/horcery-app-rewrite` (Claude has write access here).
Read `Horcery_App_Rewrite_Requirements.md` before touching app code.

**Blocker: the rewrite has no Android Firebase identity.**

- `app.json` sets `android.package` = **`com.atlaslabs.horcery.app`**.
- The only `google-services.json` in existence (the dev one) contains a single client:
  **`com.horcery.rn.app.dev`**.
- The Google Services Gradle plugin fails the build outright when no client matches the applicationId
  ("No matching client found for package name"). `@react-native-firebase/app` is in `plugins`, so this
  will hit at prebuild/build time.
- `app.config.ts` only sets `ios.googleServicesFile` — there is no Android equivalent wired at all.
- `eas.json` has only an iOS `simulator` profile; there is no Android profile.

On iOS this never surfaced because the dev plist's `BUNDLE_ID` happens to be `com.atlaslabs.horcery.app`
(a known-stale value in the dev Firebase project) which matches the rewrite's iOS bundle id by luck.
Android has no such luck.

**Recommended fix — register a second Android app in the existing Firebase project:**

Add an Android app for `com.atlaslabs.horcery.app` to Firebase project **`horcery-app-dev`**
(project number `152075683281`), download its `google-services.json`, then:

1. Save it to the rewrite repo root, gitignored (mirror how the plist is handled).
2. In `app.config.ts`, add an `android.googleServicesFile` branch alongside the iOS one, reading
   `process.env.GOOGLE_SERVICES_JSON` with a local-file fallback — same pattern, same reasoning
   (the file is gitignored, and EAS only uploads git-tracked files, so a static path fails on EAS).
3. Upload it as an EAS **file secret** named `GOOGLE_SERVICES_JSON`.
4. Add an Android dev-client profile to `eas.json` (`developmentClient: true`, `distribution: internal`,
   `android.buildType: "apk"`), build, install.

**This needs Inakshi** — creating the Firebase app requires console (or `firebase login`) access on her
Google account. Neither the Firebase CLI nor gcloud is installed on this machine, and
`DEV_FIREBASE_SERVICE_ACCOUNT_JSON` is a write-only EAS secret, so it cannot be automated from here.
Ask her; don't stall the whole handoff on it — Step B stands alone.

**Do not** "solve" this by changing the rewrite's Android package to `com.horcery.rn.app.dev`. That
collides with the current app, and she asked for both installed side by side. Different packages is the
point.

Also note the rewrite is past Expo Go — it uses `@react-native-firebase/auth`, `react-native-mmkv`,
`expo-dev-client` and `expo-glass-effect`, so Android needs a real dev build, not Expo Go.

---

## 5. Verification (what "done" means)

1. `list-devices` shows the Android emulator as `state: "device"`.
2. Both apps appear in the launcher and open past the splash without crashing:
   - `com.horcery.rn.app.dev` ("Horcery Testing")
   - `com.atlaslabs.horcery.app` ("Horcery Rewrite")
3. A screenshot of each, sent to Inakshi. For the rewrite specifically she wants to see the
   **Material 3 Android look** — that is the actual point of the exercise for her.
4. Firebase login works on both (Play services are present via the `google_apis` image).

---

## 6. Gotchas worth carrying over

- **`~/.local/bin` on PATH** for every `pnpm`/`eas` invocation (pnpm 10.1.0 lives there to dodge a
  `/usr/local/bin` permissions problem).
- **Never** use `xcrun simctl`-style direct control for Android; go through argent, falling back to `adb`
  where argent has no equivalent tool (that fallback is explicitly sanctioned in the argent rule).
- **Never guess tap coordinates.** Call `describe` first, every time.
- Android emulator arm64 images only — x86 images will not boot on this Mac.
- When the session ends, call `stop-all-simulator-servers` scoped with `devices: [...]` naming only the
  devices used. An unscoped call tears down other agents' devices.
- The iOS simulator work is unaffected and already working; see
  `Horcery_App_Agent_Runbook.md` and the `horcery-running-old-app-locally` memory.

---

## 7. Findings for the dev team (log, don't fix)

Adds to the list already raised on 2026-08-13:

- The rewrite cannot build for Android at all today — no Android Firebase client, no
  `android.googleServicesFile`, no Android EAS profile. Worth knowing before anyone promises an Android beta.
- `app-config-helper.ts` reads `APP_ENV` / `EXPO_PUBLIC_APP_ENV` while `eas.json` sets `APP_ENVIRONMENT`;
  the environment switch in the current app is effectively inert and always lands on `preview` defaults.
