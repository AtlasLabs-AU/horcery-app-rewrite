export const HOUR_MS = 60 * 60 * 1000;
export const SIX_HOURS_IN_MS = 6 * HOUR_MS;
export const DAY_IN_MS = 24 * 60 * 60 * 1000;

export const DAILY_LABELS = ['12 AM', '6 AM', '12 PM', '6 PM', '12 AM'];
export const WEEKLY_LABELS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

/** 0-based weekday index (Monday = 0, Sunday = 6) by lowercase day name. */
export const WEEKDAY_INDEX_BY_NAME: Record<string, number> = {
  monday: 0,
  tuesday: 1,
  wednesday: 2,
  thursday: 3,
  friday: 4,
  saturday: 5,
  sunday: 6,
};

export const SEGMENT_SIZE = 2;
export const LIVE_STREAM_OFFSET = 3;
export const BUFFER_OFFSET_SECONDS = SEGMENT_SIZE * LIVE_STREAM_OFFSET;
export const EXTRA_LOADING_SECONDS = 10 + LIVE_STREAM_OFFSET;
