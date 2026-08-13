import GenericService from '../../base/generic-service';

// TODO: Define the interface for the model
export interface IResendVerifyEmail {
  email: string;
  invite_token?: string;
  onboarding_device_id?: string;
}

class ResendVerifyEmailService extends GenericService<IResendVerifyEmail> {
  endPointURL: string =
    'access_management/api/user_management/resend_verify_email';
}

export const resendVerifyEmailService = new ResendVerifyEmailService();
