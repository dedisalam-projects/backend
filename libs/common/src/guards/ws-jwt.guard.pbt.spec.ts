import * as fc from 'fast-check';
import { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { WsException } from '@nestjs/websockets';
import { WsJwtGuard } from './ws-jwt.guard';

describe('WsJwtGuard Property-Based Testing (Fast-Check)', () => {
  let reflector: jest.Mocked<Reflector>;
  let configService: jest.Mocked<ConfigService>;
  let guard: WsJwtGuard;

  beforeEach(() => {
    reflector = {
      getAllAndOverride: jest.fn(),
    } as unknown as jest.Mocked<Reflector>;

    configService = {
      get: jest.fn().mockReturnValue('super-secret-key'),
    } as unknown as jest.Mocked<ConfigService>;

    guard = new WsJwtGuard(reflector, configService);
  });

  it('should always return true for public routes regardless of client shape', () => {
    reflector.getAllAndOverride.mockReturnValue(true);

    fc.assert(
      fc.property(fc.anything(), (arbitraryClient) => {
        const mockContext = {
          getHandler: jest.fn(),
          getClass: jest.fn(),
          switchToWs: () => ({ getClient: () => arbitraryClient }),
        };

        expect(guard.canActivate(mockContext as unknown as ExecutionContext)).toBe(true);
      }),
      { numRuns: 100 },
    );
  });

  it('should always reject invalid/missing tokens with WsException and never crash with TypeError', () => {
    reflector.getAllAndOverride.mockReturnValue(false);

    fc.assert(
      fc.property(
        fc.record({
          auth: fc.anything(),
          headers: fc.anything(),
          query: fc.anything(),
        }),
        (arbitraryHandshake) => {
          const client = {
            handshake: arbitraryHandshake,
            data: {},
          };

          const mockContext = {
            getHandler: jest.fn(),
            getClass: jest.fn(),
            switchToWs: () => ({ getClient: () => client }),
          };

          expect(() => guard.canActivate(mockContext as unknown as ExecutionContext)).toThrow(
            WsException,
          );
        },
      ),
      { numRuns: 100 },
    );
  });
});
