# Horcery Mobile App — Agent Runbook

Audience: an AI agent (or engineer) in a **fresh session** who needs to read the Horcery
app's source and/or run the app on Inakshi's Mac. Everything here was verified on
**2026-08-13** on macOS (Darwin 25), Xcode 26.6, Apple Silicon. Re-verify anything
load-bearing if much time has passed.

The human collaborator is **Inakshi Tillekeratne** (Product Manager, non-technical).
Explain steps plainly; never ask her to paste passwords or secrets into chat.

---

## 1. What this app is

React Native / Expo mobile app (iOS + Android) for Horcery — IoT horse-monitoring
(Stall Monitor cameras + companion app). Monorepo: Turborepo + pnpm workspaces.

- `apps/expo` — the mobile app (Expo SDK ~55, React 19, Expo Router)
- `apps/nextjs` — web app scaffold (shares packages)
- `packages/` — `app` (screens), `widgets` (209 feature components, ~68k LOC),
  `components` (gluestack-ui + NativeWind design system), `charts` (ECharts-based),
  `services` (API clients, React Query), `stores` (Zustand + MMKV), `config`
  (env, Firebase, BLE, background tasks)
- Auth: Firebase email/password. API auth: `Authorization: Bearer <Firebase ID token>`
  attached by `GenericService` (`packages/services/src/base/generic-service.ts`).
- State: React Query (server), Zustand (client; `auth-storage` persisted via MMKV,
  `lastLoggedInUser` in Expo SecureStore = iOS keychain).

## 2. Repository access (READ THIS — there are TWO repos)

| Repo (workspace `atlas-labs`) | Bitbucket project | Role |
|---|---|---|
| `84-horcery-app-react-native` | 84-Horcery-Software | **CANONICAL / live.** All PRs live here. Use this one. |
| `fin-84-horcery-app-react-native` | 0_Finance_Automations | Mirror for finance/PM access. **Lags ~9+ days. No PRs.** Do not trust for current-state claims. |

- Local clone: `/Users/inakshi/AI Projects/Horcery/84-horcery-app-react-native`
  — `origin` points at the **canonical** repo (re-pointed 2026-08-13).
- Access is via a read-only SSH Repository Access Key, alias `bitbucket-codex-readonly`
  (key `~/.ssh/codex_bitbucket_readonly`, config block in `~/.ssh/config`).
  The public key must be added **per repo** (Repository settings → Security → Access
  keys). It is already on both repos above. `Unauthorized` on a new repo = key not
  added there yet; the key itself is fine (`ssh -T git@bitbucket-codex-readonly`
  should still greet you).
- Verify/refresh:
  ```bash
  cd "/Users/inakshi/AI Projects/Horcery/84-horcery-app-react-native"
  git fetch origin --prune && git merge --ff-only origin/development
  ```
- Active branch: `development`. Releases: `release/x.y.z` branches.
- **Treat the repo as read-only reference.** The app rewrite project
  (`horcery-app-rewrite` repo, separate effort) uses it as a blueprint only.

### 2.1 Write access (fin- mirror ONLY)

- SSH Access Keys are **read-only by design** — `Unauthorized` on push is expected
  and does NOT mean "no access exists." **Never conclude access is missing from an
  SSH/HTTPS failure**; check the token route first.
- Write to the fin- mirror works via the **FIN Project Access Token**
  (project `0_Finance_Automations`, bot identity `…@bots.bitbucket.org`,
  Repositories R/W + PRs R/W), stored in macOS **Keychain** (account
  `codex-bitbucket`, service `codex-bitbucket-finance-automations-project-token`).
  Full procedure + troubleshooting:
  `Horcery/Bitbucket_Finance_Automations_Project_Access_Runbook.md`.
- The local clone has a **`fin-mirror`** remote (HTTPS, `x-token-auth`, repo-local
  Keychain credential helper) ready to push. Never store the token in `.git/config`.
- **Scope rule from Inakshi (2026-08-13):** the token technically reaches every FIN
  repo, but write is authorized for `fin-84-horcery-app-react-native` ONLY. Never
  push to the engineering-canonical repo (SSH there is read-only anyway).
- Anything pushed to the mirror is **invisible to the app team** (no PRs there);
  its synced branches may be force-updated — commit agent work to dedicated
  branches (e.g. `agent-docs`), never to `master`/`development`.

## 3. Running the app on the iOS simulator

### 3.1 What already works (fastest path)

The app is **already installed** on simulator **iPhone 17 Pro,
UDID `09C755C6-BF27-4AC2-8D97-A9DA4C5E5442`** (iOS 26.5):

