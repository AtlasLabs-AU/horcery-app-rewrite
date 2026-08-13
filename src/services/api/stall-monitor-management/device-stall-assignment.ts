import GenericService from '../../base/generic-service';

export interface IDeviceStallAssignment {
  stall_id: string;
  device_instance_id: string;
  organization_id: string;
}

class DeviceStallAssignmentService extends GenericService<IDeviceStallAssignment> {
  endPointURL: string =
    'stall_monitor_management/api/instance_management/device_stall_assignment';
}

export const deviceStallAssignmentService = new DeviceStallAssignmentService();
