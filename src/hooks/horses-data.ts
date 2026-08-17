import type { IAnimal } from '@acme/services/api/animal-management/animal';
import type { IStall } from '@acme/services/api/stall-monitor-management/stall';
import { getStallMonitorThumbnailURLs } from '@acme/config/utils/stall-monitor-video-helper';

/** One row of the Horses list, already joined and ready to draw. */
export interface HorseRow {
  id: string;
  name: string;
  stallName?: string;
  stallId?: string;
  imageUri?: string;
  blurhash?: string;
  imageKind: 'camera' | 'profile' | 'none';
}

export const horseSelectionKey = (id: string) => ['horses', 'selection', id] as const;

/** Pure join kept outside the hook so its behavior is cheap to characterize. */
export function joinHorseRow(
  animal: IAnimal,
  stall: IStall | undefined,
  epoch: number,
  frameBuster?: number,
): HorseRow {
  const photo =
    animal.animal_image && 'medium' in animal.animal_image
      ? animal.animal_image.medium
      : undefined;
  const monitored = !!stall?.stall_url && !!stall.current_stall_monitor_deviceinstance;
  const [frame] = monitored ? getStallMonitorThumbnailURLs(stall.stall_url, epoch) : [undefined];
  const frameVersionSuffix = frameBuster ? `?v=${frameBuster}` : '';

  return {
    id: animal.id ?? '',
    name: animal.animal_name || animal.registered_name || 'Unnamed horse',
    stallName: stall?.name,
    stallId: stall?.id,
    imageUri: frame ? `${frame}${frameVersionSuffix}` : photo,
    blurhash: (frame ? stall?.stall_blur_hash : animal.animal_blur_hash) ?? undefined,
    imageKind: frame ? 'camera' : photo ? 'profile' : 'none',
  };
}