- Bundle id: `com.horcery.rn.app.dev` · App name: **HorceryTesting** · v2.2.15
- It is a **release-style EAS build**: no Metro connection, no RN debugger,
  no react-profiler. UI automation and screenshots work; JS-runtime tools do not.

Launch (argent MCP):
`launch-app { udid: "09C755C6-BF27-4AC2-8D97-A9DA4C5E5442", bundleId: "com.horcery.rn.app.dev" }`

### 3.2 Do NOT try to build locally — known dead ends

1. **Firebase config secrets are write-only in EAS** (`DEV_GOOGLE_SERVICE_INFO_PLIST`
   etc., visibility "secret"; `eas env:pull` refuses even for Owners). A local build
   needs a hand-delivered plist. A usable copy exists at:
   `Google Drive → Shared drives → IT Support → IT 2025 → Devinka Knowledge Transfer →
   Devinka Backups → GoogleService-Info.plist` (project `horcery-app-dev`; its
   BUNDLE_ID is stale — `com.atlaslabs.horcery.app` — Firebase logs a mismatch but works).
2. `expo run:ios` **misdetects the Mac** ("Designed for iPhone") as the target and
   dies with `No code signing certificates are available` — with or without
   `--device`. Not fixable by flags in non-interactive mode.
3. Raw `xcodebuild` gets further but fails in the `[CP-User] Generate app.config for
   prebuilt Constants.manifest` script phase (EXConstants pod; node/env resolution
   inside Xcode script phases). Unresolved as of 2026-08-13.
4. Port 8081 is often occupied by the **horcery-app-rewrite** session's Metro.
   Never kill it — it belongs to another active project. Use `--port 8082` if you
   ever need Metro.

### 3.3 The working rebuild recipe (EAS cloud, ~15 min)

Only needed if the installed app is gone. Prereqs already on the machine:
pnpm 10.1.0 (`~/.local/bin`), deps installed, CocoaPods 1.15.2 at
`~/.gem/ruby/2.6.0/bin/pod` (system Ruby 2.6 needed pinned gems: ffi 1.15.5,
activesupport 6.1.7.10, and `concurrent-ruby >1.2.3` must stay uninstalled).

1. `npx eas-cli@latest login` — **Inakshi runs this herself** (Owner of
   `horcery_llc` and `horcery_dev`).
2. `eas env:pull --environment development` → writes `apps/expo/.env.local`
   (13 non-secret vars; already present).
3. `eas.json` has no simulator profile — add temporarily:
   `{ "simulator": { "extends": "base", "ios": { "simulator": true }, "distribution": "internal", "channel": "preview" } }`
   Revert after (`git checkout -- apps/expo/eas.json`).
4. EAS's local config introspection needs *a* plist present: keep/copy
   `apps/expo/GoogleService-Info.plist` (gitignored). EAS injects the real one
   server-side.
5. `eas build --platform ios --profile simulator --non-interactive --no-wait`
6. Download artifact `.tar.gz` → `tar -xzf` →
   `xcrun simctl install <UDID> HorceryTesting.app` →
   launch via argent.

### 3.4 Environment truth (verified from the installed binary)

