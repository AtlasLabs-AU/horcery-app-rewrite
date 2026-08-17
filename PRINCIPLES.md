# Horcery Rewrite — First Principles

Agreed by Inakshi, 2026-08-15. Every design and engineering decision in this
repo is held against these. When a change can't be justified by one of them,
it doesn't go in. When two collide, the tie-break rule at the bottom applies.

## The five (from Inakshi)

1. **Universal components.** `@expo/ui` first — one component, one import,
   rendering native SwiftUI on iOS and Material on Android. A screen is written
   once. Platform-specific code lives only inside the surface layer
   (`src/components/ui`), never in a screen.
2. **Performance.** Smooth, fast, no dropped frames, fast cold open. Media
   tiles are stills until in view; long lists are FlashList; below-the-fold
   sections mount deferred; nothing refetches that is already fresh.
3. **Clean and minimalist.** Nothing on screen that isn't earning its place.
   Fewer, better elements. Whitespace is a feature.
4. **Liquid glass, beautifully.** The platform's native material, used with
   restraint where it reads as premium — never as decoration everywhere.
   Material 3 tonal surfaces on Android are the designed counterpart, not a
   fallback.
5. **User-friendly and intuitive.** A horse owner understands a screen without
   being taught. Native controls behave the way the phone already taught
   them. Every screen answers "what am I looking at, and what can I do?" in
   two seconds.

## The seven (proposed by Claude, agreed by Inakshi)

6. **Native over custom.** If the platform has the control — menu, sheet,
   picker, segmented control, tab bar — use it. Hand-built imitations are how
   the current app got its "slightly off" feel.
7. **Every decision explained and reversible.** Comments say *why*, not what.
   Deviations from these principles and every new dependency are logged in
   the requirements doc. Prefer changes that are one file to undo.
8. **Correct in light and dark from day one.** No "dark mode later" pass.
   Both schemes are reviewed whenever a screen is reviewed.
9. **Tokens, never literals.** No hardcoded colours, sizes, radii or spacing
   in screens. A literal that seems necessary means the token scale is missing
   a step — add the step.
10. **Real data, read-only, from the start.** Build against production reads
    so nothing surprises us at launch. Writes to production are blocked in
    code and enabled only deliberately.
11. **Measured, not asserted.** Performance claims come with numbers.
    Layout claims come with on-device screenshots, light and dark. "It should
    be faster" is not a result.
12. **Accessible by default.** Every interactive element carries a role,
    a label, and a 44pt target. Cheaper now than later, and it is what makes
    QA automation possible.

## Colour (decided by Inakshi, 2026-08-17)

The look is **editorial**: white canvas, ink and grey doing the work, one
deep purple used only where you press. This is how principles 3, 4, 8 and 9
cash out in colour, and it is enforced by `src/__tests__/no-color-literals`:

- **Canvas and ink.** Near-white background, white cards, four-step grey ink
  ramp. Text, links, selected states, icon tints and checkmarks are **ink**
  (`colors.accent` *is* ink) — never a hue.
- **Purple is a control fill, nothing else.** Deep aubergine (`colors.inverse`)
  on primary buttons and the on-state of switches. Not on links, chips,
  icons, headers, avatars, pills or backgrounds. Lifted to mauve in dark so
  it still reads as purple.
- **Status is the only other chroma**, rationed: red for a real alert or a
  validation error, green for confirmed-good. Data is never coloured by how
  "good" it is. On a monochrome page one red pill is unmissable — that is
  the point.
- **Selection by tone and weight**, never by an inverted block: a light well
  and headline weight, or a text tab with an underline. Icons sit bare — no
  tinted circles behind them.
- **The logo keeps brand `#615FFF`.** That hue does not appear in the UI.
- **No custom skeuomorphic controls** (metallic toggles and the like were
  looked at and put away, 2026-08-17): the native switch, tinted, is the
  switch. Depth comes from air and hairlines.
- **Camera frames are the one exception.** A photograph is not a themed
  surface, so a caption on one takes its contrast from the scrim beneath it,
  not from the scheme: white type on a gradient, identical in light and dark
  (`onMedia` / `scrim` in tokens). Every frame in the app is 4:3 and is drawn
  by `src/components/media/media-tile.tsx` — screens choose content, never
  appearance.
- Every value lives in `src/constants/tokens.ts`; light and dark carry the
  same keys. A screen that "needs" a colour literal means the palette is
  missing a role — add the role.

## Tie-break

**Smooth over showy.** When principles collide — glass that costs frames on
an older phone, an animation that delays first content — performance and
intuitiveness win. Visual effect is used where it is free and degrades
gracefully where it isn't.

## How this is applied

- Every PR/commit description names the principle(s) that motivated it when
  the reason isn't obvious.
- Milestone reviews (CEO / Inakshi on device) judge screens against the five
  first, then the seven.
- Anything that violates a principle is either fixed or written down as an
  explicit, dated exception with the reason — never left implicit.
