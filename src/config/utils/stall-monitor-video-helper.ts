import { DateTime } from 'luxon';

import { config } from '../env';
import { debug } from './logger';

/**
 * Generates the URL for fetching the stall monitor video stream for a specific stall
 * within a given time range.
 *
 * @param stallId - The unique identifier of the stall.
 * @param startTime - The start time of the video stream in epoch timestamp format.
 * @param endTime - The end time of the video stream in epoch timestamp format.
 * @param type - The type of video stream, either 'video' or 'timelapse'.
 * @param quality - The quality of the stream, either 'high' or 'low'.
 * @returns The complete URL to access the stall monitor video stream.
 */
export const getStallMonitorVideoURL = ({
  stallId,
  startTime,
  endTime,
  type = 'audio_video',
  quality,
}: {
  stallId: number;
  startTime: number;
  endTime: number;
  type?: 'video' | 'audio_video' | 'timelapse';
  quality?: 'high' | 'low';
}) => {
  const baseURL = config.web.BASE_SERVICE_URL;
  const serviceURL = `stream_management/${type}/${stallId}/${startTime - (startTime % 2)}/${endTime - (endTime % 2)}/manifest.m3u8`;
  const qualityQuery = quality ? `?quality=${quality}` : '';
  return `${baseURL}${serviceURL}${qualityQuery}`;
};

/**
 * Generates the URL for fetching the live feed of the stall monitor video stream.
 * The live feed starts from 20 seconds before the current time.
 *
 * @param stallId - The unique identifier of the stall.
 * @param quality - The quality of the stream, either 'high' or 'low'.
 * @returns The complete URL to access the live stall monitor video stream.
 */
export const getStallMonitorLiveFeedURL = ({
  stallId,
  type = 'audio_video',
  quality,
}: {
  stallId: number;
  type?: 'video' | 'audio_video' | 'timelapse';
  quality?: 'high' | 'low';
}) => {
  const startTime = Math.floor(
    // DateTime.now().minus({ seconds: 20 }).toSeconds(),
    DateTime.now().minus({ seconds: 4 }).toSeconds(),
  );
  const roundedStartTime = startTime - (startTime % 2);
  const baseURL = config.web.BASE_SERVICE_URL;
  const serviceURL = `stream_management/live/${type}/${stallId}/${roundedStartTime}/manifest.m3u8`;
  const qualityQuery = quality ? `?quality=${quality}` : '?quality=low';
  // debug(`${baseURL}${serviceURL}${qualityQuery}`);
  return `${baseURL}${serviceURL}${qualityQuery}`;
};

export const getStallMonitorLiveStreamOffsetURL = ({
  stallId,
  type = 'audio_video',
  quality,
  offset,
}: {
  stallId: number;
  type?: 'video' | 'audio_video' | 'timelapse';
  quality?: 'high' | 'low';
  offset: number;
}) => {
  const baseURL = config.web.BASE_SERVICE_URL;
  const serviceURL = `stream_management/live_stream/${type}/${stallId}/${offset}/manifest.m3u8`;
  const qualityQuery = quality ? `?quality=${quality}` : '?quality=low';
  // debug(`${baseURL}${serviceURL}${qualityQuery}`);
  return `${baseURL}${serviceURL}${qualityQuery}`;
};

/**
 * Extracts the stall ID from a given URL.
 *
 * @param url - The URL string from which to extract the stall ID.
 * @returns The extracted stall ID as a number, or -1 if not found.
 */
export const getStallIdFromURL = (url?: string) => {
  const stallId = url?.split('/dash')[0]?.split('/').pop()?.split('sm-')[1];
  const StallIDNumber = Number(stallId);
  return StallIDNumber ?? -1;
};

export const getClipVideoURL = (
  clipId?: string,
  action?: string,
  type: 'video' | 'audio_video' = 'audio_video',
) => {
  if (!clipId) return undefined;

  const baseURL = config.web.BASE_SERVICE_URL;
  const actionPath = action ? `${action}/` : '';
  const clipVideoPath = `hls_clip_management/api/clip_handler/templates/${type}/${actionPath}manifest.m3u8`;
  const queryParam = `clip_id=${clipId}`;

  return `${baseURL}${clipVideoPath}?${queryParam}`;
};

export const getStallMonitorThumbnailURLs = (
  url: string,
  start_epoch: number,
  end_epoch?: number,
  count?: number,
): string[] => {
  const proxyURL = url.split('/dash')[0];

  if (end_epoch === undefined) {
    const rounded = Math.floor(start_epoch / 10) * 10;
    return [`${proxyURL}/frames/${rounded}.jpeg`];
  }

  const roundedStart = Math.floor(start_epoch / 10) * 10;
  const roundedEnd = Math.floor(end_epoch / 10) * 10;
  const totalFrames = Math.floor((roundedEnd - roundedStart) / 10) + 1;

  if (count !== undefined && count > 0 && count < totalFrames) {
    if (count === 1) {
      return [`${proxyURL}/frames/${roundedStart}.jpeg`];
    }

    const step = (roundedEnd - roundedStart) / (count - 1);
    const urls: string[] = [];

    for (let i = 0; i < count; i++) {
      let epochFloat = roundedStart + step * i;
      let epochSlice = Math.floor(epochFloat / 10) * 10;

      if (i === count - 1) epochSlice = roundedEnd;

      urls.push(`${proxyURL}/frames/${epochSlice}.jpeg`);
    }

    return urls;
  }

  const urls: string[] = [];
  for (let t = roundedStart; t <= roundedEnd; t += 10) {
    urls.push(`${proxyURL}/frames/${t}.jpeg`);
  }
  return urls;
};