- Firebase auth: **dev** project `horcery-app-dev`
- Backend baked in: **PRODUCTION** — `https://api.magichoof.com/`,
  `https://metrics.magichoof.com/` (env fallback defaults in
  `packages/config/src/env/index.ts` silently point to production; the EAS
  `development` environment's `EXPO_PUBLIC_BASE_SERVICE_URL` is also production).
- Consequence: **production customer logins do NOT work** (wrong user pool);
  QA accounts do. **Never create accounts or write data casually** — writes may
  land in production systems.

### 3.5 Physical iPhone signing for the rewrite chart harness (2026-08-18)

This is separate from rebuilding the legacy app in §3.2. The chart harness can be
built locally for Inakshi's physical iPhone from:
`/Users/inakshi/dev/horcery-app-rewrite-main/spikes/charts-harness/ios/HorceryChartsHarnessvictory.xcworkspace`.

- Xcode is signed into `inakshi02@gmail.com` and the target uses
  **Inakshi Tillekeratne (Personal Team)** with automatic signing.
- The normal **login** keychain contains the valid certificate
  `Apple Development: inakshi02@gmail.com (4K2C74L7T9)` **and its private key**.
- That private key has the standard persistent Apple signing partitions
  `apple-tool:`, `apple:` and `codesign:`. This was verified on 2026-08-18 by
  signing the embedded Expo framework, installing the harness, and launching it
  on the physical iPhone. Do not recreate this permission on each build.
- A separate `Horcery Signing.keychain-db` also exists but is locked and is not
  needed. Do not try passwords against it, select it as the default keychain,
  revoke its certificate, or delete it during a build.
- In Xcode, select **Inakshi's iPhone** (`00008150-000C61E01E99401C`) as the run
  destination, then build/run. The first native React Native/Skia compilation is
  slow; do not diagnose signing until compilation reaches the signing phase.
- Subsequent builds should not ask for a signing password. If they do, stop and
  confirm Xcode still references certificate `4K2C74L7T9`; do not create another
  certificate or keychain. Inakshi enters any Mac login password herself; never
  request, record, or type it.
- Verify success by seeing the app install and launch on the physical phone; a
  successful compile alone is not signing verification.
- A Debug run uses the Metro URL and needs the project packager running (normally
  port 8081 for this harness). For a self-contained measurement artifact, use a
  Release build with an embedded JS bundle. Signing and Metro are separate: a
  launched Debug shell showing `No script URL provided` means signing succeeded
  but Metro/bundling is absent.

## 4. The forced-update wall (WILL hit you) and the bypass

**Symptom:** after a restart the app hangs on splash ~60s+ then shows a full-screen
"NEW UPDATE IS AVAILABLE … New App Version: 2.2.14" wall with **no skip button**.

**Cause (verified in code):** `packages/config/src/hooks/use-check-app-updates.ts`
blocks when `current < MIN_RN_APP_VERSION` (Firebase Remote Config). The **dev**
config has `MIN_RN_APP_VERSION` set **above** 2.2.15 while `RN_APP_VERSION`
(the "latest" shown on the wall) is 2.2.14 — minimum > latest, so every current
build is walled. The comparison code itself is correct.

**Fail-open detail:** with no fetched config the hook sees defaults (`1.0.0`) and
skips the check — so the **first launch after a data wipe is always free**; the
wall returns once Remote Config is fetched+cached (typically visible from the next
restart).

**Bypass (repeatable, ~10s):**
```bash
UDID=09C755C6-BF27-4AC2-8D97-A9DA4C5E5442
xcrun simctl terminate $UDID com.horcery.rn.app.dev
# Re-derive the data container path each time (it changes after reinstall):
xcrun simctl listapps $UDID | grep -A8 'com.horcery.rn.app.dev' | grep DataContainer
rm -rf "<DataContainer path>/Library" "<DataContainer path>/Documents" "<DataContainer path>/tmp"
```
Relaunch → quick-login screen (identity survives in keychain) → password needed again.

**Durable fix (not in our hands):** anyone with Firebase console access on
`horcery-app-dev` sets `MIN_RN_APP_VERSION` ≤ `RN_APP_VERSION`. Ticket filed for a
config sanity check (min ≤ latest, else fail open) + support link on the wall.

## 5. Logging in

- QA test account: `qa_atlas@atlaslabs.com.au`. **Password is not stored anywhere
  an agent can read.** Options, in order:
  1. Ask Inakshi to type it into the Simulator window (`open -a Simulator` if hidden).
  2. Ask her to create `~/.argent/secrets.env` with
     `ARGENT_SECRET_HORCERY_QA_PASSWORD=…`, then type it via argent `keyboard`
     with `{{secret:HORCERY_QA_PASSWORD}}` — plaintext never enters agent context.
- After a data wipe the app shows a **quick-login** card for the last user
  (`auth-quick-login-continue-button`) — email prefilled, password required.
- **After login, switch org**: the default **Org 150 is empty**. Use the menu
  (top-right hamburger → org list) → **"Mobile Dev Testing"** — the only org with
  devices, snapshots, live video, and 31 watched metrics. Org selection is lost on
  every data wipe (it lives in MMKV).
- Other known orgs on the account: Test Individual Org, Gayani Test Organization,
  2× "does this sync?", Test Org, Test Demo Organization, Test Organization.

## 6. Driving the app (argent)

- Follow the project argent rules (`.claude/rules/argent.md`): `list-devices`
  first; **describe before every tap**; `run-sequence` for known multi-step paths;
  `await-ui-element` / `await-screen-idle` instead of screenshot-polling.
- **Release build limits:** `debugger-*` tools and `react-profiler-*` will not
  connect (no Metro). `describe`, `gesture-*`, `keyboard`, `screenshot`,
  `screen-recording`, `screenshot-diff` all work.
- **A11y tree gaps (known):** some visible elements are missing from `describe`
  output — the Manage Alerts "Add New" button, card description texts, the alert
  wizard "1/2 / 2/2" step indicator. Fall back to screenshot-derived coordinates
  for those (allowed as last resort). Also: the menu drawer does NOT trap
  accessibility focus — background elements remain in the tree while it's open
  (this is itself a filed a11y bug; don't let it confuse navigation).
- Useful testIDs: `auth-selection-sign-in-button`, `auth-sign-in-submit-button`,
  `auth-quick-login-continue-button`, `for-you-search-button`, `tabs-home-tab`,
  `tabs-animals-tab`, `tabs-stalls-tab`, `tabs-more-tab`.
- Navigation map: welcome → Sign In. Main tabs: **For You** (org card, Horcery AI,
  Snapshots, Review, Behavior Tracker, Water/Feed Intake) · **Horses** (list →
  horse detail: LIVE video + timeline + Summary/Events/Alerts) · **Stalls**
  (card grid → stall detail) · **More** (Clips / Devices / Manage Alerts /
  feedback). Detail screens are stack-pushed and **hide the tab bar** — go back
  before switching tabs.
- Session end: `stop-all-simulator-servers` **scoped** with
  `devices: ["09C755C6-BF27-4AC2-8D97-A9DA4C5E5442"]` — never unscoped (other
  agents share the tool-server).

## 6a. The text-size pass — MANDATORY before any screen is "done"

Added 2026-08-19 after every For You card was found truncating its own title.
This is PRINCIPLES #13; the runbook step is here so it is part of the device
pass rather than a thing to remember.

**Look at every screen you touched at three text sizes.** Not one.

```bash
# default
xcrun simctl ui <UDID> content_size large
# one notch up — the size a lot of people over forty actually use
xcrun simctl ui <UDID> content_size extra-extra-large
# an accessibility size — where layouts fall apart, not just get tight
xcrun simctl ui <UDID> content_size accessibility-extra-large
```

**Terminate and relaunch the app after each change.**

```bash
xcrun simctl terminate <UDID> com.atlaslabs.horcery.app
```

This is not optional politeness. iOS reports the new scale to an already-running
app *before* its text re-renders, so a running app shows a hybrid — small text
in tall rows, actions floating above their labels — that exists on no real
device. Fifteen minutes were spent on 2026-08-19 diagnosing a "regression" that
was only this. If a layout looks impossible, relaunch before believing it.

**What you are looking for:** any `…` in a heading, name or button; any text
running off the right edge; any label reduced to one word. Wrapping onto more
lines is correct and expected — the page simply gets taller.

**Restore the default when you are finished** (`content_size large`), or the
next session inherits your setting and misreads every screenshot.

## 7. Known app issues (as of 2026-08-13) — don't rediscover these

| Issue | Status |
|---|---|
| Forced-update wall bricks current builds (dev RC min > latest) | Open; bypass in §4; ticket drafted |
| Testing builds silently point at production API (env fallback) | Open; flagged to team |
| Clips screen hard-down for QA account (instant fail, retry fails; error UI itself is good) | Open; cause unattributed (dev-token vs prod-API mismatch suspected) |
| Horse detail: ~90s to full load; stats end as unexplained "N/A"; skeletons have no timeout/error state | Open (inconsistent failure-state discipline; Clips shows the good pattern) |
| Thumbnails show "Unavailable" error state, then load a minute later | Open |
| Menu drawer leaks a11y focus to background | Open |
| SMD provisioning infinite retry loop | **Fixed** in PR #2262 (2026-08-11, HC84-36337) — matches the analysis in `Horcery/Stall_Monitor_Provisioning_Bug_Report.md`; SSID validation part (§4.1 there) still open |
| Malformed SSIDs (`\x04\x00…`) selectable in provisioning Wi-Fi list | Open — `packages/widgets/src/common-provisioning-widget/provisioning-helpers.ts:343` (decode) + `:361` (no validation) |

## 8. Related documents & context

- `horcery-app-rewrite/docs/requirements/Horcery_App_Rewrite_Requirements.md` — canonical requirements for the
  **rewrite** project (separate repo `horcery-app-rewrite`; universal-led @expo/ui).
- `Horcery/Stall_Monitor_Provisioning_Bug_Report.md` — provisioning bug analysis
  (primary bug since fixed; see status banner inside).
- `Horcery/horcery-forced-update-wall-v2.2.15-blocked-by-2.2.14.png` — wall evidence.
- Claude memory files (if in Inakshi's Claude environment): `horcery_running_old_app_locally`,
  `horcery_bitbucket_app_repo_duplication`, `horcery_app_rewrite_project`.
- PostHog session replay of a real provisioning failure:
  `019fed4a-03cb-7fc9-985d-ba2541c9c8a7`.
- App review rating (2026-08-13, one session, QA org, simulator): **5.5/10** —
  strong architecture/services layer; inconsistent experience layer; two config
  landmines (update gate, prod fallback). Newest surfaces (Manage Alerts revamp)
  are the internal quality bar.
