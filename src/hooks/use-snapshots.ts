import { useQuery } from '@tanstack/react-query';
import { DateTime } from 'luxon';
import { useCallback, useMemo } from 'react';

import { queries } from '@acme/services';
import { useAuthStore } from '@acme/stores/authorization-states';

import type { Snapshot } from '@/components/for-you/snapshots-card';
import { buildSnapshots } from '@/hooks/snapshots-data';

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
 * The frame epoch is rounded to a five-minute slice, which is both what the endpoint
 * expects and what makes the URL stable enough for the image cache to work.
 */
export function useSnapshots() {
  const organizationID = useAuthStore((s) => s.organizationID);
  const enabled = !!organizationID;

  const stallsQuery = useQuery({
    ...queries.stall.listComplete({
      organization_id: organizationID ?? '',
      deleted_at__isnull: true,
      page_size: 100,
      ordering: '-created_at',
    }, [
      // Match the shipping app: Snapshots is a camera surface, not an empty
      // tile for every physical stall in the organisation.
      { key: 'current_stall_monitor_deviceinstance__isnull', value: 'false' },
    ]),
    enabled,
  });

  const linksQuery = useQuery({
    ...queries.animalStall.listComplete({
      organization_id: organizationID ?? '',
      deleted_at__isnull: true,
      page_size: 100,
    }),
    enabled,
  });

  const animalsQuery = useQuery({
    ...queries.animal.listComplete({
      organization_id: organizationID ?? '',
      deleted_at__isnull: true,
      page_size: 100,
    }),
    enabled,
  });

  const snapshots = useMemo<Snapshot[]>(() => {
    // The API filter is the efficient path; this local predicate is the
    // correctness boundary if an older backend ignores that filter.
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

    return buildSnapshots(
      stallsQuery.data ?? [],
      linksQuery.data ?? [],
      animalsQuery.data ?? [],
      epoch,
    );
  }, [stallsQuery.data, linksQuery.data, animalsQuery.data]);

  const refetch = useCallback(
    () => Promise.all([stallsQuery.refetch(), linksQuery.refetch(), animalsQuery.refetch()]),
    [stallsQuery, linksQuery, animalsQuery],
  );

  return {
    snapshots,
    isLoading:
      enabled &&
      (stallsQuery.isPending || linksQuery.isPending || animalsQuery.isPending),
    isError: stallsQuery.isError || linksQuery.isError || animalsQuery.isError,
    refetch,
  };
}
