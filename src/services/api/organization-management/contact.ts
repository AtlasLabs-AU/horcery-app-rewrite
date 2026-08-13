import GenericService from '../../base/generic-service';

export interface IContact {
  id?: string;
  contact_name: string;
  contact_number: string;
  country_code: string;
  first_name?: string;
  last_name?: string;
  deleted_at?: string | null;
  deleted_by_cascade?: boolean;
  created_at?: string;
  updated_at?: string;
  contact_type?: number;
  contact_email: string;
  created_by?: string | null;
  organization: string;
  user?: string | null;
}

class ContactService extends GenericService<IContact> {
  protected endPointURL: string =
    'access_management/api/organization_management/contacts';
}

export const contactService = new ContactService();
