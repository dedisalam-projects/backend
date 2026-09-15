import { Test, TestingModule } from '@nestjs/testing';
import { UserGateway } from './user.gateway';
import { ConfigService } from '@nestjs/config';
import { of } from 'rxjs';
import * as jwt from 'jsonwebtoken';
import { WsException } from '@nestjs/websockets';

describe('UserGateway', () => {
  let gateway: UserGateway;
  let mockUserService: { send: jest.Mock };
  let mockConfigService: { get: jest.Mock };
  let mockServer: any;
  let mockToEmit: jest.Mock;

  const jwtSecret = 'test-jwt-secret';

  beforeEach(async () => {
    mockUserService = {
      send: jest.fn(),
    };

    mockConfigService = {
      get: jest.fn().mockImplementation((key: string) => {
        if (key === 'JWT_SECRET') return jwtSecret;
        return null;
      }),
    };

    mockToEmit = jest.fn();
    mockServer = {
      to: jest.fn().mockReturnValue({
        emit: mockToEmit,
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserGateway,
        { provide: 'USER_SERVICE', useValue: mockUserService },
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    gateway = module.get<UserGateway>(UserGateway);
    gateway.server = mockServer;
  });

  describe('afterInit', () => {
    it('should register middleware and handle missing token, invalid token, missing secret, and valid token', () => {
      let middleware: any;
      const fakeServer: any = {
        use: jest.fn().mockImplementation((fn) => {
          middleware = fn;
        }),
      };

      gateway.afterInit(fakeServer);
      expect(fakeServer.use).toHaveBeenCalled();

      // 1. Missing token
      const next1 = jest.fn();
      middleware({ handshake: {} }, next1);
      expect(next1).toHaveBeenCalledWith(expect.any(Error));
      expect(next1.mock.calls[0][0].message).toContain('Authentication token is required');

      // 2. Valid token
      const validToken = jwt.sign({ sub: 'u1', email: 'u@test.com' }, jwtSecret);
      const next2 = jest.fn();
      const client2: any = { handshake: { auth: { token: validToken } } };
      middleware(client2, next2);
      expect(next2).toHaveBeenCalledWith();
      expect(client2.data.user.email).toBe('u@test.com');

      // 3. Invalid token
      const next3 = jest.fn();
      middleware({ handshake: { auth: { token: 'bad-token' } } }, next3);
      expect(next3).toHaveBeenCalledWith(expect.any(Error));
      expect(next3.mock.calls[0][0].message).toContain('Invalid or expired token');

      // 4. Missing secret
      mockConfigService.get.mockReturnValueOnce(null);
      const next4 = jest.fn();
      middleware({ handshake: { auth: { token: validToken } } }, next4);
      expect(next4).toHaveBeenCalledWith(expect.any(Error));
      expect(next4.mock.calls[0][0].message).toContain('Invalid or expired token');

      // 5. Valid token via cookie
      const next5 = jest.fn();
      const client5: any = { handshake: { headers: { cookie: `accessToken=${validToken}` } } };
      middleware(client5, next5);
      expect(next5).toHaveBeenCalledWith();
      expect(client5.data.user.email).toBe('u@test.com');
    });
  });

  describe('handleConnection', () => {
    it('should log and accept if client.data.user is already authenticated by middleware', () => {
      const mockClient: any = {
        id: 'client-already-auth',
        data: { user: { email: 'already@test.com' } },
        emit: jest.fn(),
        disconnect: jest.fn(),
      };
      gateway.handleConnection(mockClient);
      expect(mockClient.disconnect).not.toHaveBeenCalled();
    });

    it('should reject connection when no token is present', () => {
      const mockClient: any = {
        id: 'client-1',
        handshake: {},
        emit: jest.fn(),
        disconnect: jest.fn(),
      };

      gateway.handleConnection(mockClient);

      expect(mockClient.emit).toHaveBeenCalledWith('exception', {
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'Authentication token is required' },
      });
      expect(mockClient.disconnect).toHaveBeenCalledWith(true);
    });

    it('should accept connection when token is in handshake.auth.token with Bearer prefix', () => {
      const token = jwt.sign({ sub: 'user-1', email: 'user@test.com', role: 'user' }, jwtSecret);
      const mockClient: any = {
        id: 'client-2',
        handshake: {
          auth: { token: `Bearer ${token}` },
        },
        emit: jest.fn(),
        disconnect: jest.fn(),
      };

      gateway.handleConnection(mockClient);

      expect(mockClient.data.user).toBeDefined();
      expect(mockClient.data.user.email).toBe('user@test.com');
      expect(mockClient.disconnect).not.toHaveBeenCalled();
    });

    it('should accept connection when token is in handshake.headers.authorization', () => {
      const token = jwt.sign({ sub: 'user-2', email: 'header@test.com', role: 'user' }, jwtSecret);
      const mockClient: any = {
        id: 'client-3',
        handshake: {
          headers: { authorization: `Bearer ${token}` },
        },
        data: {},
        emit: jest.fn(),
        disconnect: jest.fn(),
      };

      gateway.handleConnection(mockClient);

      expect(mockClient.data.user.email).toBe('header@test.com');
    });

    it('should accept connection when token is in handshake.headers.authorization without Bearer', () => {
      const token = jwt.sign(
        { sub: 'user-2b', email: 'header2@test.com', role: 'user' },
        jwtSecret,
      );
      const mockClient: any = {
        id: 'client-3b',
        handshake: {
          headers: { authorization: token },
        },
        data: {},
        emit: jest.fn(),
        disconnect: jest.fn(),
      };

      gateway.handleConnection(mockClient);

      expect(mockClient.data.user.email).toBe('header2@test.com');
    });

    it('should accept connection when token is in handshake.query.token', () => {
      const token = jwt.sign({ sub: 'user-3', email: 'query@test.com', role: 'user' }, jwtSecret);
      const mockClient: any = {
        id: 'client-4',
        handshake: {
          query: { token },
        },
        data: {},
        emit: jest.fn(),
        disconnect: jest.fn(),
      };

      gateway.handleConnection(mockClient);

      expect(mockClient.data.user.email).toBe('query@test.com');
    });

    it('should accept connection when token is in handshake.headers.cookie', () => {
      const token = jwt.sign(
        { sub: 'user-cookie', email: 'cookie@test.com', role: 'user' },
        jwtSecret,
      );
      const mockClient: any = {
        id: 'client-cookie',
        handshake: {
          headers: { cookie: `accessToken=${token}; other=abc` },
        },
        data: {},
        emit: jest.fn(),
        disconnect: jest.fn(),
      };

      gateway.handleConnection(mockClient);

      expect(mockClient.data.user.email).toBe('cookie@test.com');
    });

    it('should reject connection when cookie header lacks accessToken', () => {
      const mockClient: any = {
        id: 'client-no-token-cookie',
        handshake: {
          headers: { cookie: 'other=abc; session=123' },
        },
        emit: jest.fn(),
        disconnect: jest.fn(),
      };

      gateway.handleConnection(mockClient);

      expect(mockClient.emit).toHaveBeenCalledWith('exception', {
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'Authentication token is required' },
      });
      expect(mockClient.disconnect).toHaveBeenCalledWith(true);
    });

    it('should reject connection when token is invalid', () => {
      const mockClient: any = {
        id: 'client-5',
        handshake: {
          auth: { token: 'invalid-jwt-token' },
        },
        emit: jest.fn(),
        disconnect: jest.fn(),
      };

      gateway.handleConnection(mockClient);

      expect(mockClient.emit).toHaveBeenCalledWith('exception', {
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'Invalid or expired token' },
      });
      expect(mockClient.disconnect).toHaveBeenCalledWith(true);
    });

    it('should reject connection when JWT_SECRET is missing', () => {
      mockConfigService.get.mockReturnValueOnce(null);
      const token = jwt.sign({ sub: 'u1' }, 'any-key');
      const mockClient: any = {
        id: 'client-6',
        handshake: {
          auth: { token },
        },
        emit: jest.fn(),
        disconnect: jest.fn(),
      };

      gateway.handleConnection(mockClient);

      expect(mockClient.disconnect).toHaveBeenCalledWith(true);
    });
  });

  describe('handleDisconnect', () => {
    it('should handle disconnect cleanly without error', () => {
      const mockClient: any = { id: 'client-d1' };
      expect(() => gateway.handleDisconnect(mockClient)).not.toThrow();
    });
  });

  describe('handleGetProfile', () => {
    it('should throw WsException if user is not authenticated', async () => {
      const mockClient: any = { data: {} };
      await expect(gateway.handleGetProfile(mockClient)).rejects.toThrow(WsException);
    });

    it('should retrieve user profile successfully', async () => {
      const mockClient: any = { data: { user: { sub: 'u1' } } };
      const profile = { id: 'u1', email: 'test@example.com' };
      mockUserService.send.mockReturnValueOnce(of(profile));

      const result = await gateway.handleGetProfile(mockClient);

      expect(mockUserService.send).toHaveBeenCalledWith('user.profile', { userId: 'u1' });
      expect(result.success).toBe(true);
      expect(result.data).toEqual(profile);
    });
  });

  describe('handleUpdateProfile', () => {
    it('should throw WsException if user is not authenticated', async () => {
      const mockClient: any = { data: {} };
      await expect(gateway.handleUpdateProfile(mockClient, { name: 'New' })).rejects.toThrow(
        WsException,
      );
    });

    it('should update user profile successfully', async () => {
      const mockClient: any = { data: { user: { sub: 'u1' } } };
      const updated = { id: 'u1', name: 'New Name' };
      mockUserService.send.mockReturnValueOnce(of(updated));

      const result = await gateway.handleUpdateProfile(mockClient, { name: 'New Name' });

      expect(mockUserService.send).toHaveBeenCalledWith('user.update', {
        userId: 'u1',
        name: 'New Name',
      });
      expect(result.success).toBe(true);
      expect(result.data).toEqual(updated);
    });
  });

  describe('admin operations & checkAdmin', () => {
    it('should throw WsException if client has no user data in checkAdmin', async () => {
      const mockClient: any = { data: {} };
      await expect(gateway.handleAdminJoin(mockClient)).rejects.toThrow(WsException);
    });

    it('should throw FORBIDDEN WsException if user is not an admin', async () => {
      const mockClient: any = { data: { user: { sub: 'u1', role: 'user' } } };
      await expect(gateway.handleAdminJoin(mockClient)).rejects.toThrow(WsException);
    });

    it('should throw FORBIDDEN WsException if user has no role or roles properties', async () => {
      const mockClient: any = { data: { user: { sub: 'u1' } } };
      await expect(gateway.handleAdminJoin(mockClient)).rejects.toThrow(WsException);
    });

    it('should allow handleAdminJoin when user is admin and join room', async () => {
      const mockClient: any = {
        data: { user: { sub: 'a1', email: 'admin@test.com', roles: ['admin'] } },
        join: jest.fn(),
      };

      const result = await gateway.handleAdminJoin(mockClient);

      expect(mockClient.join).toHaveBeenCalledWith('admin:users');
      expect(result.success).toBe(true);
      expect(result.data).toEqual({ room: 'admin:users', joined: true });
    });

    it('should allow admin when roles is string or super_admin', async () => {
      const mockClient: any = {
        data: { user: { sub: 'a2', email: 'super@test.com', role: 'super_admin' } },
        join: jest.fn(),
      };

      const result = await gateway.handleAdminJoin(mockClient);
      expect(result.success).toBe(true);
    });

    it('should allow handleAdminListUsers with query', async () => {
      const mockClient: any = {
        data: { user: { sub: 'a1', roles: 'admin' } },
      };
      const listData = { items: [], meta: { total: 0 } };
      mockUserService.send.mockReturnValueOnce(of(listData));

      const result = await gateway.handleAdminListUsers(mockClient, { page: 1, limit: 10 } as any);

      expect(mockUserService.send).toHaveBeenCalledWith('user.list.paginated', {
        page: 1,
        limit: 10,
      });
      expect(result.success).toBe(true);
      expect(result.data).toEqual(listData);
    });

    it('should handleAdminListUsers without query passing empty object', async () => {
      const mockClient: any = {
        data: { user: { sub: 'a1', roles: 'admin' } },
      };
      const listData = { items: [], meta: { total: 0 } };
      mockUserService.send.mockReturnValueOnce(of(listData));

      const result = await gateway.handleAdminListUsers(mockClient, undefined as any);

      expect(mockUserService.send).toHaveBeenCalledWith('user.list.paginated', {});
      expect(result.success).toBe(true);
    });

    it('should handleAdminCreateUser and emit user:created to admin:users room', async () => {
      const mockClient: any = {
        data: { user: { sub: 'a1', roles: ['admin'] } },
      };
      const newUser = { id: 'new-u', email: 'created@test.com' };
      mockUserService.send.mockReturnValueOnce(of(newUser));

      const createDto = { email: 'created@test.com', password: 'p', name: 'Created' };
      const result = await gateway.handleAdminCreateUser(mockClient, createDto as any);

      expect(mockUserService.send).toHaveBeenCalledWith('user.create', createDto);
      expect(mockServer.to).toHaveBeenCalledWith('admin:users');
      expect(mockToEmit).toHaveBeenCalledWith('user:created', newUser);
      expect(result.success).toBe(true);
      expect(result.data).toEqual(newUser);
    });

    it('should handleAdminUpdateUser and emit user:updated to admin:users room', async () => {
      const mockClient: any = {
        data: { user: { sub: 'a1', roles: ['admin'] } },
      };
      const updatedUser = { id: 'target-u', name: 'Updated' };
      mockUserService.send.mockReturnValueOnce(of(updatedUser));

      const updateDto = { userId: 'target-u', name: 'Updated' };
      const result = await gateway.handleAdminUpdateUser(mockClient, updateDto as any);

      expect(mockUserService.send).toHaveBeenCalledWith('user.update.admin', updateDto);
      expect(mockServer.to).toHaveBeenCalledWith('admin:users');
      expect(mockToEmit).toHaveBeenCalledWith('user:updated', updatedUser);
      expect(result.success).toBe(true);
      expect(result.data).toEqual(updatedUser);
    });

    it('should handleAdminDeleteUser throw error when userId missing', async () => {
      const mockClient: any = {
        data: { user: { sub: 'a1', roles: ['admin'] } },
      };
      await expect(gateway.handleAdminDeleteUser(mockClient, {} as any)).rejects.toThrow(
        WsException,
      );
    });

    it('should handleAdminDeleteUser and emit user:deleted to admin:users room', async () => {
      const mockClient: any = {
        data: { user: { sub: 'a1', roles: ['admin'] } },
      };
      mockUserService.send.mockReturnValueOnce(of({ message: 'deleted' }));

      const result = await gateway.handleAdminDeleteUser(mockClient, { userId: 'del-u' });

      expect(mockUserService.send).toHaveBeenCalledWith('user.delete', { userId: 'del-u' });
      expect(mockServer.to).toHaveBeenCalledWith('admin:users');
      expect(mockToEmit).toHaveBeenCalledWith('user:deleted', { userId: 'del-u' });
      expect(result.success).toBe(true);
    });
  });
});
