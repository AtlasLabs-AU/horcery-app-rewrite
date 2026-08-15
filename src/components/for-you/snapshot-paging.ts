/**
 * Paging for the Snapshots carousel.
 *
 * Requirements §6b finding 6: the card rendered `snapshots.slice(0, columns)`
 * while drawing a row of page dots underneath. On a two-column phone in a barn
 * with eight stalls, six stalls were simply not on the screen — and the dots
 * said there were four pages, so the UI actively asserted the existence of
 * content it never rendered. Silent omission is the worst failure mode a
 * monitoring product has: nothing looks wrong.
 *
 * This is deliberately a pure function rather than logic inside the component.
 * The property that matters — no stall is ever dropped — is a statement about
 * data, and it can be tested exhaustively here in microseconds, at every list
 * length and column count, which a render test could never do.
 *
 * SCOPE: this fixes truncation only. The rest of finding 6 — swipe to change
 * page, foreground refresh, fullscreen, live/timelapse, playback preference,
 * and the paginated `list` calls that drop stalls in large organizations —
 * belongs to the Snapshots vertical slice and is NOT addressed here.
 */

/** At least one column, always a whole number: `columns` comes from a width. */
const safeColumns = (columns: number) =>
  Number.isFinite(columns) ? Math.max(1, Math.floor(columns)) : 1;

/** How many pages `items` occupies. Always at least 1, so the UI has a page. */
export function snapshotPageCount(length: number, columns: number): number {
  return Math.max(1, Math.ceil(Math.max(0, length) / safeColumns(columns)));
}

/**
 * Splits `items` into pages of `columns`. Every item appears exactly once, in
 * order; the last page carries the remainder rather than being padded or
 * dropped.
 */
export function snapshotPages<T>(items: T[], columns: number): T[][] {
  const size = safeColumns(columns);
  const pages: T[][] = [];

  for (let index = 0; index < items.length; index += size) {
    pages.push(items.slice(index, index + size));
  }

  return pages.length > 0 ? pages : [[]];
}

/**
 * The items on `page`. Out-of-range page indices clamp instead of returning an
 * empty row: a rotation that reduces the page count must not blank the card.
 */
export function snapshotPage<T>(items: T[], columns: number, page: number): T[] {
  const pages = snapshotPages(items, columns);
  const index = Number.isFinite(page) ? Math.floor(page) : 0;

  return pages[Math.min(Math.max(index, 0), pages.length - 1)] ?? [];
}
