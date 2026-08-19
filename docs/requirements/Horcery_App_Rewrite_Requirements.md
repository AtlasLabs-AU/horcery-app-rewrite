# Horcery Mobile App Rewrite — Requirements

**Owner:** Inakshi (product direction) · **Builder:** Claude (implementation) · **Status:** Draft for sign-off
**Date:** 2026-08-12 · Captured through structured requirements interview, three rounds.

---

## 1. Why this exists (the business driver)

Customers are feeling the current app's problems — complaints span look-and-feel,
speed, reliability, and clarity. The app is the only surface customers touch daily;
the hardware is premium and the app does not match it.

**Forced ranking of the four complaint areas:**

1. **Looks** ← the bar-setter. Premium, native, modern; an app that matches what
   customers pay for the hardware.
2. Speed — rides along (on native components, looks and smoothness are largely the
   same work).
3. Reliability — treated as a **non-negotiable floor**, not a ranked priority: a
   monitoring app that misses alerts loses the customer no matter how beautiful.
4. Clarity — addressed through reorganization freedom (see Scope).

## 2. What gets built

- **Full parity of retained capability** — every ability customers have today
  survives unless it is listed as an explicit product removal below.
  All ~15 feature areas: live feeds, alerts, insights, snapshots, horses, stalls,
  spaces, clips, sharing, rentals, devices/provisioning, billing, org management,
  review cards, settings.
- **Freedom of organization** — screens and flows may be restructured where the
  current app confuses customers. Parity of capability, NOT parity of layout.
- Same backend, same login. Customers keep accounts, horses, and history —
  switch day moves the app, not the data.

### Deliberate product removal: Record / manual logs (decided 2026-08-16)

The legacy **Record** feature is removed from the rebuilt app. It allowed a
user to manually author operational events such as Stall Cleaning, Stall Check,
Water Check and similar free-form records. This is a product decision, not a
deferred implementation.

- No Record button, route, menu item, sheet or other manual-event entry point.
- No mobile API mutation for creating or editing these legacy manual events.
- Review, Review History, search and filters do not present these event types as
  supported Horcery capabilities.
- The rewrite does not display legacy reporter-name or manually entered notes
  fields in Review cards.
- Existing backend records remain untouched. Any future requirement for an
  administrative archive/export is a separately scoped read-only capability;
  it must not reintroduce Record into the customer app by accident.
- **Special Instructions (event type 7) is part of this removal** (Inakshi,
  2026-08-17, while scoping Horse Details). It is customer-typed text pinned to
  a horse — the same family. The shipping app's Summary card holds an unwired
  stub of it and its Review History default filter requests type 7; the
  rewrite carries neither. Not deferred: removed.
- Parity reviews and agentic implementation prompts must treat this feature as
  **intentionally dropped**, never as missing functionality to restore.

## 3. Who builds it and how decisions get made

> **Clarified 2026-08-17 (Inakshi):** "Technically you are re-writing the app.
> You need to be thinking about making this app that we are writing production
> ready. We won't need the dev team." The rewrite is **the production app**, and
> Inakshi + Claude + Codex carry it to the store; the mobile dev team is not
> part of that path. Consequences: every slice is judged against "could this
> ship", not "is this a good enough prototype"; release engineering (EAS
> production profiles, store submission, OTA updates, crash reporting,
> analytics, support/feedback paths) is in scope for the rewrite, not deferred
> to someone else; and the rewrite documents live in the rewrite repo
> (`docs/`), not in the dev team's Confluence, because that is who reads them.

- **Inakshi + Claude** build it. The dev team continues shipping the current app
  untouched; the rewrite consumes none of their capacity.
- **Leadership is aware and supportive.**
- **Design authority: design-as-built.** Claude makes design decisions directly in
  code — native platform conventions, Horcery brand, current app as content
  reference. The CEO reviews working screens at milestones (instead of Figma).
  Accepted risk: rework if a direction is rejected after being built.
- **Engineering handover is designed in from day one** — the app must eventually be
  owned by engineers (releases, crashes, on-call). Repo hygiene, docs, and
  conventional structure are requirements, not niceties.

## 4. Platform requirements

- **iOS and Android, both first-class.** Customer base is roughly even (verify with
  PostHog — cheap check, worth doing early).
- **Platform-native visual language on each side:**
  - iOS: liquid glass (iOS 26+), graceful fallback below.
  - Android: Material 3 tonal surfaces/elevation — deliberately designed, never
    the silent fallback.
  - Implemented via a small shared "surface layer" (~6–10 components); no screen
    imports glass APIs directly.
- **DECIDED 2026-08-12 (adversarial review, two independent agents, both concluded the same):**
  UI strategy is **universal-led** — one component tree that renders native SwiftUI on
  iOS and native Material on Android — with SwiftUI/Compose platform accents confined
  to the isolated surface layer. Full SwiftUI-led was rejected: it would mean
  hand-building the app twice (three times with web), demote Android, and fail the
  handover requirement. Riders: (1) large scrolling lists (alerts, clips, snapshots)
  use FlashList, never @expo/ui List; (2) platform-specific accent drops are expected
  to be common enough to budget for — logged, never screen-led.
- **Component sourcing hierarchy** (in review, every exception is logged):
  1. Universal `@expo/ui` (requires latest Expo SDK)
  2. Official Expo packages (expo-image, expo-video, expo-glass-effect, expo-symbols)
  3. Software Mansion packages (Reanimated, Gesture Handler, Screens, SVG, FlashList)
  4. Platform-specific `@expo/ui` (swift-ui / jetpack-compose) where universal falls short
  5. Custom composition of the above
  6. New third-party dependency — explicit logged decision required

## 4b. Localization (decided 2026-08-13)

- The rewrite is **born localized** — English, Spanish, Russian, Turkmen from day one,
  adopting the current app's localization architecture unchanged (Sithmi's plan,
  submission 2026-09-10): **i18next + react-i18next**, bundled catalogues, the same
  twelve namespaces and key conventions, English fallback for missing keys.
- Rules from the first commit: no hardcoded user-visible strings (ESLint-enforced);
  all locale-bearing formatting (dates, numbers, plurals, lists) in ONE module;
  alert summaries as whole-sentence keys with named placeholders, never concatenated
  fragments; the pseudo-locale gate in CI.
- **Reuse, don't recreate:** the ~5,600 translated strings, the do-not-translate set,
  and the breed-name label/value separation all transfer. The old app's English
  catalogue files double as the canonical copy inventory for rebuilding screens.
