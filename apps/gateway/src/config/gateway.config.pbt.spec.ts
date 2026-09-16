import 'reflect-metadata';
import * as fc from 'fast-check';
import { validate, Environment, GatewayConfigDto } from './gateway.config';

describe('GatewayConfig Property-Based Testing (Fast-Check)', () => {
  it('should always succeed and coerce ports when valid JWT_SECRET and numeric ports are provided', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: 100 }),
        fc.integer({ min: 1024, max: 65535 }),
        fc.integer({ min: 1024, max: 65535 }),
        fc.integer({ min: 1024, max: 65535 }),
        fc.constantFrom(Environment.Development, Environment.Production, Environment.Test),
        (jwtSecret, port, userServicePort, gatewayTcpPort, env) => {
          const rawConfig = {
            JWT_SECRET: jwtSecret,
            PORT: String(port),
            USER_SERVICE_TCP_PORT: String(userServicePort),
            GATEWAY_TCP_PORT: String(gatewayTcpPort),
            NODE_ENV: env,
          };

          const config = validate(rawConfig);
          expect(config).toBeInstanceOf(GatewayConfigDto);
          expect(config.JWT_SECRET).toBe(jwtSecret);
          expect(config.PORT).toBe(port);
          expect(config.USER_SERVICE_TCP_PORT).toBe(userServicePort);
          expect(config.GATEWAY_TCP_PORT).toBe(gatewayTcpPort);
          expect(config.NODE_ENV).toBe(env);
        },
      ),
      { numRuns: 100 },
    );
  });

  it('should always throw an error when JWT_SECRET is omitted', () => {
    fc.assert(
      fc.property(
        fc.record({
          PORT: fc.integer({ min: 1000, max: 9999 }),
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

  it('should reject invalid NODE_ENV values with validation error', () => {
    fc.assert(
      fc.property(
        fc
          .string({ minLength: 1 })
          .filter((s) => s !== 'development' && s !== 'production' && s !== 'test'),
        (invalidEnv) => {
          const rawConfig = {
            JWT_SECRET: 'any-secret',
            NODE_ENV: invalidEnv,
          };
          expect(() => validate(rawConfig)).toThrow();
        },
      ),
      { numRuns: 100 },
    );
  });
});
