import type { ClockTime } from '@/domain/alerts/types';

export interface TimePickerProps {
  value: ClockTime;
  onChange: (next: ClockTime) => void;
  disabled?: boolean;
  /** Spoken name — e.g. "Start time". */
  accessibilityLabel: string;
  testID?: string;
}

/** Height of the control on both platforms (compact pill). */
export const TIME_PICKER_HEIGHT = 36;

/** A Date carrying the clock time on an arbitrary fixed day. */
export function clockToDate(t: ClockTime): Date {
  const d = new Date(2026, 0, 1, t.hour, t.minute, 0, 0);
  return d;
}

export function dateToClock(d: Date): ClockTime {
  return { hour: d.getHours(), minute: d.getMinutes() };
}

export function formatClock(t: ClockTime): string {
  const h12 = t.hour % 12 === 0 ? 12 : t.hour % 12;
  const suffix = t.hour < 12 ? 'AM' : 'PM';
  return `${h12}:${String(t.minute).padStart(2, '0')} ${suffix}`;
}
