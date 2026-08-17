# Horses page — handover to Codex

**Date:** 2026-08-16 · **From:** Claude (session with Inakshi) · **Repo:** `/Users/inakshi/AI Projects/Horcery/horcery-app-rewrite` · **Branch:** `rnd`

You are building the Horses tab of the Horcery app rewrite. Inakshi has
approved the plan below. She is a non-technical PM: report to her in plain
language, and show her the screen on the simulator rather than describing it.

---

## 0. Read these first (in this order)

1. `horcery-app-rewrite/PRINCIPLES.md` — the twelve first principles. Every
   decision is held against them. Tie-break: **smooth over showy**.
2. `horcery-app-rewrite/AGENTS.md` — repo rules (Expo SDK 57 docs, principles).
3. `docs/requirements/Horcery_App_Rewrite_Requirements.md` (moved into this repo 2026-08-17)
   — §4d tokens, §4e confirmed designs, §6b HOLD SCOPE + the standing control
   rule, §6c Review History (the closest sibling screen to this one).
4. `horcery-app-rewrite/src/app/review-history.tsx` and
   `src/components/review-history/*` — the most recent real screen; copy its
   conventions (tokens, states, sample-data banner, `Menu`, `Icon`).
5. `horcery-app-rewrite/src/hooks/use-snapshots.ts` — the batched-join data
   pattern this page reuses.

## 1. Non-negotiable constraints

- **Production API is LIVE customer data. The rewrite is READ-ONLY.** No
  mutations, ever. `assertWriteAllowed` enforces it; do not set
  `EXPO_PUBLIC_ALLOW_PRODUCTION_WRITES`.
- **Never commit** `GoogleService-Info.plist`, `google-services.json`,
  `.env.local`, or any key. Never ask Inakshi to paste credentials into chat.
- **The old app repo `84-horcery-app-react-native` is a read-only blueprint.**
  Read it; never edit it.
- **Import boundaries are default-deny across `src/**`.** Platform-specific
  `@expo/ui/swift-ui` / `jetpack-compose` imports are allowed ONLY inside
  `src/components/ui`. Screens and hooks use the universal surface
  (`Menu`, `Icon`, `SegmentedControl` from `src/components/ui`). If you need
  a new native control, add it to the surface layer with `.ios.tsx` /
  `.android.tsx` halves and a shared `-types.ts`, like `menu*`.
- **`npm run check` must be green before every commit**: `eslint . --max-warnings=0`
  (a warning fails), `tsc --noEmit`, `jest --ci`. `eslint.baseline.js` holds
  pre-existing exceptions; **never add an entry to silence something new.**
- **Tokens, never literals.** Colours via `useTokens()` (`colors.*`), spacing
  via `space.*`, radii via `radius.*`, text via `type.*` from
  `src/constants/tokens.ts`. Light + dark both work by construction.
- **Standing control rule (Inakshi, 2026-08-15):** a visible control either
  navigates, acts, or is **visibly disabled** — never renders as a live
  button that does nothing. She wants unwired controls *present but dimmed*
  so she can judge the whole composition. Never hard-code
  `accessibilityRole="button"`; make it conditional on a handler
  (`src/__tests__/no-dead-controls.test.ts` enforces this — extend it to the
  new components).
- **Preview/sample data** lives behind `PREVIEWS.*` in `src/config/previews.ts`
  (`__DEV__ && EXPO_PUBLIC_ENABLE_PREVIEWS==='true'`). Any sample rows must be
  labelled on screen with the `SampleBanner` pattern and must yield to real
  data.
- **Tests: React Native Testing Library v14 — `render`, `rerender`,
  `fireEvent.press` are ALL async.** Missing `await` ⇒ "overlapping act()" and
  assertions against a stale tree. `jest.setup.js` fails any test that emits an
  unexpected `console.error/warn`; opt in with `expectConsole(/pattern/)`.
- **Shared checkout.** Two other sessions work in this same directory (a
  Claude session on `main` via a worktree at `/Users/inakshi/dev/horcery-app-rewrite-main`,
  and one that leaves For You sample-data work uncommitted here). Always
  `git status` first, **stage by explicit path**, never `git add -A`, never
  commit files you did not change (currently uncommitted and NOT yours:
  `src/app/(tabs)/index.tsx`, `src/components/for-you/*`,
  `src/components/review-history/event-card.tsx`, `src/config/previews.ts`,
  `src/config/__tests__/previews.test.ts`, `src/config/sample/for-you-sample.ts`,
  `src/config/sample/__tests__/`, `outputs/for-you-sample/`).
  Exception: you will need to add ONE flag to `src/config/previews.ts` and one
  line to its test — that is fine to include; both files are self-consistent.
