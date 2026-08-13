import GenericService from '../../base/generic-service';

export interface IProvisioningRequest {
  id: string;
  hotp: string;
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
  name: string;
  organization_id: string;
  expiry: string;
  device_id: string;
  pairing_status: number;
  device_type: number;
  user_uid: string;
}

class ProvisioningRequestService extends GenericService<IProvisioningRequest> {
  endPointURL: string =
    'stall_monitor_management/api/instance_management/provisioning_requests';
}

export const provisioningRequestService = new ProvisioningRequestService();
