import { useSyncExternalStore } from 'react';

import type { Selection } from '@/domain/alerts/types';

/**
 * Hand-off between the targets picker ROUTE and the Configure screen.
 *
 * The picker is a form-sheet route (it needs a native header search bar,
 * which a bottom-sheet component cannot have — architecture §14 #1). A route
 * cannot return a value, so: Configure mints a `requestId`, pushes the picker
 * with it, and subscribes here; the picker writes the result under that id
 * and pops; Configure reads it once and clears it. A module-level Map, not a
 * global store — nothing leaks between requests or screens.
 */

export type TargetKind = 'horses' | 'stalls' | 'members';

export interface TargetsResult {
  kind: TargetKind;
  selection: Selection;
}

const results = new Map<string, TargetsResult>();
const listeners = new Set<() => void>();

function emit() {
  for (const l of listeners) l();
}

export function setTargetsResult(requestId: string, result: TargetsResult) {
  results.set(requestId, result);
  emit();
}

/** Read-and-clear. Returns undefined when nothing has been delivered. */
export function takeTargetsResult(requestId: string): TargetsResult | undefined {
  const r = results.get(requestId);
  if (r) {
    results.delete(requestId);
    emit();
  }
  return r;
}

function subscribe(l: () => void) {
  listeners.add(l);
  return () => {
    listeners.delete(l);
  };
}

/** True while a result is waiting for this request id. */
export function useTargetsResultPending(requestId: string): boolean {
  return useSyncExternalStore(
    subscribe,
    () => results.has(requestId),
    () => false,
  );
}

let counter = 0;
export function newRequestId(prefix: string): string {
  counter += 1;
  return `${prefix}-${counter}`;
}
