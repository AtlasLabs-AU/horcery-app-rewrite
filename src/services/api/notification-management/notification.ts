import GenericService from '../../base/generic-service';

// TODO: Define the interface for the model. Until then this is an unmodelled
// object, NOT `{}` — which would also accept `0`, `""` and `true`.
export type INotification = Record<string, unknown>;

class NotificationService extends GenericService<INotification> {
  endPointURL: string = 'notification_management/api/fcm/device';
}

export const notificationService = new NotificationService();
