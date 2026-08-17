import {
  getStallIdFromURL,
  getStallMonitorThumbnailURLs,
} from '@/config/utils/stall-monitor-video-helper';

/**
 * Seed test 1 — pure data transformation.
 *
 * SCOPE, precisely: the thumbnail URL construction and 10-second frame maths.
 * Nothing here touches the §6b finding 6 data-loss bugs — page truncation,
 * omitted paginated stalls, incomplete refresh queries. Those are covered by
 * `media-carousel.test.tsx` (truncation) and remain open for the rest (see the
 * note there). An earlier version of this comment claimed otherwise, which is
 * worse than no comment: it invites the next person to believe a failure mode
 * is already guarded (review, 2026-08-15).
 *
 * What this does protect is real: a change to the sampling maths that drops a
 * frame or misplaces a boundary fails here rather than silently on a stall page.
 */

// Real shape: the stall id is the LAST path segment before /dash, and everything
// before /dash is the frame host. Verified against the parser, not assumed.
const PROXY = 'https://monitor.example.test/live/sm-4821';
const DASH_URL = `${PROXY}/dash/stream.mpd`;

describe('getStallMonitorThumbnailURLs', () => {
  it('returns a single frame, floored to the 10s boundary, when no end time is given', () => {
    expect(getStallMonitorThumbnailURLs(DASH_URL, 1_700_000_007)).toEqual([
      `${PROXY}/frames/1700000000.jpeg`,
    ]);
  });

  it('strips everything from /dash onward to build the frame host', () => {
    const [url] = getStallMonitorThumbnailURLs(DASH_URL, 1_700_000_000);
    expect(url).toContain(`${PROXY}/frames/`);
    expect(url).not.toContain('/dash');
  });

  it('returns every 10s frame in range when no count is requested', () => {
    // 1_700_000_000 → 1_700_000_030 is 4 frames inclusive (0, 10, 20, 30).
    const urls = getStallMonitorThumbnailURLs(
      DASH_URL,
      1_700_000_000,
      1_700_000_030,
    );
    expect(urls).toHaveLength(4);
    expect(urls[0]).toContain('1700000000.jpeg');
    expect(urls[urls.length - 1]).toContain('1700000030.jpeg');
  });

  it('samples evenly and always includes both endpoints when a count is given', () => {
    const urls = getStallMonitorThumbnailURLs(
      DASH_URL,
      1_700_000_000,
      1_700_000_100,
      3,
    );
    expect(urls).toHaveLength(3);
    // First and last must be the true range boundaries — a sampled strip that
    // silently stops short is the Snapshots data-loss failure mode.
    expect(urls[0]).toContain('1700000000.jpeg');
    expect(urls[2]).toContain('1700000100.jpeg');
  });

  it('returns exactly the start frame when a single frame is requested', () => {
    expect(
      getStallMonitorThumbnailURLs(DASH_URL, 1_700_000_005, 1_700_000_100, 1),
    ).toEqual([`${PROXY}/frames/1700000000.jpeg`]);
  });

  it('ignores a count that is not smaller than the available frames', () => {
    const all = getStallMonitorThumbnailURLs(
      DASH_URL,
      1_700_000_000,
      1_700_000_030,
    );
    const withLargeCount = getStallMonitorThumbnailURLs(
      DASH_URL,
      1_700_000_000,
      1_700_000_030,
      99,
    );
    expect(withLargeCount).toEqual(all);
  });
});

describe('getStallIdFromURL', () => {
  it('extracts the numeric stall id from a monitor URL', () => {
    expect(getStallIdFromURL(DASH_URL)).toBe(4821);
  });

  it('returns NaN rather than a wrong id when the URL has no stall segment', () => {
    // Documents current behaviour: the `?? -1` fallback never fires because
    // Number(undefined) is NaN, not null/undefined. Callers must use
    // Number.isNaN, not `=== -1`.
    expect(Number.isNaN(getStallIdFromURL('https://example.test/no-stall'))).toBe(
      true,
    );
  });
});
