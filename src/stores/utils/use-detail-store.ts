import { useAnimalDetailStore } from '../animal-detail-states';
import { useStallDetailStore } from '../stall-detail-states';

export type Relevancy = 'animal' | 'stall';

/**
 * Returns the appropriate detail store based on relevancy.
 * Both stores share the same structure via AnimalStallDetailSlice and PlayHeadStateSlice.
 */
export const useDetailStore = (relevancy: Relevancy) => {
  return relevancy === 'animal' ? useAnimalDetailStore : useStallDetailStore;
};
