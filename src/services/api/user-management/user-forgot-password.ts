import GenericService from '../../base/generic-service';

export interface IUserForgotPassword {}

class UserForgotPasswordService extends GenericService<IUserForgotPassword> {
  endPointURL: string =
    'access_management/api/user_management/forgot_password/';
}

export const userForgotPasswordService = new UserForgotPasswordService();
