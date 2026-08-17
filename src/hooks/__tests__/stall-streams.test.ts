import { DateTime } from 'luxon';

import type { IStall } from '@acme/services/api/stall-monitor-management/stall';
import {
  RECORDED_WINDOW_MINUTES,
  stallLiveStreamUrl,
  stallRecordedStreamUrl,
} from '@/hooks/horses-data';

const AT = DateTime.fromISO('2026-08-17T14:30:00.000Z');

const stall = (overrides: Partial<IStall> = {}) =>
  ({
    name: 'Stall 4',
    stall_url: 'https://monitor.example.test/live/sm-93/dash/manifest.mpd',
    current_stall_monitor_deviceinstance: { device_id: 'SM-93' },
    ...overrides,
  }) as IStall;

describe('stall stream URLs', () => {
  it('builds a live manifest from the monitor id in the stall URL', () => {
    const url = stallLiveStreamUrl(stall());

    expect(url).toContain('/live_stream/');
    expect(url).toContain('/93/');
    expect(url).toContain('manifest.m3u8');
  });

  it('builds an hour of recorded footage starting at the cursor', () => {
    const url = stallRecordedStreamUrl(stall(), AT);

    const start = AT.toUnixInteger();
    const end = AT.plus({ minutes: RECORDED_WINDOW_MINUTES }).toUnixInteger();
    // The endpoint takes even second boundaries; the helper rounds down.
    expect(url).toContain(`/${start - (start % 2)}/`);
    expect(url).toContain(`/${end - (end % 2)}/`);
    expect(url).not.toContain('/live_stream/');
  });

  it('moves the recorded window when the cursor moves', () => {
    const early = stallRecordedStreamUrl(stall(), AT);
    const later = stallRecordedStreamUrl(stall(), AT.plus({ hours: 2 }));

    expect(early).not.toBe(later);
  });

  it('streams audio only when the stall says so, for both kinds', () => {
    const silent = stall({ UserMetaData: { audio_enable: false } as never });
    const audible = stall({ UserMetaData: { audio_enable: true } as never });

    expect(stallLiveStreamUrl(silent)).toContain('/video/');
    expect(stallLiveStreamUrl(audible)).toContain('/audio_video/');
    expect(stallRecordedStreamUrl(silent, AT)).toContain('/video/');
    expect(stallRecordedStreamUrl(audible, AT)).toContain('/audio_video/');
  });

  it('offers nothing rather than a URL built on a bad monitor id', () => {
    // Real organisations carry stalls with a null `stall_url`, and others whose
    // URL has no `sm-<number>` segment. `getStallIdFromURL` returns NaN for
    // those; a manifest built on NaN is a request that can only 404.
    const noUrl = stall({ stall_url: undefined as never });
    const noMonitorSegment = stall({ stall_url: 'https://example.test/live/abc/dash/x.mpd' });

    expect(stallLiveStreamUrl(noUrl)).toBeUndefined();
    expect(stallRecordedStreamUrl(noUrl, AT)).toBeUndefined();
    expect(stallLiveStreamUrl(noMonitorSegment)).toBeUndefined();
    expect(stallRecordedStreamUrl(noMonitorSegment, AT)).toBeUndefined();
    expect(stallLiveStreamUrl(undefined)).toBeUndefined();
    expect(stallRecordedStreamUrl(undefined, AT)).toBeUndefined();
  });
});
