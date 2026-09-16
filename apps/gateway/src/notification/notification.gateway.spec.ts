import { Test, TestingModule } from '@nestjs/testing';
import { NotificationGateway } from './notification.gateway';
import { ConfigService } from '@nestjs/config';
import { of } from 'rxjs';
import * as jwt from 'jsonwebtoken';
import { WsException } from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';

describe('NotificationGateway', () => {
  let gateway: NotificationGateway;
  let mockNotificationClient: { send: jest.Mock };
  let mockConfigService: { get: jest.Mock };
  let mockServer: { emit: jest.Mock; to: jest.Mock };
  let mockToEmit: jest.Mock;

  const jwtSecret = 'test-jwt-secret';

  beforeEach(async () => {
    mockNotificationClient = {
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
      emit: jest.fn(),
      to: jest.fn().mockReturnValue({
        emit: mockToEmit,
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationGateway,
        { provide: 'NOTIFICATION_SERVICE', useValue: mockNotificationClient },
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    gateway = module.get<NotificationGateway>(NotificationGateway);
    gateway.server = mockServer as unknown as Server;
  });

  describe('afterInit', () => {
    it('should register middleware and handle missing token, invalid token, missing secret, and valid token', () => {
      let middleware!: (client: Socket, next: (err?: Error) => void) => void;
      const fakeServer = {
        use: jest
          .fn()
          .mockImplementation((fn: (client: Socket, next: (err?: Error) => void) => void) => {
            middleware = fn;
          }),
      } as unknown as Server;

      gateway.afterInit(fakeServer);
      expect(fakeServer.use).toHaveBeenCalled();

      // 1. Missing token
      const next1 = jest.fn();
      middleware({ handshake: {} } as unknown as Socket, next1);
      expect(next1).toHaveBeenCalledWith(expect.any(Error));
      expect(next1.mock.calls[0][0].message).toContain('Authentication token is required');

      // 2. Valid token
      const validToken = jwt.sign({ sub: 'u1', email: 'u@test.com' }, jwtSecret);
      const next2 = jest.fn();
      const client2 = {
        handshake: { auth: { token: validToken } },
        data: {},
      } as unknown as Socket;
      middleware(client2, next2);
      expect(next2).toHaveBeenCalledWith();
      expect((client2.data?.user as { email?: string })?.email).toBe('u@test.com');

      // 3. Invalid token
      const next3 = jest.fn();
      middleware({ handshake: { auth: { token: 'bad-token' } } } as unknown as Socket, next3);
      expect(next3).toHaveBeenCalledWith(expect.any(Error));
      expect(next3.mock.calls[0][0].message).toContain('Invalid or expired token');

      // 4. Missing secret
      mockConfigService.get.mockReturnValueOnce(null);
      const next4 = jest.fn();
      middleware({ handshake: { auth: { token: validToken } } } as unknown as Socket, next4);
      expect(next4).toHaveBeenCalledWith(expect.any(Error));
      expect(next4.mock.calls[0][0].message).toContain('Invalid or expired token');

      // 5. Valid token via cookie
      const next5 = jest.fn();
      const client5 = {
        handshake: { headers: { cookie: `accessToken=${validToken}` } },
        data: {},
      } as unknown as Socket;
      middleware(client5, next5);
      expect(next5).toHaveBeenCalledWith();
      expect((client5.data?.user as { email?: string })?.email).toBe('u@test.com');
    });
  });

  describe('handleConnection', () => {
    it('should accept and join personal room if client.data.user is already authenticated by middleware', () => {
      const mockClient = {
        id: 'client-already-auth',
        data: { user: { sub: 'u123', email: 'already@test.com' } },
        join: jest.fn(),
        emit: jest.fn(),
        disconnect: jest.fn(),
      } as unknown as Socket;
      gateway.handleConnection(mockClient);
      expect(mockClient.join).toHaveBeenCalledWith('user_u123');
      expect(mockClient.emit).toHaveBeenCalledWith('hello', expect.any(Object));
      expect(mockClient.disconnect).not.toHaveBeenCalled();
    });

    it('should reject connection when token is missing', () => {
      const mockClient = {
        id: 'c1',
        handshake: {},
        emit: jest.fn(),
        disconnect: jest.fn(),
      } as unknown as Socket;

      gateway.handleConnection(mockClient);

      expect(mockClient.emit).toHaveBeenCalledWith('exception', {
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'Authentication token is required' },
      });
      expect(mockClient.disconnect).toHaveBeenCalledWith(true);
    });

    it('should connect and join personal room when valid token is in auth.token', () => {
      const token = jwt.sign({ sub: 'u123', email: 'u@test.com' }, jwtSecret);
      const mockClient = {
        id: 'c2',
        handshake: { auth: { token: `Bearer ${token}` } },
        join: jest.fn(),
        emit: jest.fn(),
        disconnect: jest.fn(),
      } as unknown as Socket;

      gateway.handleConnection(mockClient);

      expect(mockClient.join).toHaveBeenCalledWith('user_u123');
      expect(mockClient.emit).toHaveBeenCalledWith('hello', {
        message: 'Connected to realtime notification stream',
        user: { id: 'u123', email: 'u@test.com' },
      });
      expect(mockClient.disconnect).not.toHaveBeenCalled();
    });

    it('should connect when token is in handshake headers without Bearer prefix', () => {
      const token = jwt.sign({ sub: 'u456', email: 'u2@test.com' }, jwtSecret);
      const mockClient = {
        id: 'c3',
        handshake: { headers: { authorization: token } },
        join: jest.fn(),
        emit: jest.fn(),
        disconnect: jest.fn(),
      } as unknown as Socket;

      gateway.handleConnection(mockClient);

      expect(mockClient.join).toHaveBeenCalledWith('user_u456');
    });

    it('should connect when token is in handshake headers with Bearer prefix', () => {
      const token = jwt.sign({ sub: 'u456b', email: 'u2b@test.com' }, jwtSecret);
      const mockClient = {
        id: 'c3b',
        handshake: { headers: { authorization: `Bearer ${token}` } },
        join: jest.fn(),
        emit: jest.fn(),
        disconnect: jest.fn(),
      } as unknown as Socket;

      gateway.handleConnection(mockClient);

      expect(mockClient.join).toHaveBeenCalledWith('user_u456b');
    });

    it('should connect when token is in query.token', () => {
      const token = jwt.sign({ sub: 'u789', email: 'u3@test.com' }, jwtSecret);
      const mockClient = {
        id: 'c4',
        handshake: { query: { token } },
        join: jest.fn(),
        emit: jest.fn(),
        disconnect: jest.fn(),
      } as unknown as Socket;

      gateway.handleConnection(mockClient);

      expect(mockClient.join).toHaveBeenCalledWith('user_u789');
    });

    it('should connect when token is in handshake headers cookie', () => {
      const token = jwt.sign({ sub: 'u-cookie-notify', email: 'cookienotify@test.com' }, jwtSecret);
      const mockClient = {
        id: 'c-cookie',
        handshake: { headers: { cookie: `accessToken=${token}; something=else` } },
        join: jest.fn(),
        emit: jest.fn(),
        disconnect: jest.fn(),
      } as unknown as Socket;

      gateway.handleConnection(mockClient);

      expect(mockClient.join).toHaveBeenCalledWith('user_u-cookie-notify');
    });

    it('should reject connection when cookie header lacks accessToken', () => {
      const mockClient = {
        id: 'c-no-token-cookie',
        handshake: { headers: { cookie: 'other=abc; session=123' } },
        join: jest.fn(),
        emit: jest.fn(),
        disconnect: jest.fn(),
      } as unknown as Socket;

      gateway.handleConnection(mockClient);

      expect(mockClient.emit).toHaveBeenCalledWith('exception', {
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'Authentication token is required' },
      });
      expect(mockClient.disconnect).toHaveBeenCalledWith(true);
    });

    it('should reject connection when token verification fails', () => {
      const mockClient = {
        id: 'c5',
        handshake: { auth: { token: 'invalid' } },
        emit: jest.fn(),
        disconnect: jest.fn(),
      } as unknown as Socket;

      gateway.handleConnection(mockClient);

      expect(mockClient.emit).toHaveBeenCalledWith('exception', {
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'Invalid or expired token' },
      });
      expect(mockClient.disconnect).toHaveBeenCalledWith(true);
    });

    it('should reject connection when JWT_SECRET is not configured', () => {
      mockConfigService.get.mockReturnValueOnce(null);
      const token = jwt.sign({ sub: 'u1' }, 'secret');
      const mockClient = {
        id: 'c6',
        handshake: { auth: { token } },
        emit: jest.fn(),
        disconnect: jest.fn(),
      } as unknown as Socket;

      gateway.handleConnection(mockClient);
      expect(mockClient.disconnect).toHaveBeenCalledWith(true);
    });
  });

  describe('handleDisconnect', () => {
    it('should handle disconnect cleanly', () => {
      const mockClient = { id: 'c-disc' } as unknown as Socket;
      expect(() => gateway.handleDisconnect(mockClient)).not.toThrow();
    });
  });

  describe('handleListNotifications', () => {
    it('should throw WsException if user is not authenticated', async () => {
      const mockClient = { data: {} } as unknown as Socket;
      await expect(gateway.handleListNotifications(mockClient)).rejects.toThrow(WsException);
    });

    it('should query notifications for user and return envelope', async () => {
      const mockClient = { data: { user: { sub: 'u123' } } } as unknown as Socket;
      const notifications = [{ id: 'n1', title: 'Test' }];
      mockNotificationClient.send.mockReturnValueOnce(of(notifications));

      const result = await gateway.handleListNotifications(mockClient);

      expect(mockNotificationClient.send).toHaveBeenCalledWith('notification.list', {
        userId: 'u123',
      });
      expect(result.success).toBe(true);
      expect(result.data).toEqual(notifications);
    });
  });

  describe('handleMarkAsRead', () => {
    it('should throw WsException when userId or notification id is missing', async () => {
      const mockClient = { data: {} } as unknown as Socket;
      await expect(gateway.handleMarkAsRead(mockClient, { id: 'n1' })).rejects.toThrow(WsException);

      const authedClient = { data: { user: { sub: 'u1' } } } as unknown as Socket;
      await expect(gateway.handleMarkAsRead(authedClient, { id: '' })).rejects.toThrow(WsException);
    });

    it('should mark notification as read and return updated document', async () => {
      const mockClient = { data: { user: { sub: 'u123' } } } as unknown as Socket;
      const updated = { id: 'n1', isRead: true };
      mockNotificationClient.send.mockReturnValueOnce(of(updated));

      const result = await gateway.handleMarkAsRead(mockClient, { id: 'n1' });

      expect(mockNotificationClient.send).toHaveBeenCalledWith('notification.markAsRead', {
        id: 'n1',
        userId: 'u123',
      });
      expect(result.success).toBe(true);
      expect(result.data).toEqual(updated);
    });
  });

  describe('handleBroadcast & checkAdmin', () => {
    it('should throw UNAUTHORIZED if client has no user in checkAdmin', async () => {
      const mockClient = { data: {} } as unknown as Socket;
      await expect(
        gateway.handleBroadcast(mockClient, { title: 'T', message: 'M' }),
      ).rejects.toThrow(WsException);
    });

    it('should throw FORBIDDEN if user is not an admin', async () => {
      const mockClient = { data: { user: { sub: 'u1', role: 'user' } } } as unknown as Socket;
      await expect(
        gateway.handleBroadcast(mockClient, { title: 'T', message: 'M' }),
      ).rejects.toThrow(WsException);
    });

    it('should throw FORBIDDEN if user has no role or roles property', async () => {
      const mockClient = { data: { user: { sub: 'u1' } } } as unknown as Socket;
      await expect(
        gateway.handleBroadcast(mockClient, { title: 'T', message: 'M' }),
      ).rejects.toThrow(WsException);
    });

    it('should broadcast globally when recipientId is omitted', async () => {
      const mockClient = {
        data: { user: { sub: 'a1', roles: ['admin'] } },
      } as unknown as Socket;
      const notifResponse = { id: 'b1', title: 'Global', message: 'Everyone' };
      mockNotificationClient.send.mockReturnValueOnce(of(notifResponse));

      const broadcastDto = { title: 'Global', message: 'Everyone' };
      const result = await gateway.handleBroadcast(mockClient, broadcastDto);

      expect(mockNotificationClient.send).toHaveBeenCalledWith(
        'notification.broadcast',
        broadcastDto,
      );
      expect(mockServer.emit).toHaveBeenCalledWith('notification:broadcast', notifResponse);
      expect(result.success).toBe(true);
      expect(result.data).toEqual(notifResponse);
    });

    it('should emit to user personal room when recipientId is specified', async () => {
      const mockClient = {
        data: { user: { sub: 'a2', roles: 'super_admin' } },
      } as unknown as Socket;
      const notifResponse = { id: 'b2', title: 'Targeted', message: 'Hi User 99' };
      mockNotificationClient.send.mockReturnValueOnce(of(notifResponse));

      const broadcastDto = { title: 'Targeted', message: 'Hi User 99', recipientId: 'user-99' };
      const result = await gateway.handleBroadcast(mockClient, broadcastDto);

      expect(mockServer.to).toHaveBeenCalledWith('user_user-99');
      expect(mockToEmit).toHaveBeenCalledWith('notification:new', notifResponse);
      expect(result.success).toBe(true);
    });
  });
});
