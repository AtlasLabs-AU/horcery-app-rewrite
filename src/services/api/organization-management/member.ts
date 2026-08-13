import GenericService from '../../base/generic-service';
import { IUser } from '../user-management/user';

export interface IMember {
  id: string;
  deleted_at: string | null;
  deleted_by_cascade: boolean;
  created_at: string;
  updated_at: string;
  first_name: string;
  last_name: string;
  member_type: number;
  profile_image: string | null;
  created_by: number;
  user: IUser;
  organization: string;
}

class MemberService extends GenericService<IMember> {
  endPointURL: string = 'access_management/api/organization_management/members';
}

export const memberService = new MemberService();
