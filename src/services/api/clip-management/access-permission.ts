import GenericService from '../../base/generic-service';

export interface IAccessPermission {
  id?: string;
  deleted?: string;
  deletedByCascade?: boolean;
  createdAt?: string;
  updatedAt?: string;
  expiry?: string;
  totpSecret?: string;
  user_email?: string;
  clip?: string;
}

class AccessPermissionService extends GenericService<IAccessPermission> {
  endPointURL: string =
    'hls_clip_management/api/clip_handler/access_permissions';
}

export const accessPermissionService = new AccessPermissionService();
