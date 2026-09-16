import 'reflect-metadata';
import * as fc from 'fast-check';
import { validate, Environment, UserServiceConfigDto } from './user-service.config';

describe('UserServiceConfig Property-Based Testing (Fast-Check)', () => {
  it('should always succeed when required URIs are strings and ports are valid numbers', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 10, maxLength: 100 }),
        fc.string({ minLength: 10, maxLength: 100 }),
        fc.integer({ min: 1024, max: 65535 }),
        fc.integer({ min: 1024, max: 65535 }),
        fc.constantFrom(Environment.Development, Environment.Production, Environment.Test),
        (mongoUri, rmqUrl, port, tcpPort, env) => {
          const rawConfig = {
            USER_SERVICE_MONGO_URI: mongoUri,
            RABBITMQ_URL: rmqUrl,
            USER_SERVICE_PORT: String(port),
            USER_SERVICE_TCP_PORT: String(tcpPort),
            NODE_ENV: env,
          };

          const config = validate(rawConfig);
          expect(config).toBeInstanceOf(UserServiceConfigDto);
          expect(config.USER_SERVICE_MONGO_URI).toBe(mongoUri);
          expect(config.RABBITMQ_URL).toBe(rmqUrl);
          expect(config.USER_SERVICE_PORT).toBe(port);
          expect(config.USER_SERVICE_TCP_PORT).toBe(tcpPort);
          expect(config.NODE_ENV).toBe(env);
        },
      ),
      { numRuns: 100 },
    );
  });

  it('should always throw an error when required URIs are omitted', () => {
    fc.assert(
      fc.property(
        fc.record({
          USER_SERVICE_PORT: fc.integer({ min: 1000, max: 9999 }),
          USER_SERVICE_TCP_PORT: fc.integer({ min: 1000, max: 9999 }),
          NODE_ENV: fc.constantFrom(
            Environment.Development,
            Environment.Production,
            Environment.Test,
          ),
        }),
        (invalidConfig) => {
          expect(() => validate(invalidConfig as Record<string, unknown>)).toThrow();
        },
      ),
      { numRuns: 100 },
    );
  });
});
