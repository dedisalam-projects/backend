import 'reflect-metadata';
import { validate, Environment, BlipServicesConfigDto } from './blip-services.config';

describe('BlipServicesConfig', () => {
  it('should apply defaults and convert types', () => {
    const result = validate({ PORT: '4013', BLIP_SERVICES_PORT: '4014' });
    expect(result).toBeInstanceOf(BlipServicesConfigDto);
    expect(result.NODE_ENV).toBe(Environment.Development);
    expect(result.PORT).toBe(4013);
    expect(result.BLIP_SERVICES_PORT).toBe(4014);
    expect(result.RABBITMQ_URL).toBeDefined();
  });

  it('should throw when config is invalid', () => {
    expect(() => validate({ NODE_ENV: 'nope' })).toThrow();
  });
});
