import GenericService from '../../base/generic-service';

// TODO: Define the interface for the model. Until then this is an unmodelled
// object, NOT `{}` — which would also accept `0`, `""` and `true`.
export type ITestNotification = Record<string, unknown>;

class TestNotificationService extends GenericService<ITestNotification> {
  endPointURL: string = 'notification_management/api/fcm/test_notification';
}

export const testNotificationService = new TestNotificationService();
