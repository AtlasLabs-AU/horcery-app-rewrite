import GenericService from '../../base/generic-service';

export interface IAccountDeletionRequest {
  organization_id?: string;
}

class AccountDeletionRequestService extends GenericService<IAccountDeletionRequest> {
  endPointURL: string =
    'access_management/api/user_management/account_deletion_request/';
}

export const accountDeletionRequestService =
  new AccountDeletionRequestService();
