import { useCallback, useEffect, useState } from 'react';

/**
 * A seconds countdown that does not drift.
 *
 * The obvious version — `setInterval` decrementing a value, in an effect keyed
 * to that value — tears the timer down and recreates it on every tick, so the
 * countdown runs progressively long. Both resend timers had it (review,
 * 2026-08-15).
 *
 * This keeps ONE interval per run and derives the remaining seconds from a
 * deadline, so a slow JS frame cannot make it lose time. The clock is read
 * only inside effects and callbacks — never during render, which the React
 * Compiler rejects as impure (and which would give a different answer on
 * every re-render).
 */
export function useCountdown(initialSeconds: number) {
  // `id` makes each run distinct, so restarting to the same number of seconds
  // still re-triggers the effect.
  const [run, setRun] = useState({ seconds: initialSeconds, id: 0 });
  const [remaining, setRemaining] = useState(initialSeconds);

  useEffect(() => {
    if (run.seconds <= 0) return;

    // The starting value is set by whoever started the run (below), not here:
    // setState synchronously inside an effect triggers a cascading render.
    const deadline = Date.now() + run.seconds * 1000;

    const timer = setInterval(() => {
      const left = Math.max(0, Math.ceil((deadline - Date.now()) / 1000));
      setRemaining(left);
      if (left <= 0) clearInterval(timer);
    }, 250);

    return () => clearInterval(timer);
  }, [run]);

  const restart = useCallback(
    (seconds: number = initialSeconds) => {
      setRemaining(seconds);
      setRun((previous) => ({ seconds, id: previous.id + 1 }));
    },
    [initialSeconds],
  );

  const clear = useCallback(() => {
    setRemaining(0);
    setRun((previous) => ({ seconds: 0, id: previous.id + 1 }));
  }, []);

  return { remaining, restart, clear };
}
