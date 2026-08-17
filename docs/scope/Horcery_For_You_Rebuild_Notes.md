# For You page — rebuild notes

Working record for the For You rebuild in `horcery-app-rewrite`, branch
`feature/for-you`. Started 2026-08-13. Plan: `~/.claude/plans/quizzical-churning-rossum.md`.

---

## Bugs found in the current app

Each was confirmed by reading the code, not inferred. **These affect customers
today** and are worth tickets for the dev team regardless of the rewrite.

| # | Bug | Where | Effect |
|---|-----|-------|--------|
| B1 | Pull-to-refresh spinner never appears | `packages/app/src/screens/for-you/index.tsx:91-114` | `isRefreshing` compares a full query key against a `._def` prefix with `JSON.stringify` equality. A full key always carries extra segments, so the result is permanently `false`. The refresh *works* (invalidateQueries does prefix matching) but shows no feedback — so the page feels unresponsive and users pull again. **Best candidate for the "app feels slow" complaint.** |
| B2 | Three requests fire with an empty organization ID | same file, `:133-186` | The `location` query has `enabled: !!organizationID`; the three `deviceInstance` queries beside it do not, and pass `organization_id: ''`. Wasted requests on every cold open, cached under a meaningless key. |
| B3 | A refresh call that does nothing | same file, `:9`, `:38`, `:48`, `:66` | `AlertSummaryWidget` is imported and given a ref that `useFocusEffect` and `onRefresh` both call — but the widget is never rendered, so the ref is always null and both calls are silent no-ops. `WeatherCardCarousel` is imported and never used. |
| B4 | Nothing is ever cached | `packages/services/src/index.ts:70` | The global QueryClient sets only `retry` and `networkMode`. With no `staleTime`, every query is stale on arrival — leaving the tab and returning refetches the entire screen. |
| B5 | `retry: 2` on every read | same | Three attempts against a dead endpoint. Strong candidate for the never-resolving skeletons seen on device. |
| B6 | Remote Config fetch timeout never applied | `packages/config/src/firebase-remote-config/index.ts` | Sets `fetchTimeMillis`, which is not a real setting. The intended 30s timeout silently never applied; fetches use the 60s default. Correct key is `fetchTimeoutMillis`. |

## Structural performance problems

- **P1 — every snapshot tile is a live video player.** Each card mounts an
  `expo-video` player with `loop = true` streaming an HLS timelapse
  (`animal-snapshot-widget/snapshot-preview.tsx` → `full-screen-view-widget`).
  N visible tiles decode N streams. This dominates the page's cost.
- **P2 — everything mounts at once.** A plain `ScrollView`, so all six widgets
  (charts included, far below the fold) mount and fetch on open.
- **P3 — ~25-30 requests on a cold open**, several dependent. The behavior
  tracker alone runs 10 queries, three gated on earlier results.

## Correction to an earlier claim

I previously told Inakshi the app's ECharts are WebView-based. They are not:
`packages/charts/src/index.tsx` uses `@wuba/react-native-echarts` with the
**SVG renderer**. A WebView-based library (`react-native-echarts-pro`) exists in
the tree but is used only by an unrelated water-chart widget. This makes the
parked charting decision less urgent than implied.

---

## What the rewrite does differently

| Current app | Rewrite |
|---|---|
| Segmented toggles drawn with gluestack Buttons | SwiftUI `Picker`, `pickerStyle('segmented')` |
| ⋮ menus open `react-native-actions-sheet` | SwiftUI `Menu` — native dropdown, tap to open |
| Purple links are styled Buttons | `@expo/ui` `Button variant="text"` |
| Icons are bundled SVG assets | `expo-symbols` (SF Symbols) |
| Snapshot tile = looping video player | `expo-image` still + blurhash; player only for the tile in view |
| All widgets mount on open | `<Deferred>` mounts a section as it nears the viewport |
| `staleTime` 0, `retry` 2 | `staleTime` 60s, `gcTime` 15min, `retry` 1 on reads |
| Three device queries, ungated | One query, gated on organization |

## Environment and safety

- The `development` environment's `EXPO_PUBLIC_BASE_SERVICE_URL` is
  `https://api.magichoof.com/` — **the production API**. The "Mobile Dev
  Testing" org data is live production data.
- `src/config/env/index.ts` in the rewrite **throws** on a missing endpoint
  instead of defaulting to production, unlike the current app.
- `GenericService.assertWriteAllowed()` **blocks every POST/PUT/PATCH/DELETE**
  while pointed at the production API. Override is an explicit env var. This is
  why the ported session hook drops the current app's preference-PATCH.
- `GoogleService-Info.plist` is gitignored. The current app leaked its Firebase
  config into git history (`92cda318e`, removed in `fb17a7d5d`, still
  recoverable).

## Build setup (hard-won)

EAS project `@horcery_dev/horcery-app-rewrite`, id
`c0785b7c-bde3-42b6-a41b-4f93b2e3b4a8`. Profile `simulator`, dev client.

1. **EAS only uploads git-tracked files.** The gitignored plist must be an EAS
   **file secret** (`GOOGLE_SERVICE_INFO_PLIST`), read by `app.config.ts` via
   `process.env`. A static `googleServicesFile` path in app.json fails with
   `EAS_BUILD_MISSING_GOOGLE_SERVICES_PLIST_ERROR`.
2. **`channel` in eas.json requires expo-updates.** Remove it until installed.
3. **`@react-native-firebase` v26 + Expo SDK 57 fails at pod install** with
   `[react-native-firebase] SPM + static linkage is not supported`. SDK 57
   builds iOS with Swift Package Manager; static linkage is the default. Trying
   `expo-build-properties` `useFrameworks: 'dynamic'`. **Unresolved as of this
   writing** — if dynamic also fails, the fallback is Firebase Identity Toolkit
   REST for auth (the plist carries the API key), which needs no native module
   and would run in Expo Go.
4. npm installs hung repeatedly against the registry (ETIMEDOUT, 40 min at 0%
   CPU). `--no-audit --no-fund --fetch-retries=8` got them through.

## State

- Presentational layer: **done**, verified on device against reference
  screenshots (`outputs/fyp-reference/`).
- Data layer: **ported and typechecking**, wired to the screen.
- Dev-client build: **blocked** on item 3 above.
- Not yet done: snapshots wired to real stalls, before/after performance
  measurements, behaviour verification of the real controls.
