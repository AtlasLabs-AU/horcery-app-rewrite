import GenericService from '../../base/generic-service';
import { IAnimal } from '../animal-management/animal';
import { IStall } from './stall';

export interface IAnimalStall {
  id: string;
  stall: string | IStall;
  deleted_at: string | null;
  deleted_by_cascade: boolean;
  created_at: string;
  updated_at: string;
  animal_id: string;
  organization_id: string;
  created_by: string | null;
  animal?: IAnimal;
}

class AnimalStallService extends GenericService<IAnimalStall> {
  endPointURL: string =
    'stall_monitor_management/api/instance_management/animal_stalls';
}

export const animalStallService = new AnimalStallService();
