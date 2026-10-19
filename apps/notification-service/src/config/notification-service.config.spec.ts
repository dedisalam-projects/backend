import 'reflect-metadata';
import { validate, Environment, NotificationServiceConfigDto } from './notification-service.config';

describe('NotificationServiceConfig', () => {
  it('should successfully validate valid config with defaults and type conversions applied', () => {
    const validConfig = {
      NOTIFICATION_SERVICE_MONGO_URI: 'mongodb://localhost:27017/notifications',
      RABBITMQ_URL: 'amqp://guest:guest@localhost:5672',
      NOTIFICATION_SERVICE_PORT: '3012',
    };

    const result = validate(validConfig);
    expect(result).toBeInstanceOf(NotificationServiceConfigDto);
    expect(result.NOTIFICATION_SERVICE_MONGO_URI).toBe('mongodb://localhost:27017/notifications');
    expect(result.RABBITMQ_URL).toBe('amqp://guest:guest@localhost:5672');
    expect(result.NODE_ENV).toBe(Environment.Development);
    expect(result.NOTIFICATION_SERVICE_PORT).toBe(3012);
  });

  it('should throw an error when required properties are missing', () => {
    const invalidConfig = {
      NODE_ENV: 'not-an-env',
    };

    expect(() => validate(invalidConfig)).toThrow();
  });

  it('should convert PORT from string to number', () => {
    const result = validate({
      MONGODB_URI: 'mongodb://localhost:27017/notifications',
      RABBITMQ_URL: 'amqp://guest:guest@localhost:5672',
      PORT: '4000',
    });
    expect(result.PORT).toBe(4000);
  });

  it('should throw when neither MONGODB_URI nor NOTIFICATION_SERVICE_MONGO_URI is provided', () => {
    expect(() => validate({ RABBITMQ_URL: 'amqp://guest:guest@localhost:5672' })).toThrow(
      'Either MONGODB_URI or NOTIFICATION_SERVICE_MONGO_URI must be provided',
    );
  });
});
