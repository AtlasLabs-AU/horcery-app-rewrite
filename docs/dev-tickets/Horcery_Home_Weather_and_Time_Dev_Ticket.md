# Home weather and time can appear wrong beside stall readings

**Status:** Confirmed in shipping-app source; must be resolved in the rewrite

**Recorded:** 2026-09-04

**Shipping app reviewed:** `84-horcery-app-react-native`, production release
`2.2.16` at `88f1ba55f`

**Rewrite principle:** A horse owner must understand what a number represents
without being taught (Principle 5: user-friendly and intuitive).

## Customer evidence

Two reports showed the Home organization summary disagreeing with a stall or
horse surface:

- Ravello Farms: Home showed `9:22 pm`, `93°F`, `64%`; the stall surface showed
  `84°F` and another stall showed `83°F`. The customer reported that the
  horse-page values were accurate while Home time and temperature were not.
- Chickaat: at the same captured phone time of `2:39`, Home showed `75°F` and
  `71%`, while the Chicka stall card showed `82°F`.

The Chickaat capture does not reproduce a clock error because the phone and
Home both show `2:39`. It does reproduce the unexplained temperature mismatch.
Video is rendering in both reports, so this is separate from the audio/video
stream-selection defect.

## What production 2.2.16 does

The values that look comparable in the UI are produced by different systems:

| Surface | Displayed value | Production source | Refresh behaviour |
|---|---|---|---|
| Home organization summary | Time | `DateTime.now()` converted to `organization.timezone` | Ticks once per minute |
| Home organization summary | Temperature and humidity | A POST to `weather_data_management/api/weather_data_ingress/weather_data` using `locationData.data[0]` latitude and longitude | Fetched when the location-query result changes; no direct interval or focus refresh |
| Stall card | Temperature | The selected SMD Prometheus `external_temperature` metric | Queried at mount and on a 10-minute interval; pull-to-refresh advances the query timestamp |

Shipping source evidence:

- `packages/widgets/src/organization-details-widget/index.tsx:59-65` formats the
  organization clock.
- `packages/widgets/src/organization-details-widget/index.tsx:102-118` obtains
  organization locations and timezone.
- `packages/widgets/src/organization-details-widget/index.tsx:175-240` runs the
  clock and selects the first location for weather.
- `packages/services/src/api/weather-data-ingress/weather.ts:19-22` defines the
  weather endpoint.
- `packages/widgets/src/stall-card/index.tsx:206-217,295-314` queries and formats
  the SMD temperature.
- `packages/config/src/utils/prom-utils.ts:7-8` defines the stall-card metric as
  `external_temperature`.

There is no difference in these paths between `origin/release/2.2.16` and
`origin/development` as reviewed on 2026-09-04.

## Root cause

This is primarily an app data-contract and presentation defect, not a device
defect:

1. Home silently shows location-level outside weather while the stall card
   shows an individual SMD reading. Neither number is labelled clearly enough
   to explain the difference.
2. Home selects the first API location rather than an explicitly selected or
   deterministic location. For a multi-location organization, that can be the
   wrong place.
3. Weather is stored as component state after a mutation and has no explicit
   periodic refresh. Invalidating the location query does not directly express
   the requirement to refresh weather, so a long-running Home screen can retain
   an old result.
4. The Home clock depends on the organization timezone. A wrong backend
   timezone produces a wrong clock even when the phone clock is correct.

The screenshots alone cannot establish that `75°F` or `82°F` is physically
incorrect: outside weather and stall conditions can legitimately differ. The
bug is that production makes them look like the same measurement and does not
guarantee the intended location or freshness.

## Rewrite requirement

The rewrite must define one explicit Home header contract before wiring the
data. Recommended contract:

- Home shows **outside weather** for a named, explicitly selected organization
  location.
- The UI labels it as outside weather and exposes the location name; it must not
  imply that it is the selected horse's or stall's sensor reading.
- Stall and horse surfaces continue to show the assigned SMD reading and label
  it as stall temperature.
- Home weather is represented by a query with an intentional freshness window,
  refetch-on-focus, and direct pull-to-refresh support. It must not be hidden in
  component-local mutation state.
- Weather responses retain a source/update timestamp so stale data can be
  detected rather than silently presented as current.
- Organization time uses a validated IANA timezone. Missing or invalid timezone
  is a visible data state and is logged; silently using the phone timezone is
  not accepted for a stable in another region.

## Acceptance tests

1. **Source clarity:** Home says that its reading is outside/location weather;
   Stall says that its reading is the stall/SMD temperature.
2. **Location selection:** with two organization locations returned in either
   array order, Home consistently uses the configured location and names it.
3. **Freshness:** focusing Home and pulling to refresh both request fresh
   weather. A response older than the approved freshness limit is marked stale
   or unavailable.
4. **Clock:** organization timezone `America/New_York` displays New York time on
   a phone set to another timezone and continues ticking across a minute.
5. **Bad timezone:** missing and invalid organization timezones do not silently
   masquerade as correct organization time.
6. **Unit parity:** metric and imperial conversion is consistent on Home and
   stall surfaces without converting an already converted value twice.
7. **Device validation:** verify the final labels, refresh, and clock on one
   physical iPhone and one physical Android device.

## Product decision before implementation

Confirm that Home should retain **outside weather for the selected organization
location**. If Home is instead intended to show a stall sensor, the product must
define which stall is authoritative when an organization has several stalls.
Do not infer that selection from API array order.
