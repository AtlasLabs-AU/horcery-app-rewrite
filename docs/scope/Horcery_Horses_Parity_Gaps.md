# Horses page — parity gaps against the shipping app

**Date:** 2026-08-17 · Compared the rebuilt page on `rnd` against the shipping
app's Horses (Animals) screen, source-by-source.

**Sources compared**
- Shipping: `packages/app/src/screens/animals/index.tsx`,
  `packages/widgets/src/animal-list-widget`, `animal-stall-card`,
  `list-item-thumbnail`, `animals-group-filter-widget`,
  `animal-stall-options-widget`, `navigation-bar`, `show-me-widget`,
  `config/hooks/use-role-permissions.ts`, and the horse detail route
  `apps/expo/src/app/(details)/animals/[id]/(details)/`.
- Rewrite: `src/app/(tabs)/horses/*`, `src/components/horses/*`,
  `src/hooks/use-horses.ts`, `use-horse-groups.ts`, `horses-data.ts`.

---

## A. Deliberately deferred — decisions already taken, listed so nothing is lost

| # | Feature | Note |
|---|---|---|
| A1 | **In Stall / Out of Stall pill** | Removed by Inakshi's decision (2026-08-16): the list shows name + stall; live status belongs to the horse's detail page. Also retires the shipping app's frozen-clock bug. |
| A2 | **All write actions** — Add Horse, New Group, Edit Group (rename/delete), Edit Horse, Remove Horse, Manage Groups | Present but disabled, each with a reason. The rewrite is read-only against production by design. |
| A3 | **Favourite star** on the card | Exists in the shipping source but is rendered with a `hidden` class pending backend. Not a live capability; do not carry it over until the backend does. |
| A4 | **Share** in the ⋮ menu | Defined in the shipping options array and then filtered out before render. Correctly not carried over. |

## B. Genuinely missing — need a decision or a ticket

| # | Feature | What the shipping app does | Impact |
|---|---|---|---|
| **B1** | **Role-based permissions** | `usePermissions(memberType)` gates every action. ADMIN gets create/edit/delete; EDITOR create/edit; **VIEWER, GUEST and RESTRICTED get none**. The ⋮ labels change accordingly — "Edit" becomes "View", "Manage Groups" becomes "View Groups" — and a denied action raises a toast. | **The largest gap.** The rewrite has no concept of member type on this page. Every user sees the same menu. Harmless while the actions are disabled; a correctness and trust problem the moment the write side lands. |
| **B2** | **Horse detail page** | Three tabs — **Summary, Events, Alerts** — reached by tapping a card. | The rewrite navigates to a deliberately thin placeholder. This is the single largest missing surface, and it is where A1's in-stall status is supposed to live. |
| **B3** | **Global "Show Me" search** | The header magnifier opened a cross-entity search over **horses, stalls and behaviours** at once. | The rewrite's header search filters *horses on this page only*. Better for finding a horse; the cross-entity entry point is gone. Decide whether Show Me returns elsewhere, or is retired. |
| **B4** | **Prefetch on tap** | Before navigating, the card prefetches the horse's detail and its stall assignment, so the detail screen is populated on arrival. | Without it the detail page will flash a loading state once it is real. Cheap to add; add it with B2. |
| **B5** | **Live thumbnail refresh** | The camera frame carries a short cache life and is re-fetched on pull-to-refresh (`queryRefreshedAt`), so pulling gives you a current frame. | The rewrite quantises frames to a 5-minute slice for cache stability, so a pull does not visibly refresh the picture. Deliberate trade-off, but it means "pull to refresh" does not refresh the one thing that looks live. Worth revisiting. |
| **B6** | **Auto-select a newly created group** | After creating a group, the filter jumps to it. | Depends on the write side; capture it with the New Group work so the behaviour is not lost. |
| **B7** | **Double-navigation guard** | A ref blocks a second push until the screen regains focus. | The rewrite can double-push on a fast double tap. Small, real, one-line. |

## C. Where the rewrite is ahead — record so it is not "fixed" back

| # | Improvement |
|---|---|
| C1 | **Stall name on the card.** The shipping card shows only the horse's name; the rewrite shows which stall it is in, and says "No stall" in words when it is not assigned. |
| C2 | **~4 requests per page instead of ~31.** The shipping card fires its own animal detail, stall link and Prometheus query per visible horse. |
| C3 | **Search filters in place**, server-side, and combines with the group filter. |
| C4 | **Group editing is a visible ⋮**, not an undiscoverable long-press. |
| C5 | **Five distinct states**: loading, error+retry, empty, group-empty, search-empty. The shipping app has one empty state. |
| C6 | **Groups follow pagination.** The shipping app requests `page_size: 100` and silently drops any beyond that. |
| C7 | **No frozen clock** — the whole class of bug is designed out rather than patched. |

---

---

# Second pass — 2026-08-17 (Inakshi: "add new icon and bottom sheet… have you
# accounted for error screens?")

The first pass compared the **list**. It did not compare the chrome around the
list, the sheets the controls open, or the states the screen can be in. Sources
re-read for this pass: `add-new-options`, `animal-stall-options-widget`,
`edit-group-widget`, `navigation-bar`, `list-empty`, `list-error`,
`list-loading`, `filter-skeleton`, `no-internet-widget`, `list-item-thumbnail`,
`components/core/toast`, and the animal-detail `_layout.tsx`.

## D. Entry points and sheets

