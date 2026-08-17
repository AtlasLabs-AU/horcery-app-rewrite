import { useQuery } from '@tanstack/react-query';
import { DateTime } from 'luxon';
import { useMemo } from 'react';

import { LIVE_STREAM_OFFSET } from '@acme/config/constants/date-constants';
import {
  getStallIdFromURL,
  getStallMonitorLiveStreamOffsetURL,
  getStallMonitorThumbnailURLs,
} from '@acme/config/utils/stall-monitor-video-helper';
import { queries } from '@acme/services';
import { useAuthStore } from '@acme/stores/authorization-states';

import type { Snapshot } from '@/components/for-you/snapshots-card';

/**
 * Frame URLs are quantised to this many seconds. Long enough that repeated
 * refetches reuse the same cached image, short enough that the tiles still
 * track "the last few minutes".
 */
const FRAME_SLICE_SECONDS = 300;

/**
 * Snapshot tiles for the For You carousel.
 *
 * **Where this differs from the current app.** There, each tile is its own
 * subtree that runs its own `animal.detail` query and mounts a looping
 * `expo-video` HLS player. Ten stalls means ten players and ten extra
 * requests. Here:
 *
 * - the animal names arrive with **one** batched `animalStall` list request
 *   plus **one** `animal` list request, joined in memory;
 * - each tile is a still JPEG from the stall monitor's own frame endpoint
 *   (`…/frames/<epoch>.jpeg`, the same source the current app already uses for
 *   thumbnails elsewhere), so the page costs images rather than video streams.
 *
 * The frame epoch is rounded to a 10s slice, which is both what the endpoint
 * expects and what makes the URL stable enough for the image cache to work.
 */
export function useSnapshots() {
  const organizationID = useAuthStore((s) => s.organizationID);
  const enabled = !!organizationID;

  const { data: stallData, isLoading } = useQuery({
    ...queries.stall.list({
      organization_id: organizationID ?? '',
      deleted_at__isnull: true,
    }),
    enabled,
  });

  const { data: animalStallData } = useQuery({
    ...queries.animalStall.list({
      organization_id: organizationID ?? '',
      deleted_at__isnull: true,
    }),
    enabled,
  });

  const { data: animalData } = useQuery({
    ...queries.animal.list({
      organization_id: organizationID ?? '',
      deleted_at__isnull: true,
    }),
    enabled,
  });

  const snapshots = useMemo<Snapshot[]>(() => {
    const stalls = stallData?.data ?? [];
    if (!stalls.length) return [];

    const animals = animalData?.data ?? [];
    const animalsById = new Map(animals.map((animal) => [animal.id, animal]));
    const animalByStallId = new Map<string, (typeof animals)[number]>();

    for (const link of animalStallData?.data ?? []) {
      if (link.deleted_at) continue;
      // `stall` is either the id or the expanded object depending on the query.
      const stallId = typeof link.stall === 'string' ? link.stall : link.stall?.id;
      const animal = animalsById.get(link.animal_id);
      if (animal && stallId) animalByStallId.set(stallId, animal);
    }

    // One frame, five minutes back: the monitor writes slices continuously and
    // the most recent one is not always flushed yet.
    //
    // Quantised to FRAME_SLICE_SECONDS so the URL is stable across recomputes.
    // Reading the clock directly produced a different `…/frames/<epoch>.jpeg`
    // for every tile on every refetch, which is a cache key expo-image has
    // never seen — so a pull-to-refresh re-downloaded every visible frame and
    // flashed each blurhash placeholder. Now the URL only moves when the slice
    // does, and identical refetches hit the cache.
    const epoch =
      Math.floor(
        DateTime.now().minus({ minutes: 5 }).toSeconds() / FRAME_SLICE_SECONDS,
      ) * FRAME_SLICE_SECONDS;

    return stalls.map((stall) => {
      const animal = animalByStallId.get(stall.id);
      const [posterUri] = stall.stall_url
        ? getStallMonitorThumbnailURLs(stall.stall_url, epoch)
        : [undefined];

      /**
       * The live HLS manifest, built only for a stall that actually has a
       * monitor. `getStallIdFromURL` returns -1 when it cannot parse one, and
       * a URL built on -1 is a request that can only 404 — so it is left
       * undefined and the tile stays a still with nothing to switch to.
       *
       * Audio follows the stall's own setting: `audio_video` streams the barn,
       * `video` does not. The current app makes the same choice from the same
       * field.
       */
      const monitorId = stall.stall_url ? getStallIdFromURL(stall.stall_url) : -1;
      const liveUri =
        monitorId > 0
          ? getStallMonitorLiveStreamOffsetURL({
              stallId: monitorId,
              offset: LIVE_STREAM_OFFSET,
              type: stall.UserMetaData?.audio_enable ? 'audio_video' : 'video',
              quality: 'low',
            })
          : undefined;

      return {
        id: stall.id,
        name: animal?.animal_name ?? stall.name ?? 'No Stall Assigned',
        posterUri,
        liveUri,
        hasAudio: !!stall.UserMetaData?.audio_enable,
        blurhash: stall.stall_blur_hash ?? undefined,
        avatarUri:
          animal?.animal_image && 'small' in animal.animal_image
            ? animal.animal_image.small
            : undefined,
      };
    });
  }, [stallData, animalStallData, animalData]);

  return { snapshots, isLoading };
}
