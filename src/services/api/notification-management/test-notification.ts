import GenericService from '../../base/generic-service';

// TODO: Define the interface for the model
export interface ITestNotification {}

class TestNotificationService extends GenericService<ITestNotification> {
  endPointURL: string = 'notification_management/api/fcm/test_notification';
}

export const testNotificationService = new TestNotificationService();
