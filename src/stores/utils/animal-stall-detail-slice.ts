import type { IAnimal } from '@acme/services/api/animal-management/animal';
import type { IStall } from '@acme/services/api/stall-monitor-management/stall';

export interface AnimalStallDetailSlice {
  id: string | null;
  setId: (id: string) => void;
  animal: IAnimal | null;
  setAnimal: (animal: IAnimal | null) => void;
  stall: IStall | null;
  setStall: (s: IStall | null) => void;
  hasNoStall: boolean;
  hasNoAnimal: boolean;
  isAnimalResolved: boolean;
  isStallResolved: boolean;
  setAnimalResolved: (resolved: boolean) => void;
  setStallResolved: (resolved: boolean) => void;
}

export const createAnimalStallDetailSlice = (
  set: (
    fn: (state: AnimalStallDetailSlice) => Partial<AnimalStallDetailSlice>,
  ) => void,
): AnimalStallDetailSlice => ({
  id: null,
  setId: (id: string) => set(() => ({ id })),
  animal: null,
  setAnimal: (animal: IAnimal | null) => {
    set((state) => {
      return {
        animal,
        hasNoAnimal: animal === null,
        isAnimalResolved: true,
      };
    });
  },
  stall: null,
  setStall: (stall: IStall | null) => {
    set(() => {
      return {
        stall:
          stall && !stall.current_stall_monitor_deviceinstance
            ? { ...stall, prometheus_url: '' }
            : stall,
        hasNoStall: stall === null,
        isStallResolved: true,
      };
    });
  },
  hasNoStall: true,
  hasNoAnimal: true,
  isAnimalResolved: false,
  isStallResolved: false,
  setAnimalResolved: (resolved: boolean) =>
    set(() => ({ isAnimalResolved: resolved })),
  setStallResolved: (resolved: boolean) =>
    set(() => ({ isStallResolved: resolved })),
});
