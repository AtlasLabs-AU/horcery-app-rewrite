/**
 * Development-only production monitors used by the Live monitors prototype.
 *
 * These URLs contain no credentials and are reachable only from the dev-only
 * preview route. Keeping them together makes removing the temporary adapter a
 * single-file change when the observation API is available.
 */
export const LIVE_PREVIEW_MONITORS = [
  {
    id: 'sm-1275',
    label: 'SM-1275',
    prometheusBaseUrl: 'https://n1.dat.use.wg0.horcery.com/sm-1275',
    videoManifestUrl:
      'https://api.horcery.com/stream_management/live_stream/video/1275/6/manifest.m3u8?quality=low',
  },
  {
    id: 'sm-1272',
    label: 'SM-1272',
    prometheusBaseUrl: 'https://n1.dat.use.wg0.horcery.com/sm-1272',
    videoManifestUrl:
      'https://api.horcery.com/stream_management/live_stream/video/1272/6/manifest.m3u8?quality=low',
  },
  {
    id: 'sm-1212',
    label: 'SM-1212',
    prometheusBaseUrl: 'https://n1.dat.use.wg0.horcery.com/sm-1212',
    videoManifestUrl:
      'https://api.horcery.com/stream_management/live_stream/video/1212/6/manifest.m3u8?quality=low',
  },
] as const;

export type LivePreviewMonitor = (typeof LIVE_PREVIEW_MONITORS)[number];

/** The preview bypasses an organisation record, so this assumption is visible on screen. */
export const PREVIEW_ZONE = 'America/New_York';
