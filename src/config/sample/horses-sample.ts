import type { HorseRow } from '@/hooks/use-horses';
import type { HorseGroup } from '@/hooks/use-horse-groups';

export interface SampleHorse extends HorseRow {
  groupIds: string[];
}

export const SAMPLE_HORSE_GROUPS: HorseGroup[] = [
  { id: 'sample-mares', name: 'Mares' },
  { id: 'sample-yearlings', name: 'Yearlings' },
  { id: 'sample-training', name: 'In Training' },
];

/**
 * Development-only review data. Blurhashes exercise camera/profile fallbacks
 * without introducing remote assets; the final row exercises no-image UI.
 */
export const SAMPLE_HORSES: SampleHorse[] = [
  {
    id: 'sample-storm',
    name: 'Storm',
    stallName: 'Stall 1',
    stallId: 'sample-stall-1',
    blurhash: 'LKO2?U%2Tw=w]~RBVZRi};RPxuwH',
    imageKind: 'camera',
    hasCamera: true,
    groupIds: ['sample-training'],
  },
  {
    id: 'sample-willow',
    name: 'Willow',
    stallName: 'Stall 5',
    stallId: 'sample-stall-5',
    blurhash: 'LEHV6nWB2yk8pyo0adR*.7kCMdnj',
    imageKind: 'camera',
    hasCamera: true,
    groupIds: ['sample-mares'],
  },
  {
    id: 'sample-juniper',
    name: 'Juniper',
    blurhash: 'L6PZfSi_.AyE_3t7t7R**0o#DgR4',
    imageKind: 'profile',
    hasCamera: false,
    groupIds: ['sample-mares'],
  },
  {
    id: 'sample-comet',
    name: 'Comet',
    stallName: 'Stall 8',
    stallId: 'sample-stall-8',
    blurhash: 'LGF5]+Yk^6#M@-5c,1J5@[or[Q6.',
    imageKind: 'camera',
    hasCamera: true,
    groupIds: ['sample-yearlings', 'sample-training'],
  },
  {
    id: 'sample-clover',
    name: 'Clover',
    blurhash: 'L9ASgx00~q00M{IUxv%M00%MRjxu',
    imageKind: 'profile',
    hasCamera: false,
    groupIds: ['sample-yearlings'],
  },
  {
    id: 'sample-biscuit',
    name: 'Biscuit',
    stallName: 'Stall 3',
    stallId: 'sample-stall-3',
    imageKind: 'none',
    hasCamera: false,
    groupIds: [],
  },
];

export function filterSampleHorses(groupId?: string, search?: string): SampleHorse[] {
  const needle = search?.trim().toLocaleLowerCase();
  return SAMPLE_HORSES.filter((horse) => {
    const inGroup = !groupId || horse.groupIds.includes(groupId);
    const matchesSearch =
      !needle ||
      horse.name.toLocaleLowerCase().includes(needle) ||
      horse.stallName?.toLocaleLowerCase().includes(needle);
    return inGroup && !!matchesSearch;
  });
}
