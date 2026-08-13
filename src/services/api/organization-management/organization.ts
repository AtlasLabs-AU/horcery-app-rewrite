import GenericService from '../../base/generic-service';

export interface IOrganization {
  id: string;
  name: string;
  slug: string;
  profile_image: {
    small: string;
    medium: string;
    large: string;
    extra_large: string;
  };
  organization_type: number;
  owner: string;
  realtime_database_url: string;
  created_by: number;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  timezone: string;
  chart_start_time: string | null;
  active_hours_start_time: string | null;
  active_hours_end_time: string | null;
}
class OrganizationService extends GenericService<IOrganization> {
  endPointURL = 'access_management/api/organization_management/organizations';
}

export const organizationService = new OrganizationService();
