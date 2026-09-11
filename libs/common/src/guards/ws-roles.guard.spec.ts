import { WsRolesGuard } from './ws-roles.guard';
import { Reflector } from '@nestjs/core';
import { ExecutionContext } from '@nestjs/common';
import { WsException } from '@nestjs/websockets';

describe('WsRolesGuard', () => {
  let guard: WsRolesGuard;
  let reflector: { getAllAndOverride: jest.Mock };

  beforeEach(() => {
    reflector = { getAllAndOverride: jest.fn() };
    guard = new WsRolesGuard(reflector as unknown as Reflector);
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

  it('should return true when no roles are required', () => {
    reflector.getAllAndOverride.mockReturnValueOnce(null);
    expect(guard.canActivate(createMockContext({}))).toBe(true);

    reflector.getAllAndOverride.mockReturnValueOnce([]);
    expect(guard.canActivate(createMockContext({}))).toBe(true);
  });

  it('should throw UNAUTHORIZED when user is not present on socket', () => {
    reflector.getAllAndOverride.mockReturnValueOnce(['admin']);
    const context = createMockContext({ data: {} });

    expect(() => guard.canActivate(context)).toThrow(WsException);
  });

  it('should throw FORBIDDEN when user has no roles or role defined', () => {
    reflector.getAllAndOverride.mockReturnValueOnce(['admin']);
    const context = createMockContext({ data: { user: { sub: 'u1' } } });

    expect(() => guard.canActivate(context)).toThrow(WsException);
  });

  it('should return true when user.roles is an array containing the required role', () => {
    reflector.getAllAndOverride.mockReturnValueOnce(['admin']);
    const context = createMockContext({
      data: { user: { sub: 'u1', roles: ['user', 'admin'] } },
    });

    expect(guard.canActivate(context)).toBe(true);
  });

  it('should return true when user.roles is a single string matching the required role', () => {
    reflector.getAllAndOverride.mockReturnValueOnce(['admin']);
    const context = createMockContext({
      data: { user: { sub: 'u1', roles: 'admin' } },
    });

    expect(guard.canActivate(context)).toBe(true);
  });

  it('should return true when user.role is a string matching the required role', () => {
    reflector.getAllAndOverride.mockReturnValueOnce(['admin']);
    const context = createMockContext({
      data: { user: { sub: 'u1', role: 'admin' } },
    });

    expect(guard.canActivate(context)).toBe(true);
  });

  it('should throw FORBIDDEN when user roles do not match any required roles', () => {
    reflector.getAllAndOverride.mockReturnValueOnce(['admin', 'super_admin']);
    const context = createMockContext({
      data: { user: { sub: 'u1', role: 'guest' } },
    });

    expect(() => guard.canActivate(context)).toThrow(WsException);
  });
});
