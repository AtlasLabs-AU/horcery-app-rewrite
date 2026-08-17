# Horcery App — UI & Design-Language Requirements (agent brief)

**For:** the implementing AI agent working in `horcery-app-rewrite`
**From:** Inakshi · **Date:** 2026-08-14
**Authority:** extracted from `Horcery_App_Rewrite_Requirements.md` (§4, §4b–§4d).
If this file and that doc disagree, that doc wins.

## Context

- Expo SDK 57 / React Native 0.86 / expo-router / TypeScript app in
  `horcery-app-rewrite` (React Query, Zustand, Firebase auth).
- Rewrite of the Horcery stall-monitoring app. **iOS and Android both
  first-class** — an even customer split.
- Aesthetic reference: **Clarity** (https://github.com/SchroederNathan/clarity,
  MIT). Adopt its design-system *discipline*; adapt values to Horcery. Where a
  token file is adapted from Clarity, attribute it in the file header.

---

## R1. Universal components — the governing rule

1. Every component is **universal**: one component, one import, one API,
   rendering correctly on both Android and iOS. A screen is written once.
2. Screens may import ONLY:
   - universal `@expo/ui` components (the top-level import),
   - official Expo packages (`expo-image`, `expo-video`, `expo-symbols`, …),
   - Software Mansion packages (Reanimated, Gesture Handler, Screens, SVG,
     FlashList),
   - the Horcery surface layer (`src/components/ui`).
3. Screens must NEVER:
   - import `@expo/ui/swift-ui` or `@expo/ui/jetpack-compose` directly,
   - use `Platform.select` / `Platform.OS` or `.ios.tsx` / `.android.tsx`
     forks,
   - name a raw color, fontSize, radius, or spacing literal.
4. Platform-specific code is permitted **only inside the surface layer**,
   hidden behind a universal API. A caller cannot tell which platform it is on.
5. No surface-layer component ships until its rendering is **verified on both
   platforms** (screenshot evidence on the iOS simulator and Android emulator).

## R2. Component sourcing hierarchy (every exception logged)

1. Universal `@expo/ui`
2. Official Expo packages
3. Software Mansion packages
4. Platform-specific `@expo/ui` (swift-ui / jetpack-compose) — inside the
   surface layer only
5. Custom composition of the above
6. New third-party dependency — explicit logged decision required

Riders:
- Large scrolling lists (alerts, clips, snapshots) use **FlashList**, never
  `@expo/ui` List.
