import { render } from '@testing-library/react-native';

import { SnapshotsCard, type Snapshot } from '@/components/for-you/snapshots-card';

/**
 * The one invariant that matters for slice 4a: **at most one video player.**
 *
 * The current app mounts a looping HLS player per snapshot tile and never
 * releases them, which is the single largest cost on For You. The rewrite made
 * the tiles stills; going live must not quietly reintroduce N players.
 *
 * `MediaTile` only constructs a player when it is given a `videoUri`, so the
 * structural guarantee is that the card passes `videoUri` to exactly one tile.
 * These tests read that guarantee at the source, because rendering the real
 * player needs a native runtime jest does not have (expo-video is stubbed in
 * jest.setup.js).
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const CARD = readFileSync(
  join(__dirname, '..', 'snapshots-card.tsx'),
  'utf8',
);

const snapshot = (id: string, overrides: Partial<Snapshot> = {}): Snapshot => ({
  id,
  name: `Stall ${id}`,
  posterUri: `https://example.test/${id}.jpeg`,
  liveUri: `https://example.test/${id}/manifest.m3u8`,
  hasAudio: true,
  ...overrides,
});

describe('SnapshotsCard — live mode', () => {
  it('gives videoUri to the snapped tile only', () => {
    // The guard against N players: `playing` requires isSnapped, and videoUri
    // is handed over only when playing.
    expect(CARD).toContain('live && isSnapped');
    expect(CARD).toMatch(/videoUri=\{playing \? snapshot\.liveUri : undefined\}/);
  });

  it('cannot stream while the screen says it is paused', async () => {
    // The current app's players keep decoding after you navigate away. The
    // screen owns focus and passes it down; the card must honour it.
    expect(CARD).toContain('!paused');

    const view = await render(
      <SnapshotsCard snapshots={[snapshot('a')]} paused />,
    );
    expect(view.queryByText('LIVE')).toBeNull();
  });

  it('falls back to the still when a stream fails, and says so', () => {
    expect(CARD).toContain('Live unavailable');
    expect(CARD).toContain('onPlaybackError');
  });

  it('renders as stills with no live controls engaged by default', async () => {
    const view = await render(
      <SnapshotsCard snapshots={[snapshot('a'), snapshot('b'), snapshot('c')]} />,
    );

    // Default state is the timelapse label, not LIVE.
    expect(view.getByText('▶ 10x')).toBeTruthy();
    expect(view.queryByText('LIVE')).toBeNull();
    expect(view.getByText('Last 2 hours at a glance')).toBeTruthy();
  });

  it('still renders when no stall can be streamed', async () => {
    // An organisation with no monitor must not crash or offer a live toggle
    // that cannot work — the menu row is disabled and says why.
    const view = await render(
      <SnapshotsCard
        snapshots={[snapshot('a', { liveUri: undefined, hasAudio: false })]}
      />,
    );

    expect(view.getByTestId('for-you-snapshot-a')).toBeTruthy();
    expect(CARD).toContain('No stall monitor in this organisation to stream from.');
  });
});
