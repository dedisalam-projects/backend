import 'reflect-metadata';
import { validate, Environment, GatewayConfigDto } from './gateway.config';

describe('GatewayConfig', () => {
  it('should validate valid configuration and convert string numbers', () => {
    const validConfig = {
      JWT_SECRET: 'super-secret',
      PORT: '3000',
      USER_SERVICE_TCP_PORT: '3001',
      GATEWAY_TCP_PORT: '4000',
    };

    const result = validate(validConfig);
    expect(result).toBeInstanceOf(GatewayConfigDto);
    expect(result.JWT_SECRET).toBe('super-secret');
    expect(result.PORT).toBe(3000);
    expect(result.USER_SERVICE_TCP_PORT).toBe(3001);
    expect(result.GATEWAY_TCP_PORT).toBe(4000);
    expect(result.NODE_ENV).toBe(Environment.Development);
    expect(result.JWT_EXPIRES_IN).toBe('15m');
    expect(result.USER_SERVICE_TCP_HOST).toBe('localhost');
    expect(result.REDIS_URL).toBe('redis://localhost:6379');
  });

  it('should throw an error when required configuration is missing', () => {
    const invalidConfig = {
      NODE_ENV: 'invalid-env',
    };

    expect(() => validate(invalidConfig)).toThrow();
  });
});
