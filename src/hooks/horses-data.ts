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
  hasCamera: boolean;
}

export const horseSelectionKey = (id: string) => ['horses', 'selection', id] as const;

/**
 * Is a stall monitor fitted at all?
 *
 * The single definition of "this stall has a camera". It used to be spelled
 * out separately in `joinHorseRow` and in `useHorseStatus`, against two
 * different fields — so a stall with a monitor but no `prometheus_url` had the
 * list tile claiming a camera and the status strip beneath it claiming none,
 * on the same screen (review, 2026-08-17).
 *
 * The two *capabilities* below genuinely differ and keep their own predicates;
 * what must not differ is whether a monitor exists.
 */
export function stallHasMonitor(stall: IStall | undefined): boolean {
  return !!stall?.current_stall_monitor_deviceinstance;
}

/** A monitor whose still frames we can build a URL for. */
export function stallHasFrame(stall: IStall | undefined): boolean {
  return stallHasMonitor(stall) && !!stall?.stall_url;
}

/** A monitor whose metrics we can query. Absent `prometheus_url` is not "no camera". */
export function stallHasMetrics(stall: IStall | undefined): boolean {
  return stallHasMonitor(stall) && !!stall?.prometheus_url;
}

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
  const monitored = stallHasFrame(stall);
  const [frame] = monitored && stall ? getStallMonitorThumbnailURLs(stall.stall_url, epoch) : [undefined];
  const frameVersionSuffix = frameBuster ? `?v=${frameBuster}` : '';

  return {
    id: animal.id ?? '',
    name: animal.animal_name || animal.registered_name || 'Unnamed horse',
    stallName: stall?.name,
    stallId: stall?.id,
    imageUri: frame ? `${frame}${frameVersionSuffix}` : photo,
    blurhash: (frame ? stall?.stall_blur_hash : animal.animal_blur_hash) ?? undefined,
    imageKind: frame ? 'camera' : photo ? 'profile' : 'none',
    hasCamera: monitored,
  };
}
