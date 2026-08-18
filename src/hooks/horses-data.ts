import type { DateTime } from 'luxon';

import type { IAnimal } from '@acme/services/api/animal-management/animal';
import type { IStall } from '@acme/services/api/stall-monitor-management/stall';
import { LIVE_STREAM_OFFSET } from '@acme/config/constants/date-constants';
import {
  getStallIdFromURL,
  getStallMonitorLiveStreamOffsetURL,
  getStallMonitorThumbnailURLs,
  getStallMonitorVideoURL,
} from '@acme/config/utils/stall-monitor-video-helper';

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

/**
 * The stall's live HLS manifest, or undefined when it has nothing to stream.
 *
 * One definition, used by both For You's Snapshots and the horse's own page —
 * the same lesson as `stallHasMonitor` above: two callers deriving "can this
 * stream" separately is how one surface offers live video and the other
 * silently does not.
 *
 * `getStallIdFromURL` returns NaN when the URL carries no `sm-<number>`
 * segment (several stalls in a real organisation have a null `stall_url`
 * entirely), and `NaN > 0` is false — so those correctly get nothing rather
 * than a manifest URL built on a bad id.
 *
 * Audio follows the stall's own setting, as the current app does.
 */
export function stallLiveStreamUrl(stall: IStall | undefined): string | undefined {
  const monitorId = streamableMonitorId(stall);
  if (monitorId === undefined) return undefined;

  return getStallMonitorLiveStreamOffsetURL({
    stallId: monitorId,
    offset: LIVE_STREAM_OFFSET,
    type: stall?.UserMetaData?.audio_enable ? 'audio_video' : 'video',
    quality: 'low',
  });
}

/**
 * The still frame nearest `at`, or undefined when there is no monitor.
 *
 * The horse page needs this because its hero still is otherwise always the
 * LATEST frame, whatever day the date bar is on — so on "Sun 16 Aug" you saw a
 * picture from a minute ago with nothing saying so, and only discovered the
 * mismatch by pressing play (caught on device, 2026-08-18).
 */
export function stallFrameUrl(stall: IStall | undefined, at: number): string | undefined {
  if (!stallHasFrame(stall) || !stall) return undefined;
  const [frame] = getStallMonitorThumbnailURLs(stall.stall_url, at);
  return frame;
}

/** How much footage one tap of recorded playback covers. Matches the current app. */
export const RECORDED_WINDOW_MINUTES = 60;

/**
 * An hour of recorded footage starting at `from`.
 *
 * The same monitor and audio rules as live; only the endpoint and the window
 * differ. `from` is the play-head cursor, so what you watch is the hour
 * beginning at the moment the date bar is pointing at.
 */
export function stallRecordedStreamUrl(
  stall: IStall | undefined,
  from: DateTime,
): string | undefined {
  const monitorId = streamableMonitorId(stall);
  if (monitorId === undefined) return undefined;

  return getStallMonitorVideoURL({
    stallId: monitorId,
    startTime: from.toUnixInteger(),
    endTime: from.plus({ minutes: RECORDED_WINDOW_MINUTES }).toUnixInteger(),
    type: stall?.UserMetaData?.audio_enable ? 'audio_video' : 'video',
    quality: 'low',
  });
}

/**
 * The monitor id a stream can be built on, or undefined.
 *
 * `getStallIdFromURL` returns NaN when the URL carries no `sm-<number>`
 * segment (several stalls in a real organisation have a null `stall_url`
 * entirely), and `NaN > 0` is false — so those correctly get nothing rather
 * than a manifest URL built on a bad id.
 */
function streamableMonitorId(stall: IStall | undefined): number | undefined {
  if (!stall?.stall_url) return undefined;
  const monitorId = getStallIdFromURL(stall.stall_url);
  return monitorId > 0 ? monitorId : undefined;
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
