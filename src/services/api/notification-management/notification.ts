import GenericService from '../../base/generic-service';

// TODO: Define the interface for the model
export interface INotification {}

class NotificationService extends GenericService<INotification> {
  endPointURL: string = 'notification_management/api/fcm/device';
}

export const notificationService = new NotificationService();
