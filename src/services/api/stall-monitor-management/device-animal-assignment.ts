import GenericService from '../../base/generic-service';

export interface IDeviceAnimalAssignment {
  animal_id: string;
  device_instance_id: string;
  organization_id: string;
}

class DeviceAnimalAssignmentService extends GenericService<IDeviceAnimalAssignment> {
  endPointURL: string =
    'stall_monitor_management/api/instance_management/device_animal_assignment';
}

export const deviceAnimalAssignmentService =
  new DeviceAnimalAssignmentService();
