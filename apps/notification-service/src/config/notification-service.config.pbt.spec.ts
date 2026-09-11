import 'reflect-metadata';
import * as fc from 'fast-check';
import { validate, Environment, NotificationServiceConfigDto } from './notification-service.config';

describe('NotificationServiceConfig Property-Based Testing (Fast-Check)', () => {
  it('should always succeed when required URIs are strings and ports are valid numbers', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 10, maxLength: 100 }),
        fc.string({ minLength: 10, maxLength: 100 }),
        fc.integer({ min: 1024, max: 65535 }),
        fc.integer({ min: 1024, max: 65535 }),
        fc.integer({ min: 1024, max: 65535 }),
        fc.constantFrom(Environment.Development, Environment.Production, Environment.Test),
        (mongoUri, rmqUrl, port, tcpPort, gatewayPort, env) => {
          const rawConfig = {
            NOTIFICATION_SERVICE_MONGO_URI: mongoUri,
            RABBITMQ_URL: rmqUrl,
            NOTIFICATION_SERVICE_PORT: String(port),
            NOTIFICATION_SERVICE_TCP_PORT: String(tcpPort),
            GATEWAY_TCP_PORT: String(gatewayPort),
            NODE_ENV: env,
          };

          const config = validate(rawConfig);
          expect(config).toBeInstanceOf(NotificationServiceConfigDto);
          expect(config.NOTIFICATION_SERVICE_MONGO_URI).toBe(mongoUri);
          expect(config.RABBITMQ_URL).toBe(rmqUrl);
          expect(config.NOTIFICATION_SERVICE_PORT).toBe(port);
          expect(config.NOTIFICATION_SERVICE_TCP_PORT).toBe(tcpPort);
          expect(config.GATEWAY_TCP_PORT).toBe(gatewayPort);
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
          NOTIFICATION_SERVICE_PORT: fc.integer({ min: 1000, max: 9999 }),
          NOTIFICATION_SERVICE_TCP_PORT: fc.integer({ min: 1000, max: 9999 }),
          GATEWAY_TCP_PORT: fc.integer({ min: 1000, max: 9999 }),
          NODE_ENV: fc.constantFrom(
            Environment.Development,
            Environment.Production,
            Environment.Test,
          ),
        }),
        (invalidConfig) => {
          expect(() => validate(invalidConfig as any)).toThrow();
        },
      ),
      { numRuns: 100 },
    );
  });
});
