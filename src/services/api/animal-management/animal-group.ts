import GenericService from '../../base/generic-service';

export interface IAnimalGroup {
  id: string;
  group_name: string;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  deleted_by_cascade: boolean;
  organization_id: string;
  created_by: string | null;
  animal_id: string[];
}

class AnimalGroupService extends GenericService<IAnimalGroup> {
  endPointURL: string = 'animal_management/api/animal_handler/animal_groups';
}

export const animalGroupService = new AnimalGroupService();
