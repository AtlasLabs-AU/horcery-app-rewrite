import GenericService from '../../base/generic-service';

export interface ISpace {
  id: string;
  name: string;
  third_party_device_instance: string;
  organization_id: string;
  is_shared: boolean;
  AppMetaData?: Record<string, unknown>;
  UserMetaData?: Record<string, unknown>;
  prometheus_url: string;
  hide_metrics_till: string;
  space_blur_hash?: string;
  device_instance: string;
  space_url: string;
  spacegroups: any[];
  created_by: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

class SpaceService extends GenericService<ISpace> {
  endPointURL: string =
    'stall_monitor_management/api/instance_management/spaces';
}

export const spaceService = new SpaceService();