- Language preference syncs via the server profile, so a customer's language follows
  them onto the new app at switch day automatically.
- RTL (Arabic/Hebrew) remains out of scope, matching the current plan.

## 4c. Proven component swaps (demo, 2026-08-13)

First vertical slice built and verified on the iOS 26 simulator: the current
app's **Configure Alert** screen (Lying Down Time), same layout, every control
swapped for a native `@expo/ui` equivalent. Branch
`demo/configure-alert-expo-ui` in the rewrite repo.

| Current app | What it is today | Rewrite |
|---|---|---|
| Segmented button rows | Styled gluestack Buttons | SwiftUI `Picker` + `pickerStyle('segmented')` |
| Time slider | ~200 lines of custom gesture code | Universal `Slider` |
| From/To time fields | `react-native-date-picker` | SwiftUI `DatePicker` (`hourAndMinute`) |
| Dropdowns | `react-native-element-dropdown` | `Picker` (menu) |
| Toggles | RN `Switch` | `Switch` |
| Primary buttons | gluestack Button | SwiftUI `Button` + `buttonStyle('glassProminent')` — liquid glass |
| Pop-up sheets | `react-native-actions-sheet` | `BottomSheet` |

Four third-party UI dependencies drop out on this screen alone. No `@expo/ui`
equivalent exists for video, charts, or the FYP card feed — those stay custom,
as planned. The demo file imports `@expo/ui/swift-ui` directly and is therefore
iOS-only; production screens route through the surface layer (§4) so Android
gets the jetpack-compose counterparts.

## 4d. Design language — universal components to the "Clarity bar" (articulated 2026-08-13)

**The governing rule (hardens §4):** every component in this app is
**universal** — one component, one import, one API, rendering correctly on
**both Android and iOS**. A screen is written once and looks native on each
platform. Concretely:

- Screens import only: universal `@expo/ui` components, universal Expo
  packages (expo-image, expo-video, …), Software Mansion packages, and the
  Horcery surface layer.
- Screens **never** import `@expo/ui/swift-ui`, `@expo/ui/jetpack-compose`,
  or any platform-only package directly, and contain no `Platform.select` /
  `.ios.tsx` forks. Platform-specific code lives *only inside* the surface
  layer, hidden behind a universal API — a caller cannot tell which platform
  it is on.
- No surface-layer component ships until its rendering is verified on **both**
  platforms. (The §4c demo imports `@expo/ui/swift-ui` directly — that was
  demo-only and does not meet this bar; production screens must not copy it.)

**Reference for the look:** Nathan Schroeder's *Clarity* speech-practice app
(github.com/SchroederNathan/clarity, MIT-licensed, reviewed at source level
2026-08-13). We adopt its **design-system discipline and aesthetic** — not its
code wholesale, and not its component choices. Clarity is iOS-led; Horcery
takes the same discipline and makes every piece universal.

**How the two asks compose:** Clarity's beauty does not come from `@expo/ui` —
it comes from a token-driven *canvas*: five small token modules (colors,
typography, spacing, radius, motion), one `ThemedText`, one glass surface, and
rules that stop drift. That canvas is exactly the §4 surface layer. So:

- **Controls** — pickers, switches, sliders, date pickers, menus, sheets —
  universal `@expo/ui`, per §4. Unchanged.
- **Canvas** — backgrounds, cards, text, spacing, corners, motion, haptics —
  a Clarity-style token system feeding the surface layer, universal by
  construction: one token set serving both platforms, both color schemes.
  Screens compose both and never name a raw value.

**What "the Clarity aesthetic" means, concretely (testable):**

1. **Editorial colour — white canvas, ink and grey, purple only where you
   press (SUPERSEDES the indigo-accent language below; decided by Inakshi
   2026-08-17 after on-device comparison of a "classic" indigo variant against
   an "editorial" one on the Pro Max, light and dark).** Near-white background
   (`#FAFAFB`) / near-black dark (`#0B0B0D`); white / graphite cards; text,
   links, selected states, icon tints and checkmarks are **ink** — the
   `accent` token *is* the ink colour. **Deep aubergine `#3F2E5C` (mauve
   `#7E6BB5` in dark) is a control fill only** — primary buttons and the
   on-state of switches (`inverse`) — and appears nowhere else. The two
   status colours are the only other chroma and stay rationed (a metric is
   never coloured by how "good" it is; red means a real alert or a validation
   error). Selection is shown by tone and weight (a light well, headline
   weight, a text-tab underline), never by an inverted block; icons sit bare
   with no tinted wells. The logo keeps brand `#615FFF`; that hue does not
   appear in the interface. Custom skeuomorphic controls (a metallic toggle
   was evaluated) are out — the native switch, tinted, is the switch. Rules
   are in `PRINCIPLES.md` ("Colour") and the `tokens.ts` header, and enforced
   by `src/__tests__/no-color-literals.test.ts` (no hex/rgb/hsl and no
   scaffold-palette import in `src/app` or `src/components`, with a reasoned
   exception list that fails when stale).
   *Historical (2026-08-14, superseded):* the earlier reference was a
   desaturated tonal-indigo family seeded from `#615FFF`, per the `@expo/ui`
   Compose gallery theme. Inakshi rejected it on device: "I just hate the
   current purple accent."
2. **A four-step ink ramp** for all text (foreground / secondary / tertiary /
   dimmed) plus the few status inks text may take. Value text is never colored
   by how "good" the value is.
3. **Rounded geometry.** Large continuous-curve corners from a six-step radius
   scale (Clarity: 28 compact cards / 36 hero cards), capsule buttons and
   pills, a rounded typeface. `borderCurve: 'continuous'` on every non-capsule
   radius.
