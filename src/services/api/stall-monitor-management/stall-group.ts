import GenericService from '../../base/generic-service';

export interface IStallGroup {
  id: string;
  name: string;
  organization_id: string;
  created_by?: string;
  created_at?: string;
  updated_at?: string;
  deleted_at?: string;
}

class StallGroupService extends GenericService<IStallGroup> {
  endPointURL: string =
    'stall_monitor_management/api/instance_management/stall_groups';
}

export const stallGroupService = new StallGroupService();