- **Simulator work goes through argent MCP tools** (`.claude/rules/argent.md`):
  `describe` before every tap, never derive coordinates from a screenshot,
  never `xcrun simctl` for interaction. Use the **iPhone 17 Pro Max,
  UDID `53E8803D-9969-4B67-9130-38E560DD8622`** — the iPhone 17 Pro
  (`09C755C6…`) belongs to another session; do not drive it. Metro for the
  rewrite runs on **port 8083** (`npx expo start --port 8083`; 8081 is the old
  app's). Expo Go is installed on the Pro Max; open `exp://127.0.0.1:8083`.
  Fast Refresh is unreliable — restart the app in Expo Go rather than
  trusting a hot reload. On session end call `stop-all-simulator-servers`
  scoped to `["53E8803D-9969-4B67-9130-38E560DD8622"]`.
- Native builds break on the space in `/Users/inakshi/AI Projects`; you
  should not need one for this task (Expo Go + Metro suffices).

## 2. Why this page is being rebuilt (review of the current app)

Read from `packages/widgets/src/animal-list-widget/index.tsx`,
`animal-stall-card/index.tsx`, `list-item-thumbnail/index.tsx`,
`animals-group-filter-widget/index.tsx`, `animal-stall-options-widget/index.tsx`
in the old repo. Findings:

1. **Frozen clock.** Each card's In/Out-of-Stall pill asks Prometheus for the
   state at `useState(DateTime.now())` — stamped once at mount — and re-asks
   that same instant every 10 min and on refocus. Tab screens stay mounted, so
   the pill can show this morning's answer all day. Same clock gates
   `isMetricsHidden`.
2. **~3 requests per horse before the picture.** Every card re-fetches
   `animal.detail` (already in the list response), `animalStall.list`, and a
   Prometheus query. First phone page ≈ 30 requests + 10 images.
3. **Silent states.** The pill vanishes for "no camera", "loading" and
   "confidence in the 0.3–0.7 grey band" alike.
4. **Hidden gesture.** Group edit/delete is a long-press on the tab.
5. Two "Add" buttons on tablet; a navigate-lock ref that only resets on refocus;
   the group filter subscribes to the whole auth store.

## 3. Decisions Inakshi has made (do not re-litigate)

| Topic | Decision |
|---|---|
| Card content | **Name + stall only.** No In/Out pill on the list (same call she made for Stalls). Status belongs to the horse's detail page. This retires the Prometheus-per-card query and the frozen-clock bug on this page. |
| Group editing | Group tabs stay as filter chips; a **visible ⋮ at the end of the row** opens a native menu: New Group / Edit Groups. No long-press. |
| Search | **Native header search bar** (pull-down, filters as you type, server-side `search` param). Show Me stays for global search. |
| Layout | **Horizontal cards** — thumbnail left, text right — 1 per row on phone, 2–3 columns on tablet. Camera stills are **4:3**. |
| Write side | Add horse / New group / Edit groups / Share / Edit / Remove are **visible but disabled** for now (read-only rule + control rule). |
| Only visible cards live | A still image per card, no video, no per-card queries. |

**Two open points — defaults to use unless Inakshi says otherwise when you
show her:** (a) tapping a card opens a *thin* horse-detail screen (photo,
name, stall) as the seed for the real details page — build it; (b) group
chips **scroll horizontally** (not wrap).

## 4. What already exists (uncommitted on `rnd` — keep or rewrite, your call)

Claude scaffolded these before handing over. They typecheck in isolation but
have not been run through `npm run check` or the simulator:

- `src/hooks/use-horses.ts` — `useHorses({groupId, search, pageSize})`:
  `animal.infiniteList` (paged, `ordering:'animal_name'`, server `search`)
  + `stall.list` + `animalStall.list` (same query keys as `useSnapshots`, so
  usually cached from For You), joined in memory into `HorseRow {id, name,
  stallName?, stallId?, imageUri?, blurhash?}`. Thumbnail = stall's latest
  frame when `stall_url && current_stall_monitor_deviceinstance`, else
  `animal_image.medium`, else undefined. Frame epoch = now−5 min quantised
  to 300 s (same as `useSnapshots`). Pull-to-refresh awaits all three
  refetches with its own `isRefreshing`. Exports pure `joinRow()` for tests.
- `src/hooks/use-horse-groups.ts` — `animalGroup.list({page_size:100,…})` →
  `HorseGroup {id, name}`.
- `src/components/horses/horse-card.tsx` — fixed-height card (`CARD_HEIGHT`),
  120×90 still, name/stall, ⋮ `Menu` with the four disabled actions.
- `src/components/horses/group-chips.tsx` — `ALL_HORSES='all'` + chips +
  trailing ⋮ `Menu` (New Group / Edit Groups, disabled).
- Icon names added to `src/components/ui/icon-names.ts` + both maps: `add`,
  `edit`, `share`, `remove`, `group` (and earlier today `rolling`,
  `peopleInteraction`, `entering`, `exiting`). Both platform maps are
  `Record<IconName,…>` so a missing glyph is a compile error.

**Known wart to fix while you're there:** `queries.animal.infiniteList` in
`src/services/query/animal-management/animal.ts` has a copy-pasted query key
prefix `['user-management','user','fetchInfinite',…]`. Change it to
`['animal-management','animal','fetchInfinite',…]`. It was ported verbatim
from the old repo; note it in the commit.

## 5. What to build

### Files
```
src/app/(tabs)/horses/_layout.tsx      Stack; headerShown, headerLargeTitle
src/app/(tabs)/horses/index.tsx        the screen
src/app/horse/[id].tsx                 thin detail scaffold (register in root Stack)
src/components/horses/horses-states.tsx   loading skeleton / error / empty variants
src/config/sample/horses-sample.ts     dev-only rows behind PREVIEWS.sampleHorsesData
src/config/previews.ts                 + sampleHorsesData flag (+ test line)
src/components/app-tabs.tsx            + Horses trigger between Home and Protos
tests (see §7)
```

### Screen (`(tabs)/horses/index.tsx`)
- Native large title "Horses" via the nested Stack. `headerSearchBarOptions`
  `{ placeholder: 'Search horses', hideWhenScrolling: false, onChangeText }`
  → debounce 300 ms → `useHorses({ search })`. FlatList gets
  `contentInsetAdjustmentBehavior="automatic"` so it sits under the large
  title. Verify on iOS 26 that the search bar collapses into the header the
  native way; on Android it should render as the Material search field.
- `GroupChips` under the header (sticky if cheap: `stickyHeaderIndices` on a
  ListHeaderComponent, else just fixed above the list). Selected group resets
  to `ALL_HORSES` when `organizationID` changes.
- `FlatList` of `HorseCard`, `getItemLayout` from `CARD_HEIGHT + gap`,
  `onEndReached` → `fetchNextPage` guard as in `review-history.tsx`,
  `RefreshControl` bound to `isRefreshing`/`refresh`. Tablet: `numColumns` 2
  (portrait) / 3 (landscape) — use `useWindowDimensions`, phone breakpoint
  < 768 pt. If you go multi-column, remember `key` must change with
  `numColumns` on FlatList.
- States, each visually distinct and using the tokens: loading (3 grey
  cards), error (+ Try again), empty ("No horses yet" + disabled Add Horse
  with the reason), group-empty ("No horses in <group>"), search-empty
  ("No horses match “…”").
- Sample data: `PREVIEWS.sampleHorsesData && !isLoading && !isError &&
  rows.length===0` → 6–8 invented horses with a mix of monitored / photo-only
  / no-image, shown with `SampleBanner` ("Sample horses — this organization
  has none."). Real rows always win.
- Card tap → `router.push('/horse/<id>')`. Pass what the list already knows
  via params (name, stall) so the thin screen renders instantly; it may also
  read `queries.animal.detail(id)` for the photo.

### Thin detail (`src/app/horse/[id].tsx`)
Native header with the horse's name; large photo (or placeholder), stall
line, and a footnote "More coming: status, behaviour, alerts, feeds." A
header comment says it is a seed for the real details work. Register it in
`src/app/_layout.tsx`'s Stack (`headerShown: true` for this one).

### Tab bar
`src/components/app-tabs.tsx`: add
```tsx
<NativeTabs.Trigger name="horses">
  <NativeTabs.Trigger.Label>Horses</NativeTabs.Trigger.Label>
  <NativeTabs.Trigger.Icon sf="figure.equestrian.sports" md="pets" />   // check the exact NativeTabs API for Android drawable prop in SDK 57
</NativeTabs.Trigger>
```
between Home and Protos. Confirm the icon prop shape against the SDK 57 docs
before assuming `md`.

## 6. Small UX improvements Inakshi accepted in principle
1. "No stall" in words on unassigned horses.
2. Group chips pinned under the header while scrolling (if cheap).
3. Search filters the same list in place, group filter still applied.
4. One Add entry point (the ⋮), not two on tablet.
5. Result wording in empty states ("No horses in Yearlings").

## 7. Tests to add
- `src/hooks/__tests__/use-horses.test.ts` — unit-test `joinRow`: monitored
  stall → frame URL + stall blurhash; unmonitored stall + photo → photo +
  animal blurhash; no stall no photo → `imageUri` undefined, `stallName`
  undefined; name falls back `animal_name → registered_name → 'Unnamed horse'`.
- `src/components/horses/__tests__/horse-card.test.tsx` — renders name +
  "No stall"; `accessibilityRole` is `button` only when `onPress` given;
  `accessibilityLabel` = "Name, Stall". Remember `await render(...)`.
- Extend `src/__tests__/no-dead-controls.test.ts` "never claims a control is a
  button unconditionally" file list with `components/horses/horse-card.tsx`
  and `group-chips.tsx` (chips DO have a handler, so they may use a
  conditional role or a literal — keep the sweep honest: if you use a literal
  role in `group-chips.tsx`, exclude it from that sweep with a comment).
- `src/config/__tests__/previews.test.ts` — add `sampleHorsesData` to the
  "true when opted in" assertions.
- `src/config/sample/__tests__/horses-sample.test.ts` — sample rows have
  unique ids and at least one of each thumbnail case.

## 8. Verification (do all of it, and report numbers, not adjectives)
1. `npm run check` green.
2. Simulator (Pro Max, Metro 8083): Horses tab appears; real horses load for
   the QA org (`qa_atlas@atlaslabs.com.au` is already signed in in Expo Go on
   that device — if not, ask Inakshi to type the password into the simulator;
   never handle it yourself); group chip filters; pull-down search filters as
   you type and clears; card tap opens the thin detail and Back returns;
   ⋮ menus open with dimmed items; pull-to-refresh spinner appears and stops
   only after data is back; loading/error/empty/search-empty reachable
   (search for "zzzz" for search-empty).
3. **Measure:** on a cold open of the tab, count requests with argent
   `view-network-logs` and report the number against the current app's ~31.
4. Screenshots light + dark (toggle with `xcrun simctl ui <udid> appearance dark`
   is acceptable for appearance only) to `outputs/horses/`, and send them to
   Inakshi.
5. Android: emulator `emulator-5554` cannot load Metro (preview build, no dev
   launcher — task #12). State this plainly in the report; do not claim
   Android verified.

## 9. Commit hygiene
- Work on `rnd`. Small commits, one concern each, gate green before each,
  stage by path. Commit message style in `git log` (imperative subject,
  body explains *why* and any deliberate departures from the current app).
- Do **not** promote to `main`; Inakshi promotes after sign-off.
- End of task: update `Horcery_App_Rewrite_Requirements.md` §4e with a
  "Horses (built 2026-08-…, awaiting sign-off)" entry describing what was
  built and the decisions above, and write
  `docs/dev-tickets/Horcery_Horses_Dev_Tickets.md` with
  three tickets for the *shipping* app: (a) frozen In/Out clock,
  (b) N-per-card fetching, (c) hidden long-press for group editing — same
  format as `Horcery_Review_History_Dev_Tickets.md`.

## 10. If something blocks you
- Native `headerSearchBarOptions` misbehaving under NativeTabs → fall back to
  a `TextInput` styled with tokens *inside the surface layer* only if you have
  tried the nested-Stack route first; say so in the report.
- Menu inside a Pressable swallowing taps on iOS → move the ⋮ outside the
  Pressable in a row wrapper; do not switch to a custom sheet.
- Anything that would require a write, a native build, or a credential:
  stop and tell Inakshi.
