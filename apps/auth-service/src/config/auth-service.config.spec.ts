import 'reflect-metadata';
import { validate, Environment, AuthServiceConfigDto } from './auth-service.config';

describe('AuthServiceConfig', () => {
  it('should apply defaults and convert types', () => {
    const result = validate({ PORT: '3016', AUTH_SERVICE_PORT: '3017' });
    expect(result).toBeInstanceOf(AuthServiceConfigDto);
    expect(result.NODE_ENV).toBe(Environment.Development);
    expect(result.PORT).toBe(3016);
    expect(result.AUTH_SERVICE_PORT).toBe(3017);
    expect(result.JWT_SECRET).toBeDefined();
  });

  it('should throw when config is invalid', () => {
    expect(() => validate({ NODE_ENV: 'not-an-env' })).toThrow();
  });
});