- Icons: `expo-symbols` (SF Symbols) on iOS with a Material-symbols
  counterpart on Android, behind one universal `Icon` component in the surface
  layer. Do **not** add Hugeicons (paid; Clarity's choice, not ours).

## R3. Design tokens — five modules, one theme hook

Create pure-TS token modules (no React imports) read through a single
`useTheme()` hook: `colors`, `typography`, `spacing`, `radius`, `motion`
(+ `fonts`). Modeled on Clarity's `constants/` files. Consolidate the existing
`src/constants/theme.ts` into this system — its literal `Fyp` palette is
migration input, not a second system.

### R3.1 colors

- Every color in the app lives here, keyed by scheme — **light AND dark from
  day one**, identical key sets.
- Groups: surfaces (background, card, glass tints, glass fallback), fills,
  inverse (the near-black/near-white primary-button surface that flips in
  dark), text (four-step ink ramp: `foreground` / `secondary` / `tertiary` /
  `dimmed`), lines (divider, track, outline), status.
- **Editorial palette (decided 2026-08-17, supersedes the indigo direction
  below).** White canvas, ink and grey carry the interface; deep purple only
  where you press. Concretely: near-white background `#FAFAFB` / near-black
  dark `#0B0B0D`; white / graphite cards; light-grey beds and fills (no
  lavender tint); **`accent` = ink** (`#1C1C22` / `#F2F2F7`) for text links,
  selected states, icon tints, checkmarks; **`inverse` = deep aubergine
  `#3F2E5C` / mauve `#7E6BB5`** and is the ONLY purple in the UI — primary
  buttons and switch on-state; `onAccent` / `onInverse` for text on those
  fills. Selection by tone and weight, never inverted blocks; icons bare, no
  tinted wells. The logo keeps brand `#615FFF`; the hue does not appear in
  the interface. No custom skeuomorphic controls (metallic toggles were
  evaluated and put away). Values: `src/constants/tokens.ts`; rules:
  `PRINCIPLES.md` "Colour"; enforcement:
  `src/__tests__/no-color-literals.test.ts`.
- *Superseded (2026-08-14 → 2026-08-17): accent family seeded from `#615FFF`,
  desaturated tonal indigo for control fills, lavender-tinted beds,
  full-saturation brand for small emphasis. Rejected on device by Inakshi.*
- Status rules, in writing in the file: metric/horse data is **never** colored
  by how good or bad it is; red is for actual alerts and form validation only.

### R3.2 typography

- A named ramp mirroring Apple's text-style sizes — same steps on both
  platforms. Starting steps (from Clarity): `largeTitle` 34 · `title` 22 ·
  `title3` 20 · `headline` 17 semibold · `body` 17 · `callout` 16 ·
  `subhead` 15 · `footnote` 13 · `caption` 12 · `eyebrow` 12 caps/tracked ·
  `micro` 10 · `displayValue` 26 heavy · prose variants of body/subhead/
  footnote carrying `lineHeight` (24/21/19).
- Rounded typeface. The face is a **per-platform token behind one name**:
  iOS = SF Pro Rounded (or system `ui-rounded`); Android = an open-licensed
  rounded face — **open decision, see R8. Do not ship SF Pro Rounded on
  Android** (Apple's license is Apple-platforms-only).
- Weight is selected via `fontFamily`, never `fontWeight`. Negative tracking
  on heading steps. `lineHeight` only on prose steps.

### R3.3 spacing

- One 4-pt scale: 2 / 4 / 8 / 12 / 16 / 20 / 24 / 32 / 48.
- Screen-edge padding is one constant (16) app-wide. Card padding 20.
- Prefer `gap` over margins. Values between steps snap to the nearest step;
  genuine optical nudges stay inline with a comment saying why.

### R3.4 radius

- Six steps: `xs` 6 · `sm` 12 · `md` 20 · `lg` 28 (compact cards) · `xl` 36
  (hero cards) · `full` 9999 (capsules/circles — never hardcode half-height).
- Every non-capsule radius pairs with `borderCurve: 'continuous'`.

### R3.5 motion

- Durations: `fast` 150 (state feedback) · `base` 250 (element enter/exit) ·
  `slow` 400 (sheets, screen-level fades).
- Three named springs, each with one job: `snap` (critically damped, control
  thumbs), `settle` (slight settle at the end, sliding pills), `glide` (no
  overshoot, chrome under a finger).
- Never drive a token color through Reanimated — animate opacity/transform.

## R4. Surface-layer components (`src/components/ui`)

- **`Surface`** — the one raised-card material. Universal props: radius step,
  `tint: 'standard' | 'strong'`, `interactive`. iOS 26+ renders liquid glass
  (`expo-glass-effect` GlassView + tint token); Android and pre-26 iOS render
  a **Material 3 tonal surface** — a designed identity, not a fallback.
  Known constraints: an interactive surface must not clip overflow; never
  wrap GlassView in an animated opacity; glass does not nest on iOS 26.
- **`ThemedText`** — all text in the app. Props: `variant` (ramp step),
  `weight` (face override), `tone` (ink ramp + the few status inks text may
  take). Screens never set `fontSize` or `color`; `style` merges last for
  layout only.
- **`PrimaryButton`** — the screen's one committing action: inverse capsule
  (near-black on light, near-white on dark), heights 54/60 (≥44-pt target),
  medium-impact haptic on press by default. New intents become variants here,
  never a second button component.
- **`Icon`** — universal wrapper: SF Symbols on iOS, Material symbols on
  Android, one name prop.
- Same pattern for anything else the canvas needs (SectionHeader, etc.):
  identity decided inside the component; callers set layout via `style`
  merged last.

## R5. Feel — "clean, smooth, beautiful"

- Haptics on committing actions (and only those — not on every tap).
- Motion uses the tokens above via Reanimated; related surfaces move on the
  same spring so simultaneous animation reads as one gesture.
- 60 fps scrolling: FlashList for long lists; `expo-image` with placeholders/
  blurhash; below-the-fold sections mount deferred; media tiles show stills,
  not live players, until in view.
- Dark mode is correct on every screen from the start — both schemes reviewed
  whenever a screen is reviewed.
- Interactive components carry `accessibilityRole` and `accessibilityState`.

## R6. Enforcement

- No hardcoded user-visible strings — i18next per the localization
  requirements; ESLint-enforced.
- No raw style literals in screens (colors, sizes, radii, spacing) —
  colours are test-enforced (`src/__tests__/no-color-literals.test.ts`:
  no hex/rgb/hsl and no scaffold-palette import in `src/app` or
  `src/components`; exceptions carry a reason and fail when stale); the rest
  ESLint-enforced where practical, review-enforced otherwise. A screen that
  "needs" a literal means a token scale is missing a step: add the step.
- Every sourcing-hierarchy exception and every new dependency is a logged
  decision.

## R7. Acceptance criteria

1. Any screen file compiles and renders from the same source on both
   platforms, with zero platform branches in the screen.
2. Any two screens side by side read as one family — corners, spacing, type,
   and color all from the same scales.
3. `Surface` verified: liquid glass on the iOS 26 simulator, Material tonal
   on the Android emulator, screenshots for both.
4. Grep-clean: no `fontSize`, hex color, radius, or spacing literal in any
   screen or feature component.
5. Dark-mode screenshot pass on every completed screen.
6. Milestone review judges against the bar: calm, rounded, glassy,
   editorial — ink and grey with purple only on controls — smooth related
   motion.

## R8. Open decisions — flag, do not decide silently

1. **Android rounded typeface** (SF Pro Rounded is not licensable there).
   Propose 2–3 open-licensed rounded candidates with side-by-side renders;
   Inakshi picks.
2. **Charts implementation** — parked to a separate discussion; do not choose
   a charting library as a side effect of other work.