| # | Feature | Shipping app | Rewrite | Call |
|---|---|---|---|---|
| **D1** | **"+" add-new button** | A round **+** sits at the **head of the group row**, before "All Horses". It opens a bottom sheet with two rows — **Horse** ("Add a new horse to your organization") and **Horse Group** ("Group horses for easy navigation"). | The same two actions live in the **trailing ⋮**, disabled. | Function is covered; the position and the dedicated + are not. **Your call** — keep one ⋮, or restore a leading +. |
| **D2** | **Name-a-group sheet** (`group-name-sheet`) | A second sheet with a text field, opened after choosing "Horse Group". | Absent. | Write side. Note it so the two-step flow isn't forgotten. |
| **D3** | **Add / edit horse form sheet** (`animal-form-sheet`) | A full form — name, registered name, DOB, gender, breed, height/length/heart-girth/weight with metric/imperial, emergency contact, photo. Opens in **view mode** for users without edit rights. | Absent. | Write side, and it is much larger than "Add Horse" implies. |
| **D4** | **Manage-groups sheet** | Assign a horse to groups, with a read-only variant. | ⋮ row is disabled. | Write side. |
| **D5** | **Remove confirmation sheet** | Destructive actions route through a named confirm sheet before deleting. | Absent — no confirm pattern exists in the rewrite at all. | Establish the pattern **before** the first destructive action ships. |
| **D6** | **Header chrome** | The old header carries search, a notifications bell, a sidebar/menu button, and on tablet a second **Add**. | The native large-title header carries **search only**. | Bell and sidebar are app-wide, not Horses — but nothing in the rewrite hosts them yet. |

## E. States — the real gap

| # | State | Shipping app | Rewrite | Severity |
|---|---|---|---|---|
| **E1** | **Offline** | `ListEmpty` short-circuits to a dedicated **No Internet** screen: own illustration, a retry that refuses to act while still offline, and **auto-recovery** — when the connection returns it navigates back by itself. | **Nothing.** Offline falls into the generic "Couldn't load horses". `onlineManager` is wired up in `services/index.ts` but no screen reads it. | **High.** Barn Wi-Fi is the normal failure, and today it is indistinguishable from a server fault. |
| **E2** | **Contact Support** | Every error state offers it — opens a prefilled support email naming the page. | Absent. | Medium. The only escape hatch when "Try again" keeps failing. |
| **E3** | **Empty-state action** | A primary **Add Horse** button. | Text only: "Adding horses will be available when the write side is ready." | Correct while read-only; must become the button when writes land. |
| **E4** | **Illustrated states** | Per-page artwork: `empty-horses`, `error-horses`, `error-no-internet`, `empty-search`. | A small glyph in a grey circle. | Deliberate under the editorial palette — **recorded so it is not "fixed" back**. The artwork exists and is unused; decide once. |
| **E5** | **Group-chip skeleton** | Four grey pills while groups load. | Chips pop in — only "All Horses" until they arrive. | Low, but visible. |
| **E6** | **Load-more skeleton** | A card skeleton at the foot while paging. | A spinner. | Low. |
| **E7** | **Toast layer** | `useToaster` — permission denials, mutation failures and successes all surface as non-blocking toasts. | **No toast anywhere in the rewrite.** | **High before the write side.** There is currently no way to report a failure that isn't a whole-screen error. |
| **E8** | **Thumbnail unavailable** | The thumbnail distinguishes **Feed Unavailable** from **No Profile Image** and can render a custom node for each. | One silent horse glyph for both. | Medium — "no camera" and "no photo" are different facts. |
| **E9** | **Crash safety** | — | No error boundary and no `+not-found` route. A render error white-screens the tab. | Medium; cheap to fix. |
| **E10** | **`hide_metrics_till`** | A stall setting that suppresses metrics until a date; the card honours it. | Not carried. | Doesn't bite on the list (no pill) — **will** bite on the detail page. |
| **E11** | **Refresh scope** | Pull also invalidates the Prometheus and group queries. | Horses + groups only. | Fine today; revisit when metrics return. |

## F. Horse detail — the shipping page is far larger than three tabs

Beyond Summary / Events / Alerts, the old detail route carries a **video player
with a scrubber**, a **date toolbar** with a minimum date from the horse's
creation, a **statistics card**, a **settings cog** to a full animal-settings
page, tab icons, a content skeleton, and back-target awareness (returning to
Show Me rather than Horses when it came from there). It also pauses the video
on blur.

The rewrite's detail is a labelled scaffold. That is the right size for now —
recorded here so the remaining work is not mistaken for polish.

---

## Recommended order

Updated after the second pass. B2, B4 and B7 were built by Codex on 2026-08-17
and are no longer open.

1. **E1 offline** and **E9 crash safety** — both are "the app fails badly in a
   situation that happens weekly", and both are small. Do them together.
2. **E7 toast layer** — infrastructure, and a hard prerequisite for the write
   side, D3–D5 and B1.
3. **E8 thumbnail unavailable**, **E5/E6 skeletons**, **E2 contact support** —
   a tidy-up pass over the states.
4. **B1 permissions** — before any write action ships, and it changes what the
   ⋮ renders, so it wants doing before those menus become live.
5. **D1** — your call on the + versus the ⋮; cheap either way.
6. **E4** — decide once whether the illustrated states come back, and record it.
7. **B5** — decide whether pull-to-refresh should force a fresh frame.
8. **B3** — a product decision about Show Me, not a Horses decision.
9. **A2 / B6 / D2–D5 / E3** — the write side, as a slice of its own.
10. **F** — horse detail proper (player, date toolbar, statistics, settings).
