# Horses — bug and improvement tickets for the shipping app

Found 2026-08-16 while characterising the Horses page in
`84-horcery-app-react-native`. References are to the local `main` checkout on
that date. These are independent of the rewrite and should be verified by the
mobile team before scheduling.

---

## HC84-XXXX · P1 · In/Out status asks Prometheus about a time frozen at card mount

**Where:** `packages/widgets/src/animal-stall-card/index.tsx:82, 138-148,
168-191`

**What happens:** Each card initializes `const [date] = useState(DateTime.now())`
once. Its Prometheus query refetches every ten minutes, but the `time` parameter
continues to use that original `date`. A long-lived Horses screen therefore
keeps asking for the state at the time the card mounted rather than the current
state. Pull-to-refresh updates the list's `queryRefreshedAt`, but does not update
the card's frozen `date`.

**Fix:** Make “now” part of the refetch operation (or move current status to a
bounded server endpoint). Characterisation test: advance fake time, trigger the
ten-minute refetch, and assert the second request's `time` is newer. Until then,
do not present the pill as live status.

---

## HC84-XXXX · P1 performance · Horses list creates two API queries per visible horse

**Where:** `packages/widgets/src/animal-list-widget/index.tsx:160-205`;
`packages/widgets/src/animal-stall-card/index.tsx:84-94, 138-148`

**What happens:** The page-level request already returns each horse's list
record. Every mounted card then performs its own animal-stall request and its
own Prometheus request. The first phone page is therefore one horse-list read,
one group read, and up to two additional reads per visible horse, before image
requests. Tablet pages mount up to 30 horses. This scales linearly with card
count and amplifies latency and failure states on barn Wi-Fi.

**Fix:** Batch/join assignments and stall display data once per organization;
fetch live status only where it is genuinely needed, ideally through one
bounded observation endpoint. Measure cold and warm request counts, time to
first usable list, JS frame rate, and memory on a real mid-range Android with
30+ horses.

---

## HC84-XXXX · P2 · Group editing is hidden behind an undiscoverable long-press

**Where:** `packages/widgets/src/animals-group-filter-widget/index.tsx:67-93,
113-135`

**What happens:** The visible plus button opens add options. Editing an existing
group is available only through `onGroupLongPress`; there is no label, menu, or
hint that teaches the gesture. Users can reasonably conclude group editing is
not available.

**Fix:** Add a visible overflow action for New Group / Edit Groups (and preserve
permission-aware wording). Keep long-press only as an optional shortcut. Add an
accessibility test proving the action is discoverable without a gesture.

---

## HC84-XXXX · P2 maintenance · Share is dead code in the horse options sheet

**Where:** `packages/widgets/src/animal-stall-options-widget/index.tsx:162-198,
215-223`

**What happens:** The options array constructs a Share action and keeps its
handler in dependencies, then `items.filter((item) => item.id !== 'share')`
removes it unconditionally immediately before render. This is not a customer
regression today, but it makes parity reviews incorrectly report Share as a
shipping capability and leaves unreachable behavior to drift.

**Fix:** Delete the dead action and handler, or place it behind a named,
tested capability/permission gate if Share is planned. Do not infer feature
parity from definitions that never reach the rendered list.

---

## Rewrite decision recorded separately

The rewrite keeps the useful behavior—sorted/paginated horses, group filters,
responsive columns, still-image fallback, details navigation, refresh and
explicit states—but replaces per-card fetching with complete organization
joins. It deliberately omits the list status pill and does not add Share.
Record/manual event entry (including Stall Cleaning and similar event types)
has been removed from product scope and is unrelated to this page.
