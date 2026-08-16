interface HourTick {
  position: number;
  label: string;
}

/** Format an axis position without rounding a fractional-hour tick into a lie. */
export function clockLabelAtPosition(value: number): string {
  const totalMinutes = Math.round(Math.min(1, Math.max(0, value)) * 24 * 60);
  const hour24 = Math.floor(totalMinutes / 60) % 24;
  const minutes = totalMinutes % 60;
  const hour12 = hour24 % 12 || 12;
  const suffix = hour24 < 12 ? 'AM' : 'PM';
  return minutes === 0
    ? `${hour12} ${suffix}`
    : `${hour12}:${String(minutes).padStart(2, '0')} ${suffix}`;
}

/**
 * Select readable clock labels for the visible domain while retaining both
 * visible endpoints. Both finalists use this function so overlap handling
 * cannot silently change the information being compared.
 */
export function visibleHourTicks(
  ticks: readonly HourTick[],
  visible: readonly [number, number],
  width: number,
): readonly HourTick[] {
  const [d0, d1] = visible;
  const spanHours = Math.max(1, (d1 - d0) * 24);
  const maxLabels = Math.max(2, Math.floor((width - 60) / 44));
  const step = [1, 2, 3, 4, 6, 8, 12].find((hours) => spanHours / hours <= maxLabels) ?? 12;
  const inView = ticks.filter((tick) => tick.position >= d0 - 1e-9 && tick.position <= d1 + 1e-9);
  const selected = inView.filter((_, index) => index % step === 0);
  const last = inView.at(-1);
  if (last && selected.at(-1)?.position !== last.position) return [...selected, last];
  return selected;
}
