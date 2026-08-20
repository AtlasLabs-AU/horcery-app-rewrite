import { getStallMonitorThumbnailURLs } from '@acme/config/utils/stall-monitor-video-helper';
import type { IAnimal } from '@acme/services/api/animal-management/animal';
import type { IAnimalStall } from '@acme/services/api/stall-monitor-management/animal-stall';
import type { IStall } from '@acme/services/api/stall-monitor-management/stall';
import type { Snapshot } from '@/components/for-you/snapshots-card';
import { stallHasMonitor, stallLiveStreamUrl } from '@/hooks/horses-data';

/** Pure join so pagination/filter regressions can be characterized cheaply. */
export function buildSnapshots(
  stalls: IStall[],
  links: IAnimalStall[],
  animals: IAnimal[],
  epoch: number,
): Snapshot[] {
  const monitoredStalls = stalls.filter(stallHasMonitor);
  if (!monitoredStalls.length) return [];

  const animalsById = new Map(animals.map((animal) => [animal.id, animal]));
  const animalByStallId = new Map<string, IAnimal>();

  for (const link of links) {
    if (link.deleted_at) continue;
    const stallId = typeof link.stall === 'string' ? link.stall : link.stall?.id;
    const animal = animalsById.get(link.animal_id);
    if (animal && stallId) animalByStallId.set(stallId, animal);
  }

  return monitoredStalls.map((stall) => {
    const animal = animalByStallId.get(stall.id);
    const [posterUri] = stall.stall_url
      ? getStallMonitorThumbnailURLs(stall.stall_url, epoch)
      : [undefined];

    return {
      id: stall.id,
      name: animal?.animal_name ?? stall.name ?? 'No Stall Assigned',
      posterUri,
      liveUri: stallLiveStreamUrl(stall),
      hasAudio: !!stall.UserMetaData?.audio_enable,
      blurhash: stall.stall_blur_hash ?? undefined,
      avatarUri:
        animal?.animal_image && 'small' in animal.animal_image
          ? animal.animal_image.small
          : undefined,
    };
  });
}
