import GenericService from '../../base/generic-service';
import { IAnimal } from '../animal-management/animal';
import { IDeviceInstance } from './device-instance';

export interface IAnimalDeviceInstance {
  id: string;
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
  animal_id: string | IAnimal;
  organization_id: string | null;
  created_by: string | null;
  device_instance: string | IDeviceInstance;
}

class AnimalDeviceInstanceService extends GenericService<IAnimalDeviceInstance> {
  endPointURL: string =
    'stall_monitor_management/api/instance_management/animal_device_instances';
}

export const animalDeviceInstanceService = new AnimalDeviceInstanceService();
