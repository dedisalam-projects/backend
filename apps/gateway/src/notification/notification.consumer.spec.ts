import { Test, TestingModule } from '@nestjs/testing';
import { NotificationConsumer } from './notification.consumer';
import { NotificationGateway } from './notification.gateway';

describe('NotificationConsumer', () => {
  let consumer: NotificationConsumer;
  let mockNotificationGateway: any;
  let mockToEmit: jest.Mock;

  beforeEach(async () => {
    mockToEmit = jest.fn();
    mockNotificationGateway = {
      server: {
        emit: jest.fn(),
        to: jest.fn().mockReturnValue({
          emit: mockToEmit,
        }),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [NotificationConsumer],
      providers: [
        {
          provide: NotificationGateway,
          useValue: mockNotificationGateway,
        },
      ],
    }).compile();

    consumer = module.get<NotificationConsumer>(NotificationConsumer);
  });

  describe('handleNotificationPush', () => {
    it('should emit a hello event to websocket and return success', () => {
      const payload = { message: 'Test message', correlationId: '123' };
      const response = consumer.handleNotificationPush(payload);

      expect(response).toEqual({ status: 'success' });
      expect(mockNotificationGateway.server.emit).toHaveBeenCalledWith('hello', {
        message: 'Test message',
        correlationId: '123',
      });
    });

    it('should handle missing payload gracefully (Negative Test)', () => {
      const payload = {} as any;
      const response = consumer.handleNotificationPush(payload);

      expect(response).toEqual({ status: 'success' });
      expect(mockNotificationGateway.server.emit).toHaveBeenCalledWith('hello', {
        message: 'New notification',
        correlationId: 'unknown',
      });
    });

    it('should handle null server gracefully', () => {
      mockNotificationGateway.server = null;
      const response = consumer.handleNotificationPush({ message: 'Hi' });
      expect(response).toEqual({ status: 'success' });
    });
  });

  describe('handleUserLoggedIn', () => {
    it('should emit login_event to clients', () => {
      consumer.handleUserLoggedIn({ email: 'test@example.com' });
      expect(mockNotificationGateway.server.emit).toHaveBeenCalledWith('login_event', {
        email: 'test@example.com',
      });
    });

    it('should handle null server gracefully', () => {
      mockNotificationGateway.server = null;
      expect(() => consumer.handleUserLoggedIn({ email: 'test@example.com' })).not.toThrow();
    });
  });

  describe('handleUserCreated', () => {
    it('should emit user_created to clients', () => {
      const payload = {
        user: {
          id: 'u1',
          name: 'John Doe',
          email: 'john@example.com',
          role: 'user',
          isActive: true,
        },
        timestamp: '2026-09-13T00:00:00.000Z',
      };
      consumer.handleUserCreated(payload);
      expect(mockNotificationGateway.server.emit).toHaveBeenCalledWith('user_created', payload);
    });

    it('should handle null server gracefully', () => {
      mockNotificationGateway.server = null;
      expect(() => consumer.handleUserCreated({ user: { id: 'u1' } })).not.toThrow();
    });
  });

  describe('handleUserUpdated', () => {
    it('should emit user_updated to clients', () => {
      const payload = {
        userId: 'u1',
        changes: { name: 'Jane Updated', role: 'admin' },
        timestamp: '2026-09-13T00:00:00.000Z',
      };
      consumer.handleUserUpdated(payload);
      expect(mockNotificationGateway.server.emit).toHaveBeenCalledWith('user_updated', payload);
    });

    it('should handle null server gracefully', () => {
      mockNotificationGateway.server = null;
      expect(() => consumer.handleUserUpdated({ userId: 'u1' })).not.toThrow();
    });
  });

  describe('handleUserDeleted', () => {
    it('should emit user_deleted to clients', () => {
      const payload = {
        userId: 'u1',
        timestamp: '2026-09-13T00:00:00.000Z',
      };
      consumer.handleUserDeleted(payload);
      expect(mockNotificationGateway.server.emit).toHaveBeenCalledWith('user_deleted', payload);
    });

    it('should handle null server gracefully', () => {
      mockNotificationGateway.server = null;
      expect(() => consumer.handleUserDeleted({ userId: 'u1' })).not.toThrow();
    });
  });

  describe('handleNotifyUser', () => {
    it('should emit to personal user room when userId is provided', () => {
      consumer.handleNotifyUser({ userId: 'u123', message: 'Hello user' });
      expect(mockNotificationGateway.server.to).toHaveBeenCalledWith('user_u123');
      expect(mockToEmit).toHaveBeenCalledWith('notification:new', {
        userId: 'u123',
        message: 'Hello user',
      });
    });

    it('should broadcast to all when userId is omitted', () => {
      consumer.handleNotifyUser({ message: 'Hello all' });
      expect(mockNotificationGateway.server.emit).toHaveBeenCalledWith('notification:new', {
        message: 'Hello all',
      });
    });

    it('should handle null server gracefully', () => {
      mockNotificationGateway.server = null;
      expect(() => consumer.handleNotifyUser({ userId: 'u1' })).not.toThrow();
    });
  });

  describe('handleBroadcastPush', () => {
    it('should broadcast notification when no recipientId', () => {
      consumer.handleBroadcastPush({ title: 'Alert', message: 'Hello' });
      expect(mockNotificationGateway.server.emit).toHaveBeenCalledWith('notification:broadcast', {
        title: 'Alert',
        message: 'Hello',
      });
    });

    it('should emit to targeted recipient room when recipientId is provided', () => {
      consumer.handleBroadcastPush({ recipientId: 'r-456', title: 'Private Alert', message: 'Hi' });
      expect(mockNotificationGateway.server.to).toHaveBeenCalledWith('user_r-456');
      expect(mockToEmit).toHaveBeenCalledWith('notification:new', {
        recipientId: 'r-456',
        title: 'Private Alert',
        message: 'Hi',
      });
    });

    it('should handle null server gracefully', () => {
      mockNotificationGateway.server = null;
      expect(() => consumer.handleBroadcastPush({ title: 'Alert' })).not.toThrow();
    });
  });
});
