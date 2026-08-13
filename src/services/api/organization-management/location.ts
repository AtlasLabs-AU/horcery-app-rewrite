import GenericService from '../../base/generic-service';

export interface ILocation {
  id?: string;
  city?: string;
  country?: string;
  deleted_at?: string | null;
  deleted_by_cascade?: boolean;
  created_at?: string;
  updated_at?: string;
  state?: string;
  longitude?: number;
  latitude?: number;
  closest_longitude?: number;
  closest_latitude?: number;
  created_by?: string;
  organization?: string;
}

class LocationService extends GenericService<ILocation> {
  endPointURL: string =
    'access_management/api/organization_management/locations';
}

export const locationService = new LocationService();
