# Horcery Mobile App — Rewrite

Ground-up rewrite of the Horcery companion app (iOS + Android), replacing
`fin-84-horcery-app-react-native`.

**Read first:** [`docs/requirements/Horcery_App_Rewrite_Requirements.md`](docs/requirements/Horcery_App_Rewrite_Requirements.md)
is the authoritative requirements document (index of all rewrite documents:
[`docs/README.md`](docs/README.md)). Every architectural decision
here traces back to it.

---

## Status

**HOLD SCOPE — foundation hardening (from 2026-08-15).** `main` is a visual and
structural prototype, **not a production replacement**. An adversarial review
(requirements §6b) found: iOS-only controls in production screens, dead
controls, no localization, no tests, and Snapshots losing data. No further
screens are promoted to `main` until the hardening slice is complete —
universal adapters + import-rule CI → i18next + no-literal lint → test/lint
infrastructure → honest loading/unavailable/preview/error states → Snapshots
as the first complete vertical slice → parity ledger → iOS **and** Android
device validation. R&D continues on `rnd`.

Rules that apply to every change on `main` now:
- A visible interactive element must navigate, act, be visibly disabled with
  a reason, or not render.
- Preview features (fake reset flow, tap-to-unlock Face ID, Apple/Google
  buttons) are behind `PREVIEWS` in `src/config/previews.ts` — `__DEV__` AND
  `EXPO_PUBLIC_ENABLE_PREVIEWS=true`. They are **unreachable** in release
  builds (asserted by test). Their strings do still ship: verified against a
  real export, Metro does not strip the branch. Do not describe them as
  "compiled out".
- No new `@expo/ui/swift-ui` / `jetpack-compose` imports outside
  `src/components/ui`.

## Stack

| | |
|---|---|
| Framework | Expo SDK 57, React Native 0.86, Expo Router |
| UI | **Universal `@expo/ui`** — one tree, renders SwiftUI on iOS / Jetpack Compose on Android / web |
| Language | TypeScript (strict; `npx tsc --noEmit` must be clean) |

## The UI rule (decided 2026-08-12, adversarial review)

**Universal-led.** One component tree. Platform-specific SwiftUI/Compose code is
confined to a small surface layer — no feature screen imports platform-specific or
glass APIs directly.

Component sourcing hierarchy — anything below tier 1 is a logged decision:

1. Universal `@expo/ui`
2. Official Expo packages (`expo-image`, `expo-video`, `expo-glass-effect`, `expo-symbols`)
3. Software Mansion (Reanimated, Gesture Handler, Screens, SVG, FlashList)
4. Platform-specific `@expo/ui` (`swift-ui` / `jetpack-compose`) where universal falls short
5. Custom composition of the above
6. A new third-party dependency — requires explicit sign-off

**Hard riders:**

- **Large scrolling lists use FlashList, never `@expo/ui` `List`.** Expo's own docs
  warn `List` is unsuitable for large datasets (each item is a JSX node on the JS
  thread). Alerts, clips, snapshots, and event history are all large lists.
- **Liquid glass is iOS 26+ only** and silently degrades to a plain `View` elsewhere.
  Android gets a deliberately designed Material 3 treatment — never the silent
  fallback. Gate glass with `isGlassEffectAPIAvailable()` inside the surface layer.

## Method

The previous app is a **read-only blueprint**, never edited by this project.
Screens are transplanted, not reinvented: read the old screen, keep its data wiring
and logic, re-express the UI in `@expo/ui`.

`packages/services`, `packages/stores`, and `packages/config` from the old app
(~19k LOC — auth, 13 API domains, Firebase, BLE provisioning, Wi-Fi credentials)
port over near-verbatim. They are UI-independent by measurement: only 2 of ~93
files import React Native, both MMKV plumbing.

## Development stages

- **Stage A — Expo Go.** Look-and-feel work with sample data. Universal `@expo/ui`
  runs in Expo Go on SDK 57. Note: Expo Go for SDK 57 ships via TestFlight, not the
  App Store.
- **Stage B — development build.** Required the moment native Firebase auth, BLE,
  MMKV, or push notifications are wired in. Same live-reload workflow after a
  one-time install.

## Running it

```bash
npm install
npx expo start          # then scan with Expo Go
npx expo start --web    # browser preview
npx tsc --noEmit        # type check — must be clean before commit
```

## Conventions

- `src/app/` — routes (Expo Router). Keep route files thin; no platform extensions here.
- `src/components/` — shared components. Platform-specific files (`*.ios.tsx` /
  `*.android.tsx`) live here, never in `src/app/`.
- `src/constants/theme.ts` — design tokens, including Horcery brand colours carried
  over from the current app.

Every commit must type-check clean and run on both platforms.
