import { plainToInstance } from 'class-transformer';
import { validateSync, IsString, IsNotEmpty, IsOptional, IsEnum } from 'class-validator';

// 1. Contract Schema: 'user.created' (Producer: user-service -> Consumer: notification-service)
export class UserCreatedEventContract {
  @IsString()
  @IsNotEmpty()
  userId!: string;

  @IsString()
  @IsNotEmpty()
  name!: string;
}

// 2. Contract Schema: 'notification.broadcast.push' (Producer: notification-service -> Consumer: gateway)
export class NotificationBroadcastPushContract {
  @IsString()
  @IsNotEmpty()
  _id!: string;

  @IsString()
  @IsNotEmpty()
  title!: string;

  @IsString()
  @IsNotEmpty()
  message!: string;

  @IsString()
  @IsNotEmpty()
  type!: string;

  @IsString()
  @IsNotEmpty()
  recipientId!: string;

  @IsString()
  @IsNotEmpty()
  createdAt!: string;
}

// 3. Contract Schema: 'user.logged_in' (Producer: user-service -> Consumer: gateway)
export class UserLoggedInEventContract {
  @IsString()
  @IsNotEmpty()
  userId!: string;

  @IsString()
  @IsNotEmpty()
  email!: string;

  @IsString()
  @IsNotEmpty()
  loginAt!: string;
}

// 4. Contract Schema: 'notification.push' (Producer: notification-service -> Consumer: gateway)
export class NotificationPushContract {
  @IsString()
  @IsNotEmpty()
  userId!: string;

  @IsNotEmpty()
  notification!: Record<string, any>;
}

describe('Layer 5: Microservice Asynchronous Event Contracts', () => {
  function verifyContract<T extends object>(cls: new () => T, payload: any): void {
    const instance = plainToInstance(cls, payload);
    const errors = validateSync(instance as object, { skipMissingProperties: false });
    if (errors.length > 0) {
      throw new Error(`Contract violation: ${errors.toString()}`);
    }
  }

  describe('Contract: user.created', () => {
    it('should successfully validate standard user-service emission', () => {
      const producerPayload = {
        userId: '65b123456789abcdef012345',
        name: 'Jane Doe',
      };

      expect(() => verifyContract(UserCreatedEventContract, producerPayload)).not.toThrow();
    });

    it('should fail if required fields are missing or wrong type', () => {
      expect(() => verifyContract(UserCreatedEventContract, { userId: '123' })).toThrow();
      expect(() =>
        verifyContract(UserCreatedEventContract, { userId: 123, name: 'Jane' }),
      ).toThrow();
    });
  });

  describe('Contract: notification.broadcast.push', () => {
    it('should successfully validate standard notification-service emission', () => {
      const producerPayload = {
        _id: 'notif_987654',
        title: 'System Maintenance',
        message: 'Server upgrade at midnight',
        type: 'WARNING',
        recipientId: 'broadcast',
        createdAt: new Date().toISOString(),
      };

      expect(() =>
        verifyContract(NotificationBroadcastPushContract, producerPayload),
      ).not.toThrow();
    });

    it('should fail if missing required metadata fields', () => {
      const incompletePayload = {
        title: 'Hello',
        message: 'World',
      };

      expect(() => verifyContract(NotificationBroadcastPushContract, incompletePayload)).toThrow();
    });
  });

  describe('Contract: user.logged_in', () => {
    it('should successfully validate user login event emission', () => {
      const producerPayload = {
        userId: 'user_123',
        email: 'user@example.com',
        loginAt: new Date().toISOString(),
      };

      expect(() => verifyContract(UserLoggedInEventContract, producerPayload)).not.toThrow();
    });
  });

  describe('Contract: notification.push', () => {
    it('should successfully validate targeted user notification push', () => {
      const producerPayload = {
        userId: 'user_456',
        notification: {
          id: 'notif_1',
          title: 'Order Shipped',
          message: 'Your package is on its way',
        },
      };

      expect(() => verifyContract(NotificationPushContract, producerPayload)).not.toThrow();
    });
  });
});
