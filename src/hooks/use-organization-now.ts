import { DateTime } from 'luxon';
import { useEffect, useState } from 'react';

/**
 * "Now", in the organization's timezone, ticking on each minute boundary.
 *
 * Two bugs share this root, both found in review (requirements §6b items 9
 * and the alert-status follow-up):
 *
 * 1. The organization clock was `useMemo`'d and froze — a barn's local time
 *    stopped at whatever it was when the page mounted.
 * 2. "Today" for the alert count was computed once, in the **phone's**
 *    timezone. An app left open across midnight kept counting yesterday's
 *    alerts, and a manager in a different zone from the barn saw a day
 *    window shifted by hours. Requirements §6c already decided day
 *    boundaries follow the organization, not the device.
 *
 * Aligning to the next minute (rather than ticking every 60s from mount)
 * keeps the displayed minute honest and makes the day boundary land within a
 * second of true midnight — the same approach the current app uses for its
 * clock, extended to cover the date too.
 *
 * @param timezone IANA zone from the organization. Falls back to the device
 * zone when the organization has none, which is the current app's behaviour.
 */
export function useOrganizationNow(timezone?: string | null): DateTime {
  const [now, setNow] = useState(() =>
    timezone ? DateTime.now().setZone(timezone) : DateTime.now(),
  );

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;

    const tick = () => {
      const current = timezone ? DateTime.now().setZone(timezone) : DateTime.now();
      setNow(current);
      // Schedule the next fire on the following minute boundary, re-measured
      // each time so drift cannot accumulate and DST shifts are absorbed.
      const msToNextMinute = 60_000 - (current.second * 1000 + current.millisecond);
      timer = setTimeout(tick, Math.max(1_000, msToNextMinute));
    };

    tick();
    return () => clearTimeout(timer);
  }, [timezone]);

  return now;
}
