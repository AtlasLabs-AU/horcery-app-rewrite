export const REMOUNT_CHECKPOINTS = [10, 25, 50] as const;

export type RemountSequence = {
  count: number;
  phase: 'running' | 'checkpoint';
};

export function startRemountSequence(): RemountSequence {
  return { count: 0, phase: 'running' };
}

export function advanceRemountSequence(sequence: RemountSequence): RemountSequence {
  if (sequence.phase === 'checkpoint') {
    if (sequence.count === REMOUNT_CHECKPOINTS.at(-1)) return sequence;
    return { count: sequence.count, phase: 'running' };
  }

  const count = sequence.count + 1;
  return {
    count,
    phase: REMOUNT_CHECKPOINTS.includes(count as (typeof REMOUNT_CHECKPOINTS)[number])
      ? 'checkpoint'
      : 'running',
  };
}
