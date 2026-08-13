import GenericService from '../../base/generic-service';

export interface ISpaceGroup {
  id: string;
  name: string;
  organization_id: string;
  created_by?: string;
  created_at?: string;
  updated_at?: string;
  deleted_at?: string;
}

class SpaceGroupService extends GenericService<ISpaceGroup> {
  endPointURL: string =
    'stall_monitor_management/api/instance_management/space_groups';
}

export const spaceGroupService = new SpaceGroupService();
