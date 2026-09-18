import { Test, TestingModule } from '@nestjs/testing';
import { Logger } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PinoLogger } from 'nestjs-pino';
import { getModelToken } from '@nestjs/mongoose';
import { Notification } from '@dedisalam/database';

describe('AppController', () => {
  let app: TestingModule;
  let appController: AppController;
  let mockPinoLogger: Partial<PinoLogger>;
  let mockGatewayClient: { emit: jest.Mock };
  let appService: AppService;
  let loggerSpy: jest.SpyInstance;

  beforeAll(async () => {
    mockPinoLogger = {
      assign: jest.fn(),
    };

    mockGatewayClient = {
      emit: jest.fn(),
    };

    app = await Test.createTestingModule({
      controllers: [AppController],
      providers: [
        AppService,
        {
          provide: PinoLogger,
          useValue: mockPinoLogger,
        },
        {
          provide: 'GATEWAY_SERVICE',
          useValue: mockGatewayClient,
        },
        {
          provide: getModelToken(Notification.name),
          useValue: jest.fn().mockImplementation((dto) => ({
            ...dto,
            save: jest.fn().mockResolvedValue(dto),
          })),
        },
      ],
    }).compile();

    appController = app.get<AppController>(AppController);
    appService = app.get<AppService>(AppService);
    loggerSpy = jest.spyOn(Logger.prototype, 'log').mockImplementation(() => undefined);
  });

  afterAll(() => {
    loggerSpy.mockRestore();
  });

  beforeEach(() => {
    jest.clearAllMocks();
    loggerSpy.mockClear();
  });

  describe('handleNotificationSend', () => {
    it('should assign correlationId, process notification, and emit notification.push to Gateway', async () => {
      const spyProcess = jest.spyOn(appService, 'processNotification').mockResolvedValueOnce({
        title: 'Alert',
        message: 'Order Created',
        userId: 'u1',
        type: 'ORDER',
        isRead: false,
      } as unknown as Notification);

      await appController.handleNotificationSend({
        message: 'Order Created',
        userId: 'u1',
        type: 'ORDER',
        correlationId: 'cid-123',
      });

      expect(mockPinoLogger.assign).toHaveBeenCalledWith({ correlationId: 'cid-123' });
      expect(spyProcess).toHaveBeenCalledWith('Order Created', 'u1', 'ORDER');
      expect(mockGatewayClient.emit).toHaveBeenCalledWith('notification.push', {
        message: 'Notification processed: Order Created',
        correlationId: 'cid-123',
      });
    });

    it('should gracefully handle omitted payload and pinoLogger.assign failure', async () => {
      const spyProcess = jest
        .spyOn(appService, 'processNotification')
        .mockResolvedValueOnce({} as unknown as Notification);
      (mockPinoLogger.assign as jest.Mock).mockImplementationOnce(() => {
        throw new Error('Logger context not found');
      });

      await appController.handleNotificationSend(undefined as any);

      expect(spyProcess).toHaveBeenCalledWith(undefined, undefined, undefined);
      expect(mockGatewayClient.emit).toHaveBeenCalledWith('notification.push', {
        message: 'Notification processed: Hello World',
        correlationId: 'unknown',
      });
    });
  });

  describe('handleNotificationList', () => {
    it('should delegate to appService.getNotifications and return results', async () => {
      const mockList = [{ id: '1', title: 'Test' }] as unknown as Notification[];
      jest.spyOn(appService, 'getNotifications').mockResolvedValueOnce(mockList);

      const result = await appController.handleNotificationList({ userId: 'u123' });
      expect(appService.getNotifications).toHaveBeenCalledWith('u123');
      expect(result).toEqual(mockList);
    });
  });

  describe('handleUserCreated', () => {
    it('should process notification, log user creation, and emit gateway.notify.user to Gateway', async () => {
      const spyProcess = jest
        .spyOn(appService, 'processNotification')
        .mockResolvedValueOnce({} as unknown as Notification);

      await appController.handleUserCreated({ userId: 'u1', name: 'John Doe' });

      expect(loggerSpy).toHaveBeenCalledWith(`Received user.created event for u1`);
      expect(spyProcess).toHaveBeenCalledWith(
        'Welcome to our platform, John Doe!',
        'u1',
        'WELCOME',
      );
      expect(mockGatewayClient.emit).toHaveBeenCalledWith('gateway.notify.user', {
        message: 'Notification processed: Welcome to our platform, John Doe!',
        correlationId: 'system',
      });
      expect(mockGatewayClient.emit).toHaveBeenCalledWith(
        'gateway.user.created',
        expect.objectContaining({
          user: expect.objectContaining({ id: 'u1', name: 'John Doe' }),
          timestamp: expect.any(String),
        }),
      );
    });

    it('should forward rich user payload and timestamp when provided', async () => {
      const spyProcess = jest
        .spyOn(appService, 'processNotification')
        .mockResolvedValueOnce({} as unknown as Notification);

      const payload = {
        userId: 'u-rich',
        name: '',
        user: { id: 'u-rich', name: 'Rich User', email: 'r@b.com' },
        timestamp: '2026-09-13T01:00:00.000Z',
      };

      await appController.handleUserCreated(payload);

      expect(spyProcess).toHaveBeenCalledWith(
        'Welcome to our platform, Rich User!',
        'u-rich',
        'WELCOME',
      );
      expect(mockGatewayClient.emit).toHaveBeenCalledWith('gateway.user.created', {
        user: payload.user,
        timestamp: '2026-09-13T01:00:00.000Z',
      });
    });

    it('should handle missing payload data gracefully (Negative Test)', async () => {
      const spyProcess = jest
        .spyOn(appService, 'processNotification')
        .mockResolvedValueOnce({} as unknown as Notification);

      await appController.handleUserCreated(undefined as any);

      expect(spyProcess).toHaveBeenCalledWith(
        'Welcome to our platform, User!',
        undefined,
        'WELCOME',
      );
    });

    it('should throw error when processNotification throws (Negative Test)', async () => {
      jest.spyOn(appService, 'processNotification').mockRejectedValueOnce(new Error('DB Error'));

      await expect(
        appController.handleUserCreated({ userId: 'u2', name: 'Error User' }),
      ).rejects.toThrow('DB Error');
    });
  });

  describe('handleUserUpdated', () => {
    it('should forward user.updated payload to gatewayClient', async () => {
      await appController.handleUserUpdated({
        userId: 'u1',
        changes: { name: 'Jane Updated' },
        timestamp: '2026-09-13T00:00:00.000Z',
      });

      expect(loggerSpy).toHaveBeenCalledWith(`Received user.updated event for u1`);
      expect(mockGatewayClient.emit).toHaveBeenCalledWith('gateway.user.updated', {
        userId: 'u1',
        changes: { name: 'Jane Updated' },
        timestamp: '2026-09-13T00:00:00.000Z',
      });
    });

    it('should supply default timestamp and empty changes if omitted', async () => {
      await appController.handleUserUpdated({
        userId: 'u2',
      } as unknown as { userId: string; changes: Record<string, unknown> });

      expect(mockGatewayClient.emit).toHaveBeenCalledWith(
        'gateway.user.updated',
        expect.objectContaining({
          userId: 'u2',
          changes: {},
          timestamp: expect.any(String),
        }),
      );
    });

    it('should handle undefined payload gracefully', async () => {
      await appController.handleUserUpdated(undefined as any);

      expect(mockGatewayClient.emit).toHaveBeenCalledWith(
        'gateway.user.updated',
        expect.objectContaining({
          userId: undefined,
          changes: {},
          timestamp: expect.any(String),
        }),
      );
    });
  });

  describe('handleUserDeleted', () => {
    it('should forward user.deleted payload to gatewayClient', async () => {
      await appController.handleUserDeleted({
        userId: 'u1',
        timestamp: '2026-09-13T00:00:00.000Z',
      });

      expect(loggerSpy).toHaveBeenCalledWith(`Received user.deleted event for u1`);
      expect(mockGatewayClient.emit).toHaveBeenCalledWith('gateway.user.deleted', {
        userId: 'u1',
        timestamp: '2026-09-13T00:00:00.000Z',
      });
    });

    it('should supply default timestamp if omitted', async () => {
      await appController.handleUserDeleted({
        userId: 'u2',
      } as unknown as { userId: string });

      expect(mockGatewayClient.emit).toHaveBeenCalledWith(
        'gateway.user.deleted',
        expect.objectContaining({
          userId: 'u2',
          timestamp: expect.any(String),
        }),
      );
    });

    it('should handle undefined payload gracefully', async () => {
      await appController.handleUserDeleted(undefined as any);

      expect(mockGatewayClient.emit).toHaveBeenCalledWith(
        'gateway.user.deleted',
        expect.objectContaining({
          userId: undefined,
          timestamp: expect.any(String),
        }),
      );
    });
  });

  describe('handleUserLoggedIn', () => {
    it('should forward user.logged_in payload to gatewayClient', async () => {
      await appController.handleUserLoggedIn({
        userId: 'u1',
        email: 'u1@example.com',
        name: 'User 1',
      });

      expect(loggerSpy).toHaveBeenCalledWith(`Received user.logged_in event for u1@example.com`);
      expect(mockGatewayClient.emit).toHaveBeenCalledWith('user.logged_in', {
        userId: 'u1',
        email: 'u1@example.com',
        name: 'User 1',
      });
    });
  });

  describe('handleMarkAsRead', () => {
    it('should delegate to appService.markAsRead and return result', async () => {
      const mockUpdated = { id: 'notif-1', isRead: true } as unknown as Notification;
      jest.spyOn(appService, 'markAsRead').mockResolvedValueOnce(mockUpdated);

      const result = await appController.handleMarkAsRead({ id: 'notif-1', userId: 'u123' });
      expect(appService.markAsRead).toHaveBeenCalledWith('notif-1', 'u123');
      expect(result).toEqual(mockUpdated);
    });
  });

  describe('handleNotificationBroadcast', () => {
    it('should call appService.broadcastNotification and emit notification.broadcast.push to Gateway', async () => {
      const savedDoc = {
        _id: 'broadcast-id-1',
        title: 'Maintenance',
        message: 'Down in 10m',
        type: 'ALERT',
        createdAt: new Date('2026-01-01T00:00:00.000Z'),
      };
      jest
        .spyOn(appService, 'broadcastNotification')
        .mockResolvedValueOnce(savedDoc as unknown as Notification);

      const payload = {
        title: 'Maintenance',
        message: 'Down in 10m',
        type: 'ALERT',
        recipientId: 'u99',
      };

      const result = await appController.handleNotificationBroadcast(payload);

      expect(appService.broadcastNotification).toHaveBeenCalledWith(payload);
      expect(mockGatewayClient.emit).toHaveBeenCalledWith('notification.broadcast.push', {
        id: 'broadcast-id-1',
        title: 'Maintenance',
        message: 'Down in 10m',
        type: 'ALERT',
        recipientId: 'u99',
        createdAt: savedDoc.createdAt,
      });
      expect(result).toEqual(savedDoc);
    });
  });
});
