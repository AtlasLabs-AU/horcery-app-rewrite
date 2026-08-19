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

function maxAxisLabels(width: number): number {
  return Math.max(2, Math.floor((width - 60) / 44));
}

function hourStep(spanHours: number, maxLabels: number): number {
  return [1, 2, 3, 4, 6, 8, 12].find((hours) => spanHours / hours <= maxLabels) ?? 12;
}

const HOUR_MS = 60 * 60 * 1000;

/** Select deterministic time-axis values while retaining both exact endpoints. */
export function timeAxisTickValues(
  domain: readonly [number, number],
  width: number,
): number[] {
  const [start, end] = domain;
  if (!(end > start)) return [start];
  const stepMs = hourStep((end - start) / HOUR_MS, maxAxisLabels(width)) * HOUR_MS;
  const firstAligned = Math.ceil(start / stepMs) * stepMs;
  const ticks = [start];
  for (let value = firstAligned; value < end; value += stepMs) {
    if (value > start) ticks.push(value);
  }
  if (ticks.at(-1) !== end) ticks.push(end);
  return ticks;
}

/** Pick an ECharts value-axis interval that fits the current viewport. */
export function axisTickInterval(
  visible: readonly [number, number],
  width: number,
): number {
  const spanHours = Math.max(1, (visible[1] - visible[0]) * 24);
  return hourStep(spanHours, maxAxisLabels(width)) / 24;
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
  const maxLabels = maxAxisLabels(width);
  const step = hourStep(spanHours, maxLabels);
  const inView = ticks.filter((tick) => tick.position >= d0 - 1e-9 && tick.position <= d1 + 1e-9);
  const selected = inView.filter((_, index) => index % step === 0);
  const last = inView.at(-1);
  if (last && selected.at(-1)?.position !== last.position) return [...selected, last];
  return selected;
}
