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
    be faster" is not a result. See 13–15: a number on its own is not proof.
12. **Accessible by default.** Every interactive element carries a role,
    a label, and a 44pt target. Cheaper now than later, and it is what makes
    QA automation possible.

## The three learned the hard way (charts spike, 2026-08-18)

These are not proposals. Each one is written down because we nearly got a
decision wrong, and the near-miss is named so the lesson keeps its teeth.

13. **A good score can be the symptom, not the proof.** In the charts spike one
    chart library scored *perfectly* on the smoothness measurement — "no slow
    updates at all" — while the app sat frozen under Inakshi's finger. It scored
    perfectly *because* it had stopped drawing: something that draws nothing can
    never draw slowly. Before any measurement is believed, confirm the thing
    actually worked — did the picture change, did the app answer a touch. And
    when a person says it felt slow and the numbers say it was fine, the person
    is the one to trust until the gap is explained. Inakshi's "very slow" and
    "basically unusable" were right on both occasions the numbers disagreed.

14. **Reality sets the test, not our imagination.** We spent days stress-testing
    the charts with 6,720 events in a week. When we finally queried the real
    monitors, a real week contained **36 to 350**. We had been failing candidates
    on a load roughly nineteen times heavier than anything a customer produces,
    and nearly chose on that basis. Before optimising or rejecting anything for
    performance, measure what the real data actually is. Keep an extreme case if
    it is useful, but label it as extreme and never let it outrank the realistic
    one.

15. **Simulators rank; real devices decide.** The same chart code, with the same
    data, drew comfortably on a simulated top-end iPhone and was completely
    unusable on a real mid-range Android — three times, needing a force-stop each
    time. A simulator runs on a laptop's power and will forgive what a customer's
    phone will not. Use simulators to compare options quickly; never let one
    certify that something is fast enough to ship. Anything not tested on real
    hardware is written down as untested, not assumed to be fine.

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
