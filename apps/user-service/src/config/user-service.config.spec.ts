import 'reflect-metadata';
import { validate, Environment, UserServiceConfigDto } from './user-service.config';

describe('UserServiceConfig', () => {
  it('should validate valid configuration and convert types', () => {
    const validConfig = {
      USER_SERVICE_MONGO_URI: 'mongodb://localhost:27017/users',
      RABBITMQ_URL: 'amqp://guest:guest@localhost:5672',
      USER_SERVICE_PORT: '3011',
    };

    const result = validate(validConfig);
    expect(result).toBeInstanceOf(UserServiceConfigDto);
    expect(result.USER_SERVICE_MONGO_URI).toBe('mongodb://localhost:27017/users');
    expect(result.RABBITMQ_URL).toBe('amqp://guest:guest@localhost:5672');
    expect(result.USER_SERVICE_PORT).toBe(3011);
    expect(result.NODE_ENV).toBe(Environment.Development);
    expect(result.REDIS_URL).toBe('redis://localhost:6379');
  });

  it('should throw an error when required configuration is missing', () => {
    const invalidConfig = {
      NODE_ENV: 'invalid-env',
    };

    expect(() => validate(invalidConfig)).toThrow();
  });

  it('should convert PORT from string to number', () => {
    const result = validate({
      MONGODB_URI: 'mongodb://localhost:27017/users',
      RABBITMQ_URL: 'amqp://guest:guest@localhost:5672',
      PORT: '4000',
    });
    expect(result.PORT).toBe(4000);
  });

  it('should throw when neither MONGODB_URI nor USER_SERVICE_MONGO_URI is provided', () => {
    expect(() => validate({ RABBITMQ_URL: 'amqp://guest:guest@localhost:5672' })).toThrow(
      'Either MONGODB_URI or USER_SERVICE_MONGO_URI must be provided',
    );
  });
});