4. **A named type ramp** with the same steps on both platforms (sizes mirror
   Apple's text styles), rendered in a rounded face that is itself a
   per-platform token behind one name; weight selected via font family (never
   `fontWeight`), tight tracking on headings, lineHeight only on prose steps.
   A screen says `variant="headline"` — it never knows which font file that
   resolves to.
5. **One 4-pt spacing scale.** Prefer `gap` over margins; one screen-edge
   padding value app-wide.
6. **Related motion.** Three duration tokens (fast 150 / base 250 / slow 400),
   three named springs with one job each; haptics on committing actions.
   Long lists stay FlashList per §4 riders.
7. **One universal `Surface` component** owning the raised-card material: same
   API on both platforms — liquid glass on iOS 26+, Material 3 tonal surface
   on Android and pre-26 iOS, tint and fallback decided inside the component
   and never re-derived per screen. Inverse near-black/near-white capsule for
   the primary action, on both platforms.
8. **Dark mode first-class from day one:** every color token defined in both
   schemes, read through one `useTheme()` hook. (Extends the For You decision
   where dark was "a follow-up" — tokens are born dual-scheme even if screens
   ship light-first.)
9. **Enforced discipline:** no screen or feature component ever names a
   `fontSize`, hex color, radius, or spacing literal — a caller needing one
   means the ramp/scale is missing a step. ESLint-enforced where practical,
   review-enforced otherwise.

**Deliverable:** Horcery equivalents of Clarity's token architecture —
`colors` / `typography` / `spacing` / `radius` / `motion` modules,
`ThemedText`, `GlassSurface` — adapted to the Horcery brand. The existing
`src/constants/theme.ts` (including the literal For You `Fyp` palette)
consolidates into this system; the Fyp values are migration input, not a
second system. MIT license permits adapting Clarity's token files directly,
with attribution in the file header.

**Platform identities (restating §4 in this language):** the universal
`Surface` renders liquid glass on iOS 26+; its other rendering *is* the
Android and pre-26 identity, expressed as Material 3 tonal surfaces —
designed, not defaulted. Both renderings ship from the same component, so no
screen ever branches on platform to look right.

**Decisions this creates (small, logged):**

- **Android rounded typeface.** SF Pro Rounded (Clarity's face) is licensed
  for Apple platforms only — bundling it on Android is a license violation.
  iOS uses SF Pro Rounded or system `ui-rounded`; Android needs a chosen
  open-licensed rounded face (or a deliberate system-face decision).
- **Icons unchanged:** expo-symbols on iOS / Material symbols on Android.
  Clarity's Hugeicons Pro is paid and would be a level-6 dependency — not
  adopted.

**Success criterion:** any two rewrite screens side by side read as one
family; CEO milestone reviews judge screens against this bar — calm, rounded,
glassy, one accent, smooth related motion.

## 4e. Confirmed designs from prototyping

Designs Inakshi has approved on-device during prototyping. These are the
reference implementations for the real build; changes require her sign-off.

**Branch model (decided 2026-08-15):** two long-lived branches in the rewrite
repo. `main` is the product — only confirmed, production-quality work.
`rnd` is Inakshi's R&D branch — options and experiments, kept alive
permanently. Flow is one-way: confirmed items are *promoted* from `rnd` to
`main` file-by-file (commit prefix `promote:`), and `main` is merged *into*
`rnd` after each promotion (`sync: main → rnd`) so R&D always builds on the
current app. Nothing merges wholesale from `rnd` to `main`. R&D-only
scaffolding (the Protos tab, layout switchers) never leaves `rnd`.

### More page (confirmed 2026-08-15)

Grouped-card More tab in the confirmed language: one card of Spaces / Clips /
Devices / Manage Alerts rows (tonal icon wells, one-line descriptions, inset
separators, chevrons), large "More" title with the hamburger opening the
main menu, and the feedback card as a lavender tonal bed with a white
"Give Feedback" pill. Light + dark verified. Omits the current app's dead
"Feeding Plans" item and dev-only Sandbox entry. Feature-flag/role gating of
Spaces and Manage Alerts, and the row destinations, come with the real
screens. Reference: `src/app/(tabs)/more.tsx` on `main`; screenshots in
`outputs/more-redesign/`.

### Main menu (confirmed 2026-08-14)

Replaces the current app's full-screen solid-purple sidebar. Confirmed
design, prototyped and verified on the iOS 26 simulator:

- **Full-screen panel sliding in from the right** (250ms ease, dim-behind),
  closing via the X, tap-out during the slide, or selecting an organization.
  The old app's swipe-right-to-close gesture is not yet implemented.
- **Content on the calm canvas, not brand purple:** grouped white/graphite
  cards, tonal indigo icon wells, saturated `#615FFF` reserved for the
  active-organization checkmark — the accent rule from §4d applied.
- **Same actions as today:** My Account, Manage Organization (↗ external),
  Devices; the organization switcher (initials avatars, live list, switching
  works against the real API); About Us, Support (↗), Log Out (confirm
  dialog, real sign-out).
- **Dark mode works from day one**; both schemes screenshot-verified.
- Built entirely on the first slice of the §4d token system
  (`src/constants/tokens.ts` + `useTokens`) — zero color/size literals in
  the screen.

Reference: `src/app/menu.tsx` on branch `proto/snapshot-carousel` (commits
`4398668` → `65c2960`); screenshots in `outputs/menu-redesign/`
(`7-fullscreen-light.png`, `8-fullscreen-dark.png` are the confirmed state).
Open question carried forward: on iPad a capped-width panel may fit better
than full-screen — decide during tablet polish, with Inakshi.

### Login and password reset (confirmed 2026-08-14)

Confirmed as the designs to build, prototyped and verified on the iOS 26
simulator, light and dark:

**Login.**
- **Landing:** purple Horcery mark with the wordmark set in the rounded type
  ramp and the "Know More. Care Smarter." tagline; actions anchored at the
  bottom in a quiet-quiet-loud hierarchy — Continue with Apple and Continue
  with Google as matching quiet cards, **Sign in with Email as the one
  inverse-capsule primary**, "New to Horcery? Create an account" as a ghost
  link. (First landing draft — three heavy pills mid-screen — was rejected.)
- **Sign in:** "Welcome back" large title, labeled email/password fields with
  password-manager autofill hooks and show/hide toggle, right-aligned Forgot
  Password?, submit disabled until the form can succeed, safe generic error
  on bad credentials. Fully functional (real Firebase sign-in).
- Sessions persist indefinitely (Inakshi, 2026-08-14).

**Password reset — the in-app 6-digit code flow** (chosen over Firebase's
hosted web page):
- Forgot Password: "We'll email you a 6-digit code…", pre-filled email,
  Send Code.
- Enter Code: six boxes, number pad, active-box accent highlight, paste
  support, Resend with 30s countdown.
- New Password: new + confirm fields with live "at least 8 characters" check.
- Done: "Password updated" confirmation → Sign In.
- Anti-enumeration stands: the flow reads identically whether or not the
  email has an account.
- **Gate to go-live:** backend issue/verify endpoints for the codes (open
  item 7) — the prototype's code step is front-end only. Apple/Google
  wiring is open item 8.

Not yet confirmed from this flow: the Face ID unlock gate (built as a
preview, on by default in the prototype; needs a real decision plus
`expo-local-authentication`) and the sign-up screens (not built).

Reference: `src/components/auth/` on `proto/snapshot-carousel` (commits
`a5b4b0f` → `75e0b75`); screenshots in `outputs/auth-flow/`
(`8-landing-v2-light.png`/`9-landing-v2-dark.png` and `2`–`5` are the
confirmed state).

### Colour theme + settings rows (confirmed 2026-08-17)

**Editorial palette confirmed** (rules in §4d item 1 and `PRINCIPLES.md`
"Colour"): white canvas, ink and grey; deep purple only on buttons and switch
on-states; status colours rationed; logo stays brand purple. Chosen on the
Pro Max against the previous indigo tokens, light and dark, on Preferences,
For You, Review History and the menu. Now the ONLY palette in
`src/constants/tokens.ts` (the R&D switcher and the classic variant were
removed once chosen — history at `f1fbe23`…`64d1c79` on `rnd`).

What changed with it, all promoted-quality on `rnd`:
- **Selection by tone.** Behavior Tracker tiles: selected = light well + ink
  icon + bold caption, others bare grey; Daily/Weekly = `TextTabs` (new pure
  RN surface component: weight + hairline underline) instead of a segmented
  control inside a card; ⋮ on the title line. Section titles up one step,
  card padding 20.
- **Icon wells removed** (Preferences rows, More rows, main menu rows).
- **Tab bar reads tokens** (was hard-wired indigo from the scaffold).
- **`SettingRow` + universal `Toggle`** (SwiftUI Toggle / Material Switch /
  RN Switch on web): the row's icon tints on and dims off, and swaps to its
  "off" glyph where the meaning changes (bell→bell.slash, wifi→wifi.slash,
  video→video.slash) with a 150 ms crossfade. Every switch is the same
  purple when on; per-row rainbow toggles were rejected as decoration. Icon
  on/off pairs are in both platform icon maps.
- `onAccent` token added (text drawn on an ink fill), so the selected day
  and avatar initials stay legible in dark.
- **Rejected:** custom metallic/skeuomorphic toggles (metal-toggles.vercel.app)
  — buildable cross-platform with gradients, but a custom control against
  principle 6 and the flat editorial look. Put away.

Reference screens: `outputs/theme-editorial/` (light + dark). Prototype
Preferences screen: `src/app/proto-preferences.tsx` (rnd).

**Dev-loop note (2026-08-17):** after a Fast Refresh the SwiftUI `Host` menus
(Switch, ⋮) can render displaced below their rows. It is a hot-reload
artefact — a full reload puts them back. Judge Host placement only after a
cold reload.

### Camera frames — one tile everywhere (confirmed 2026-08-17)

**The finding that prompted it:** the app had grown FIVE media treatments —
For You Snapshots (4:3, name on a grey strip below), For You Review previews
(4:3, behaviour above and horse below), Review History events (**3:2**, header
row above and footer row below), Horses rows (4:3 thumbnail, text beside),
and the two prototypes, which disagreed with each other on corner radius and
scrim opacity. Nothing had ever been formally confirmed: the Stalls prototype
commit says "three layout options" and no choice was logged.

**Confirmed by Inakshi on 2026-08-17, all three questions answered:**
1. **The "overlay" treatment** from the snapshot-carousel prototype — the
   frame fills its box, a bottom gradient scrim carries a white name and a
   muted second line ON the image.
2. **Every media tile in the app adopts it** — Snapshots, Review previews,
   Review History events, Horses thumbnails, and Stalls when built.
3. **4:3 everywhere** — the Review History clip stills moved off 3:2, which
   made them the only frame in the app at a different ratio.

**Implementation:** one component, `src/components/media/media-tile.tsx`.
Callers choose *content* (title, subtitle + its glyph, duration badge, alert
tag, play badge, poster/stream) and never appearance. Notes:
- `title`/`subtitle` omitted ⇒ **no scrim**: that is the Horses row, where the
  name already sits beside the frame and a caption on a 120pt tile would be
  unreadable. It still gets the shared corner, ratio and fallback.
- The duration pill is a **sibling** of the caption words inside the scrim,
  not an overlay on them — as an absolute pill it covered the stall name
  ("Lying Down · Stal…" behind a "42m" chip). Caught on device.
- A tile is a **still** unless given `videoUri` AND `live`; only one tile in a
  row or page should be live (PRINCIPLES #2). No screen passes a stream yet.
- New colour tokens, identical in light and dark because a camera frame is a
  photograph rather than a themed surface and the scrim is what guarantees
  contrast: `onMedia`, `onMediaMuted`, `scrim`, `scrimClear`, `mediaWell`.
  This is the ONE sanctioned exception to "emphasis is ink" (§4d item 1).
- `expo-video` is stubbed in `jest.setup.js`; importing it under jest-expo
  throws and would fail every suite that renders a tile.

**Visible losses, accepted:** the horse avatar chip in the Snapshots tile
footer (the frame already shows the horse; `avatarUri` stays on the type for
the fullscreen view in H5), and Review History's separate header/footer rows,
whose content moved onto the frame.

**Rejected same day:** custom metallic/skeuomorphic toggles
(metal-toggles.vercel.app) — buildable cross-platform with gradients, but a
custom control against principle 6. "If it's custom let's put it away."

Screens: `outputs/media-tile/` (light + dark).

### Horses page (R&D candidate — awaiting on-device sign-off, 2026-08-16)

Implemented on `rnd` as a read-only vertical slice, using the shipping app as
the behavioural reference without copying its per-card request architecture.
This entry records the candidate faithfully; it is **not a confirmed design**
until Inakshi reviews a populated light and dark build on device.

- Native large-title stack and native search; horizontal, sticky group chips.
- FlashList with one column on phones, two in tablet portrait and three at
  wide/landscape widths; pagination and pull-to-refresh wait for horses,
  groups, stalls and assignments.
- Horizontal cards show a 4:3 still, horse name and stall name only. The still
  falls back from the monitored stall frame to profile photo to a tonal horse
  placeholder. There is deliberately no In/Out pill: the old implementation
  freezes the query time at mount and pays a Prometheus request per card.
- Card tap keeps the existing navigation affordance and opens an explicitly
  thin, read-only detail seed. Horse actions (Edit, Manage/View Groups,
  Remove) and group actions (Add Horse, New Group, Edit Groups) remain visible
  but disabled until their write contracts and permission model are built.
- Share is not carried over: although defined in the shipping app's options
  array, it is explicitly filtered out before render and is therefore not a
  current Horses-list capability.
- Loading, unavailable/retry, base empty, group empty and search-empty are
  distinct. Development preview data is reachable only behind the standard
  `__DEV__` plus explicit preview opt-in, is clearly labelled, never writes to
  the backend, and only activates after the unfiltered real organization has
  returned zero horses.

Evidence: `npm run check` passes 15 suites / 62 tests. iOS populated visual,
interaction and network verification is pending sign-in on the dedicated
iPhone 17 Pro Max simulator; Android verification remains required before
promotion. The implementation does not reintroduce Record/manual-entry event
types removed in §2.

## 5. Timeline and rollout

- **Quality-led, no fixed date** ("done when done") — but not open-ended drift:
  milestones with CEO reviews provide the cadence, and beta users should be on the
  app within months, not at the end.
- **Staged rollout:** Inakshi + internal daily use → friendly customers (beta) →
  store update for everyone. Each stage catches what the previous missed.
- **Hardware-in-the-loop:** provisioning can only be tested standing next to a real
  Stall Monitor. Inakshi needs one on hand for the internal-use stage.

## 6. Explicitly out of scope / parked

- **Show Me (global cross-entity search over horses, stalls and behaviours) —
  RETIRED (Inakshi, 2026-08-17).** Replaced by per-page search (e.g. the Horses
  header search bar). No `/show-me` route, no header magnifier that leaves the
  page. Parity passes must treat it as intentionally dropped.
- **Role-based permissions on the Horses/Horse Details pages — PARKED
  (re-confirmed 2026-08-17).** All write actions are disabled-with-reason for
  every user until the write side; permissions gate them before any goes live.

- **Charts renderer choice** — ~~deferred to a measured spike~~ **RESOLVED
  2026-08-19: Victory Native on Skia.** ECharts (SVG and Skia) rejected — it fails
  §6a's interaction-freeze and worst-case-smoothness gates on a physical mid-range
  Android, unrecoverably, while being fine on a premium iPhone. Full reasoning,
  measurements, reversal conditions and the untested gaps are in
  `docs/decisions/CHART_RENDERER_DECISION.md`. §6a below records the approach that
  produced the decision and remains the authority for the gates; §9 records the
  correction that produced the approach.
- The old app's codebase is **read-only reference** — never edited by this project
  (exception: the provisioning bug fix already reported separately, which lands in
  the old app via the dev team).
- Web: mobile launches first, but web is **desired future scope** (stated 2026-08-12).
  The universal-led UI decision (§4) means the same screens can later render on web
  from the same code — one of the reasons full SwiftUI-led was rejected.

## 6a. Charts — agreed approach (2026-08-15, after adversarial review)

**Decision: build a clean chart architecture now; defer the renderer choice to two
measured spikes.** Neither "port the old chart package" nor "delete it and rebuild
in Victory" was approved.

**Agreed:**

- **One renderer-independent chart domain layer.** Feature screens know only
  Horcery concepts — `IntervalEvent`, `ObservationSeries`, `Threshold`. They never
  import a chart library, never author PromQL, never see a Prometheus URL.
- **The legacy chart package is evidence, not source.** Its 3,329 lines of ECharts
  option generators are the only executable specification of how ~17 chart families
  behave (tooltips, zoom bounds, tablet positioning, no-data states, timezone
  handling). Mine them for requirements and golden fixtures; do not copy them, and
  do not delete them before the fixtures exist.
- **PromQL is preserved as characterized domain knowledge**, not embedded in the new
  client. 43 exported declarations in `prom-utils.ts`. Long-term, query ownership
  moves server-side to an observation API; short-term the current backend sits
  behind an adapter.
- **Two bounded spikes, then one winner.** Wuba/ECharts (SVG and Skia) vs Victory
  Native, same fixtures and the same accuracy and visual requirements, no reduced
  feature set to flatter either. Both may exist briefly on an R&D branch; the loser
  is removed before production work. **Never two chart engines in production.**
- **First slice: People In Stall** — hardest representative case (compound intervals,
  Remote Config + fallback, tooltips, zoom, clips, timezone boundaries).
- **Measured for renderer selection in release-like builds on the supplied
  Redmi Note 12** (mid-range Android). By Inakshi's one-day scope decision on
  2026-08-17, a modern Android, iPhone and tablet are pre-beta confirmation
  checks on her own devices rather than renderer-selection blockers. Simulator
  evidence covers layout only. Not dev-mode animations.
- **Accuracy is a rejection gate, not a weighted trade-off.** A renderer is rejected
  if identical input changes timestamps, values, units, thresholds, interval meaning,
  missing-data meaning, timezone/DST meaning, or level-of-detail semantics.
- **Whole-catalogue scalability is required.** People In Stall is the first stress
  slice, not proof for every chart. Before selection, catalogue the legacy chart
  families and build bounded representative slices for capabilities People In Stall
  does not exercise (at minimum continuous time series and mixed/annotated series).
  Reject a renderer that succeeds here only by creating bespoke, duplicated adapters
  across the remaining charts.
- **Scoring weights:** smoothness 30%, reliability/memory 25%, whole-catalogue
  scalability 20%, behavioural parity 15%, implementation cost 10%. Quality decides;
  cost breaks ties.
- **Rejection gates:** no crashes or unbounded memory growth over repeated
  navigation; no missing labels/legends/tooltips; no interaction freeze >100 ms;
  pan/zoom smooth under worst-case data; charts never delay first screen content;
  memory substantially returns after 10 mount/unmount cycles; identical data yields
  identical domain meaning; and representative chart families fit one bounded,
  renderer-independent architecture.
- **Guardrails before either spike:** ESLint configured with
  `react-hooks/exhaustive-deps` failing the build; a test runner; deterministic
  rendering fixtures; a rule preventing feature screens from importing chart
  libraries or Prometheus directly.
- **The water chart is replaced regardless** — the only genuine WebView chart, and it
  downloads an executable extension from a CDN at runtime.

**Excluded:** copying the old chart directory; rehabilitating the old wrapper (it is
read-only reference — its defects are evidence of failure modes to avoid, not work to
do); two chart engines in production; a bespoke chart framework; feature screens
authoring PromQL; runtime-downloaded chart extensions.

**Deferred from the renderer spike (Inakshi, 2026-08-16):** manual VoiceOver and
TalkBack validation. Keep the small renderer-independent semantic layer and its
automated bounds/formatting tests; spoken screen-reader validation is a pre-release
shipping gate, not a renderer-selection blocker in this spike.

**Decision-day evidence scope (Inakshi, 2026-08-17):** the deterministic
6,720-bar ceiling substitutes for the unavailable observed-heavy QA response
for renderer selection. This lowers recommendation confidence and does not
remove observed production data from the winner's pre-beta validation. The
physical matrix must use traceable automated gestures, uncontaminated scored
runs (no concurrent build or screen recording), generated tables from raw
logs, and same-process PSS checkpoints after 0/10/25/50 remounts. If physical
gesture automation cannot be proven, the report must mark interaction metrics
unmeasured and may not manufacture a decision-grade matrix.

**Device scope reduced (Inakshi, 2026-08-17):** the original rule required
release-like measurement on a mid-range Android, a modern Android, an iPhone and a
tablet before selection. Only a mid-range Android (Redmi Note 12, Android 15) is
available, and the decision is needed within one day so that chart building can
start. **The mid-range Android is therefore the deciding device.** Modern Android,
iPhone and tablet become pre-beta shipping checks on Inakshi's own devices, not
selection blockers; simulator evidence for them covers layout only. Two facts make
this defensible: both finalists render through the same Skia engine, so the
platform-level risk is shared, and the renderer sits behind a proven
renderer-independent domain seam, so a wrong choice costs adapter work rather than
a rewrite. Two consequences are accepted: the recommendation carries lower
confidence than §6a originally demanded, and the Redmi Note 12 is a current
mid-range device rather than the older "A7 class" named above, so it is a weaker
worst-case proxy. Both must be stated in the recommendation.

**Observed-heavy fixture (2026-08-17):** the anonymised production `query_range`
response has not been supplied. The synthetic 6,720-interval ceiling stands in for
it. If the real response later exceeds that ceiling in size or shape, the winner is
re-measured against it — this is a stated gap, not a satisfied requirement.

**Loser removal timing (clarified 2026-08-17):** §6a requires the loser to be
removed "before production work", which is not the same as on decision day. The
losing spike adapter and all Run 2 evidence are retained until the winner has
passed integration into `src/`; removal is then a separate, verified commit. Only
one chart engine ever ships.

**Inakshi's review is limited to** whether the winning chart feels smooth, clear and
premium. The objective gates decide everything else.

## 6a-i. OPEN DECISION — where chart configuration lives (raised 2026-08-17)

**Status: not decided. To be settled with Inakshi when charts work starts, before
the first chart is wired to real data.** §6a settled the *renderer* and said query
ownership should eventually move server-side; it did not address the layer that
actually controls the charts today.

### What is true in the shipping app

The chart **data** comes from Prometheus (`metrics.magichoof.com`). Firebase never
sees a data point. But almost everything *about* each chart is read from **Firebase
Remote Config** at app start:

- **The PromQL query text itself** — `STALL_OCCUPANCY_QUERY`,
  `ANIMAL_SITTING_DOWN_DETECTION_QUERY`, the `AVG_*_FEDERATED_PROM_QUERY_*` family,
  ~25 query strings in total.

  > **Correction (2026-08-17, while building Horse Details slice 2).** An earlier
  > version of this section said the app "reads the query out of Firebase". That
  > overstated it, and the real arrangement matters to the decision:
  >
  > **The queries live in code** (`packages/config/src/utils/prom-utils.ts`, 43
  > exported declarations) and Firebase Remote Config **overrides** them. Each
  > consumer does `const fromFirebase = getRemoteString(KEY); return
  > fromFirebase.length > 0 ? fromFirebase : theCodeQuery`. Firebase's own
  > defaults are **empty strings** (`DEFAULT_FRC_VALUES.string = ''`), so in
  > normal operation the reviewed code query runs.
  >
  > This is better than "Firebase is the only source" — an unreachable Firebase
  > falls back to something correct rather than to nothing. **The risk in the
  > decision below is unchanged:** typing a value into the console silently
  > replaces the reviewed, version-controlled query fleet-wide within five
  > minutes, with no review, no test and no history — and nothing on screen
  > tells you it happened.
  >
  > The rewrite currently ships the code queries only
  > (`src/config/constants/prometheus-queries.ts`) and says so on screen, per
  > decision D7.
- **Whether a chart renders at all** — the `HIDE_*` switches (stall occupancy,
  lying down, activeness, rolling, human in/near stall, climate, ambient, last 24
  hours).
- **Which customers see it** — ID lists: `FYP_CHARTS_ORG_IDS`, `ALERTS_ORG_IDS`,
  `EXPORT_CHART_ORG_IDS`, `SPACES_ORG_IDS`.
- **The thresholds charts colour against** — `THRESHOLD_24_HOURS_RESTING`,
  `THRESHOLD_24_HOURS_AWAKE`, the in-stall exclusion bounds.
- **Deviation tagging** — the `DISPLAY_DEVIATION_TAG_FOR_*` switches.
- **A data-source switch** — `OCCUPANCY_DATA_BACKEND_SWITCH` moves occupancy off
  Prometheus onto the regular backend.

Every value ships with a baked-in default; if Firebase fails or the device is
offline at launch the app falls back silently. Values refresh at most every five
minutes.

### The decision, in plain terms

**Who is allowed to change what a chart means, and what has to happen first?**

Today the answer is: anyone with Firebase console access, and nothing. A person can
edit a query string in a web form and every phone in the fleet starts asking a
different question of the data within five minutes — with no pull request, no
review, no test run, no record of who changed it or why, and no way to tie a chart
that looked wrong last Tuesday back to a change.

That is the same power as a code deploy, without any of the controls we put on a
code deploy. It is also genuinely valuable: it is how the team fixes a bad query or
dark-launches a chart to one customer without waiting on an App Store release.

### The three options

| | Where queries live | What you gain | What you give up |
|---|---|---|---|
| **A. Keep it as-is** | Firebase console | Change anything in minutes, no release | No review, no history, no tests; a chart's meaning is not in the repo |
| **B. Move queries into the app** | Version-controlled code | Reviewed, tested, traceable; the chart's meaning is readable | A wrong query needs an app release (or an over-the-air update) to fix |
| **C. Move queries behind the backend** | An observation API our server owns | Reviewed *and* changeable without a release; the phone stops authoring queries entirely | Backend work, and backend is the chronically under-resourced team |

**C is the direction §6a already points at** ("query ownership moves server-side to
an observation API"). The open question is whether we can afford it at the time, and
what we do in the meantime.

**Note the two halves can be split.** The *queries* (what the chart means) and the
*switches* (who sees it, when) do not have to go the same way. A reasonable landing
place is: queries move to code or the backend, because getting them wrong changes
what a customer is told; the org-ID lists and `HIDE_*` flags stay in Remote Config,
because they are rollout controls and changing them fast is the point.

### What to decide, concretely

1. Do the chart queries stay in Firebase, move into the repo, or move behind the
   backend? (A / B / C)
2. If they stay in Firebase for now: do we require a written change record, and who
   is allowed to edit them?
3. Do the visibility flags and org-ID lists follow the queries, or stay where they
   are?
4. Does the rewrite keep the silent-fallback-to-defaults behaviour, or say out loud
   when it is running on defaults? (Under our honest-states rule, a chart quietly
   answering a stale question is exactly the failure we said we would not ship.)
5. Who owns the Firebase console values day to day — today this is undocumented.

### Why it cannot be left until after the charts are built

The answer changes the architecture. If queries move server-side, the app's chart
layer takes a series of numbers from an endpoint and never knows PromQL exists. If
they stay client-side, the app needs the Remote Config plumbing, the defaults, the
staleness handling and the fallback behaviour — none of which has been carried into
the rewrite yet.

## 6b. Foundation hardening — HOLD SCOPE (adversarial review, 2026-08-15)

**Status of `main`: visual and structural prototype, not production replacement.**
An independent review of the promoted screens (For You, menu, login/reset, More)
found the following, all accepted by Claude as correct. **No further screens are
promoted to `main` until the hardening slice below is complete.** The `rnd`
branch continues as R&D without restriction.

**Findings (P1 unless noted):**

1. **Android is not first-class yet.** For You's Switch menu, ⋮ menus and
   segmented controls import `@expo/ui/swift-ui` directly, violating §4d; menu
   and More use bare SF Symbol names that render nothing off iOS. → Build and
   verify universal `Menu`, `SegmentedControl` and `Icon` adapters in
   `src/components/ui` on both platforms first; CI rule forbidding
   swift-ui/jetpack-compose imports outside that folder.
2. **False health state.** The organization card hardcodes "Everything looks
   normal" + a green dot. The current app derives no-alerts-configured / normal /
   N active alerts / loading / error. → A monitoring app must never present
   unknown as normal: derive the state, with explicit loading and unavailable
   presentations.
3. **Dead controls on main.** Search, Customize, Manage Organization, See
   History, Manage Alerts, Review filter, snapshot options, tracker options,
   Switch to Stalls, all More rows, five menu rows render as buttons and do
   nothing. → Mechanical rule: **a visible interactive element must navigate,
   act, be visibly disabled with a reason, or not render.**
4. **Preview auth mistakable for real security.** Reset sends no email, accepts
   any six digits, never submits the password, yet reports success; Face ID
   gate is on globally and unlocks on tap. → Compile-time excluded from
   production builds, not comment-guarded.
5. **Feature flags and customer widget preferences bypassed.** For You always
   renders Org/Snapshots/Review/Tracker; Remote Config is hard-disabled
   (`NATIVE_AVAILABLE=false`) even for a native build. → Restore Remote Config +
   saved widget preferences gating before any parity claim.
6. **Snapshots lose data and behaviour.** `slice(0, columns)` shows only the
   first page; dots are decorative; single-page `list` calls drop stalls in
   large orgs; loading/error discarded; refresh omits `animalStall`; thumbnails
   don't render (auth header); fullscreen, live/timelapse, playback preference,
   foreground refresh, navigation, pagination not carried. → Keep the
   still-image optimisation; rebuild the full interaction contract as the
   **first fully characterised vertical slice**.
7. **Localization not started at the boundary** (violates §4b). No i18next,
   English hardcoded, no no-literal lint, fixed-width hosts that won't survive
   longer strings. → Install before any further screen.
8. (P2) `isRefreshing` reflects any matching fetch, not the pull gesture;
   `refresh()` doesn't await; key set incomplete. → Dedicated pull state around
   an awaited `Promise.all`.
9. (P2) Organization clock is `useMemo`'d and freezes. → Minute-aligned tick as
   the current app does.
10. (P2) No tests, no installed ESLint, no CI, no observability in the promoted
    slice. Typecheck alone cannot catch any of 2–9.

**Hardening slice (in this order):** universal adapters + import-rule CI →
i18next + no-literal lint → test/lint infrastructure (unit, component,
contract, journey) → explicit loading/unavailable/preview/error states
everywhere on main → Snapshots as the complete vertical slice → parity ledger
(legacy capability, legacy bug fix, rewrite decision, acceptance test) →
iOS **and** Android device validation before any screen is accepted.

**Legacy fixes to characterise before their slice is declared done:** alert
status flash + real counts; alert permissions/navigation; snapshot network
error + pagination; tablet rotation/fullscreen; snapshot foreground refresh;
mute/fullscreen; review filter counts + empty filter; Android tracker scroll;
live-video recovery; account/organization permission guards.

**Second review, 2026-08-15 — corrective pass (commit `2209356`).** Findings
accepted and fixed: alert status used the device timezone and a "today" that
never rolled over (now the organization's zone, ticking on the minute via
`useOrganizationNow`, which also fixed the frozen clock — one root cause);
"N active alerts" overstated what the query knows and is now "N alerts today"
until the backend exposes resolved state; the ReviewCard test protected the
dead-control bug and was rewritten around absence, plus a screen-level
`no-dead-controls` test; password-reset resend swallowed its error and both
countdowns drifted (one deadline-based hook now). **Claim corrected:** previews
are NOT "compiled out" — verified against a real `expo export`, the strings
ship because Metro cannot tree-shake a runtime env read. They are
*unreachable* when `__DEV__` is false, now asserted by test. The review's
"gate is red" finding read the pre-H1 checkout; at HEAD it was already green.
Gate now: 0 lint errors, typecheck clean, 29 tests.

**What survived and stays:** empty-org gating, device-query consolidation with
full pagination, Android unknown-network fix, org selection not overwritten,
logout clears cross-org cache, 401 refresh-and-retry, time-quantized snapshot
URLs, the token system, and the confirmed *visual* designs in §4e (which
remain confirmed as designs — their implementations are what is incomplete).

## 6c. Review History — scoped 2026-08-15 (not built)

Full assessment and product decisions in `Horcery_Review_History_Scope.md`;
dev-team tickets for the four P1 shipping-app bugs in
`Horcery_Review_History_Dev_Tickets.md`. Decisions: purpose is both catch-up
timeline and investigation; read-only log (no synced reviewed state); group by
day + date range; **organization timezone** for day boundaries; **alerts
included by default**; stills with tap-to-play (one player on the screen,
ever); **one screen with honest, editable filters** for all 14 entry points.
Two layouts to prototype on `rnd`: timeline, and Inakshi's pinned-player +
scrolling-stills list (YouTube / Apple TV / Ring-style). Blocked behind
hardening H1–H4.

## 7. Open items (prerequisites, not blockers to starting)

| # | Item | Why |
|---|------|-----|
| 1 | Collect the actual complaint specifics (support tickets, store reviews, HubSpot) | "Confusing" needs a named list of confusing flows before reorganization; "looks" needs examples of what customers compare us against |
| 2 | Verify iOS/Android split in PostHog | An afternoon's work; changes polish priorities if wrong |
| 3 | Confirm Stall Monitor access for Inakshi | Gates the internal-use rollout stage and all provisioning testing |
| 4 | Agree working rhythm (Inakshi's weekly time for decisions + device testing) | A "you and me" build moves at the pace of your availability |
| 5 | Charts renderer spike (§6a) | Run BEFORE implementing charts on For You or Stalls. People In Stall first. Output: side-by-side videos, scorecard, device measurements, recommendation |
| 6 | Android rounded typeface (see §4d) | SF Pro Rounded cannot ship on Android; needed before the type ramp lands, an hour's comparison |
| 7 | Backend endpoint for 6-digit password-reset codes | Inakshi chose in-app code reset (2026-08-14) over Firebase's web reset page; Firebase alone cannot issue codes, so the dev team needs to add issue+verify endpoints before the flow goes live. The prototype's flow is front-end only. |
| 8 | Apple/Google sign-in wiring | Front-end approved for preview 2026-08-14; real wiring needs native builds + backend acceptance of those identities (and Apple sign-in is mandatory on iOS once Google ships) |

## 8. Success criteria

- Look-and-feel complaints stop; store ratings and support-ticket tone improve.
- Both platforms feel native and smooth to their users.
- No capability regression on switch day; no reliability regression ever
  (alerts, feeds, provisioning).
- The dev team can inherit the codebase without archaeology.

## 9. Corrections log

Errors found in this document or in advice given, and what replaced them. Kept so
that future work does not re-derive from a corrected premise.

| Date | Claim | Correction |
|------|-------|------------|
| 2026-08-15 | "ECharts is WebView-based" (§6, since removed) | **False for the main chart system.** `packages/charts/src/index.tsx` imports `SvgChart`/`SVGRenderer` from `@wuba/react-native-echarts` and initialises with `renderer: 'svg'` — a native SVG renderer, and the library also ships a Skia backend. **Only** `packages/widgets/src/water-chart` uses `react-native-echarts-pro` (the WebView one). The "delete ECharts" recommendation built on this premise was withdrawn. |
| 2026-08-15 | The People In Stall bug is evidence against ECharts | **It isn't.** The defect (missing `queryFRC` dependency, `prometheus-bar-chart-widget-v3`) occurs before rendering and would occur on any renderer. It argues for consolidating the three duplicated widgets and enforcing hook-dependency lint — not for changing library. |
| 2026-08-15 | The 3,329 lines of ECharts generators "have no value" | **Too strong.** The syntax is library-specific, but the behaviour encoded — interval construction, tooltip content, zoom bounds, timezone/day formatting, tablet positioning, no-data states — is the only executable specification of ~17 chart families. Mine for fixtures before discarding. |
| 2026-08-15 | "Port all PromQL unchanged into the new app" | **Wrong destination.** Preserve it exactly, but as versioned legacy knowledge + golden fixtures, with query ownership moving server-side. The mobile client should request semantic observations, not author PromQL and pick Prometheus endpoints. |
| 2026-08-15 | Overlapping `act()` errors are "a known React Native Testing Library v14 quirk" that awaiting `cleanup()` does not fix (note in `jest.setup.js`) | **Wrong on both counts.** RNTL's auto-cleanup already awaits itself. The cause was ours: `fireEvent.press` returns `Promise<void>` in v14, like `render` and `rerender`, and two calls were not awaited. Adding the awaits removed the errors and cut the suite from 21.8s to 6.4s. A console guard now fails any test that produces unexpected `console.error`/`console.warn`, so this class of thing cannot be discovered by reading scrollback again. |
| 2026-08-15 | The seed test for `stall-monitor-video-helper` "locks the Snapshots data-loss failure mode" | **Overstated.** It covers thumbnail URL construction and 10-second frame maths only — none of §6b finding 6. Truncation is now genuinely covered by `snapshot-paging.test.ts`; omitted paginated stalls and incomplete refresh queries remain open for the Snapshots slice. The comment claiming otherwise was worse than no comment: it invited the next reader to believe a failure mode was guarded. |
| 2026-08-15 | The guardrails are complete because `npm run check` and CI pass | **Passing was not the same as clean.** Both were green while carrying 17 lint warnings and two React `act()` errors. `--max-warnings=0` now applies, the remaining three exceptions are per-file with a reason and an owning task in `eslint.baseline.js`, and `lint-baseline.test.ts` lints with those exceptions removed and requires the offenders to match the declared list exactly — so the baseline fails on a new violation *and* on a stale exception. |
| 2026-08-15 | The legacy chart "slides bars by up to an hour on daylight-saving days" because it projects clock time onto a fixed 1970 date (People In Stall catalogue, quirk 2, first version) | **Wrong, and briefly "fixed" the wrong way.** Clock-time positioning is *correct* for seven rows sharing one hour axis — it is what makes 7 AM line up down the chart. My first domain layer positioned by real elapsed time, which would have broken that vertical scan on DST days. Reverted to clock alignment (`positionInDay`); the true DST costs — duration distortion across the spring gap, overlap in the fall repeated hour — are now tested and recorded, not hidden. Caught while wiring the harness, before any renderer measured against it. |
| 2026-08-15 | Import boundaries were enforced (guardrails report) | **Enforced with holes.** The rules were an allow-list keyed on `src/app` and `src/components`, which exempted `src/hooks`, `src/stores` and every directory not yet created — including where the next screen's data fetching would go. Now default-deny across `src/**`, with `src/components/ui`, `src/components/charts` and `src/services`+`src/config` re-opening exactly one group each. Lint probes assert rejection at `src/features/` and `src/domain/`, paths that deliberately do not exist. |
