import GenericService from '../../base/generic-service';

// TODO: Define the interface for the model. Until then this is an unmodelled
// object, NOT `{}` — which would also accept `0`, `""` and `true`.
export type IUserForgotPassword = Record<string, unknown>;

class UserForgotPasswordService extends GenericService<IUserForgotPassword> {
  endPointURL: string =
    'access_management/api/user_management/forgot_password/';
}

export const userForgotPasswordService = new UserForgotPasswordService();
