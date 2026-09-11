import { WsJwtGuard } from './ws-jwt.guard';
import { Reflector } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { ExecutionContext } from '@nestjs/common';
import { WsException } from '@nestjs/websockets';
import * as jwt from 'jsonwebtoken';

describe('WsJwtGuard', () => {
  let guard: WsJwtGuard;
  let reflector: { getAllAndOverride: jest.Mock };
  let configService: { get: jest.Mock };

  const jwtSecret = 'test-common-secret';

  beforeEach(() => {
    reflector = { getAllAndOverride: jest.fn() };
    configService = {
      get: jest.fn().mockImplementation((key: string) => {
        if (key === 'JWT_SECRET') return jwtSecret;
        return null;
      }),
    };
    guard = new WsJwtGuard(
      reflector as unknown as Reflector,
      configService as unknown as ConfigService,
    );
  });

  function createMockContext(client: any): ExecutionContext {
    return {
      getHandler: jest.fn(),
      getClass: jest.fn(),
      switchToWs: () => ({
        getClient: () => client,
      }),
    } as unknown as ExecutionContext;
  }

  it('should allow access for public routes', () => {
    reflector.getAllAndOverride.mockReturnValueOnce(true);
    const context = createMockContext(null);

    expect(guard.canActivate(context)).toBe(true);
  });

  it('should throw WsException when client or handshake is missing or empty', () => {
    reflector.getAllAndOverride.mockReturnValueOnce(false);
    const context1 = createMockContext(null);
    expect(() => guard.canActivate(context1)).toThrow(WsException);

    reflector.getAllAndOverride.mockReturnValueOnce(false);
    const context2 = createMockContext({});
    expect(() => guard.canActivate(context2)).toThrow(WsException);

    reflector.getAllAndOverride.mockReturnValueOnce(false);
    const context3 = createMockContext({ handshake: {} });
    expect(() => guard.canActivate(context3)).toThrow(WsException);
  });

  it('should extract token from handshake.auth.token with Bearer prefix', () => {
    reflector.getAllAndOverride.mockReturnValueOnce(false);
    const token = jwt.sign({ sub: 'user-1' }, jwtSecret);
    const client = {
      handshake: { auth: { token: `Bearer ${token}` } },
    };
    const context = createMockContext(client);

    const result = guard.canActivate(context);
    expect(result).toBe(true);
    expect((client as any).data.user.sub).toBe('user-1');
  });

  it('should extract token from handshake.auth.token without Bearer prefix', () => {
    reflector.getAllAndOverride.mockReturnValueOnce(false);
    const token = jwt.sign({ sub: 'user-2' }, jwtSecret);
    const client: any = {
      data: { existing: true },
      handshake: { auth: { token } },
    };
    const context = createMockContext(client);

    const result = guard.canActivate(context);
    expect(result).toBe(true);
    expect(client.data.user.sub).toBe('user-2');
  });

  it('should extract token from handshake.headers.authorization with Bearer prefix', () => {
    reflector.getAllAndOverride.mockReturnValueOnce(false);
    const token = jwt.sign({ sub: 'user-3' }, jwtSecret);
    const client = {
      handshake: { headers: { authorization: `Bearer ${token}` } },
    };
    const context = createMockContext(client);

    expect(guard.canActivate(context)).toBe(true);
    expect((client as any).data.user.sub).toBe('user-3');
  });

  it('should extract token from handshake.headers.authorization without Bearer prefix', () => {
    reflector.getAllAndOverride.mockReturnValueOnce(false);
    const token = jwt.sign({ sub: 'user-3b' }, jwtSecret);
    const client = {
      handshake: { headers: { authorization: token } },
    };
    const context = createMockContext(client);

    expect(guard.canActivate(context)).toBe(true);
  });

  it('should extract token from handshake.query.token when valid string', () => {
    reflector.getAllAndOverride.mockReturnValueOnce(false);
    const token = jwt.sign({ sub: 'user-4' }, jwtSecret);
    const client = {
      handshake: { query: { token } },
    };
    const context = createMockContext(client);

    expect(guard.canActivate(context)).toBe(true);
  });

  it('should return null from extractToken if query token is not string', () => {
    reflector.getAllAndOverride.mockReturnValueOnce(false);
    const client = {
      handshake: { query: { token: 12345 } },
    };
    const context = createMockContext(client);

    expect(() => guard.canActivate(context)).toThrow(WsException);
  });

  it('should throw WsException when JWT_SECRET is not defined', () => {
    reflector.getAllAndOverride.mockReturnValueOnce(false);
    configService.get.mockReturnValueOnce(null);
    const token = jwt.sign({ sub: 'user-5' }, 'secret');
    const client = {
      handshake: { auth: { token } },
    };
    const context = createMockContext(client);

    expect(() => guard.canActivate(context)).toThrow(WsException);
  });

  it('should throw WsException when token verification fails', () => {
    reflector.getAllAndOverride.mockReturnValueOnce(false);
    const client = {
      handshake: { auth: { token: 'invalid.token' } },
    };
    const context = createMockContext(client);

    expect(() => guard.canActivate(context)).toThrow(WsException);
  });
});
