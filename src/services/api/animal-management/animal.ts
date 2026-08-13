import GenericService from '../../base/generic-service';
import { IStall } from '../stall-monitor-management/stall';

export interface IAnimal {
  id?: string;
  animal_image?:
    | {
        small: string;
        medium: string;
        large: string;
        extra_large: string;
      }
    | {};
  registered_name?: string;
  deleted_at?: string | null;
  deleted_by_cascade?: boolean;
  created_at?: string;
  updated_at?: string;
  organization_id?: string;
  animal_name?: string;
  animal_type?: string;
  location?: string | null;
  dob?: string;
  gender?: string;
  breed?: string;
  height?: number;
  weight?: number;
  length?: number;
  heart_girth?: number;
  contact_name?: string | null;
  contact_number?: string | null;
  created_by?: number | null;
  feeding_plan_id?: string[];
  stall?: IStall;
  UnattestedMetaData?: object;
  animal_blur_hash?: string | null;
  monitoring_mode?: number;
}

class AnimalService extends GenericService<IAnimal> {
  endPointURL: string = 'animal_management/api/animal_handler/animals';
}

export const animalService = new AnimalService();
