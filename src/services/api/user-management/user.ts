import GenericService from '../../base/generic-service';

export interface IUser {
  id?: string;
  uid?: string;
  username?: string;
  email?: string;
  password?: string;
  first_name?: string;
  last_name?: string;
  is_active?: boolean;
  is_staff?: boolean;
  profile_image?: {
    small: string;
    medium: string;
    large: string;
    extra_large: string;
  };
  created_at?: string;
  updated_at?: string;
  AppMetaData?: any;
  UserMetaData?: any;
  platform_type?: string; // used for account creation on mobile
}

class UserService extends GenericService<IUser> {
  endPointURL: string = 'access_management/api/user_management/users';
}

export const userService = new UserService();
