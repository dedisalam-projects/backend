import { Test } from '@nestjs/testing';
import { AppService } from './app.service';
import { getModelToken } from '@nestjs/mongoose';
import { Notification } from '@dedisalam/database';

describe('AppService', () => {
  let service: AppService;

  const mockSave = jest.fn().mockImplementation(function (this: any) {
    return Promise.resolve(this);
  });

  const mockExec = jest.fn();
  const mockSort = jest.fn().mockReturnValue({ exec: mockExec });
  const mockFind = jest.fn().mockReturnValue({ sort: mockSort });
  const mockFindOneAndUpdate = jest.fn();

  // Mock constructor for new this.notificationModel(...)
  const mockNotificationModel: any = jest.fn().mockImplementation((dto) => {
    return {
      ...dto,
      save: mockSave,
    };
  });
  mockNotificationModel.find = mockFind;
  mockNotificationModel.findOneAndUpdate = mockFindOneAndUpdate;

  beforeAll(async () => {
    const app = await Test.createTestingModule({
      providers: [
        AppService,
        {
          provide: getModelToken(Notification.name),
          useValue: mockNotificationModel,
        },
      ],
    }).compile();

    service = app.get<AppService>(AppService);
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('processNotification', () => {
    it('should process and return the saved notification with provided arguments', async () => {
      const result = await service.processNotification('Payment Received', 'user-123', 'BILLING');
      expect(result).toBeDefined();
      expect(result.message).toBe('Payment Received');
      expect(result.userId).toBe('user-123');
      expect(result.title).toBe('BILLING');
      expect(result.type).toBe('BILLING');
      expect(result.isRead).toBe(false);
      expect(mockSave).toHaveBeenCalled();
    });

    it('should fall back to defaults when arguments are omitted', async () => {
      const result = await service.processNotification();
      expect(result).toBeDefined();
      expect(result.message).toBe('Hello World Notification');
      expect(result.userId).toBe('system-user-id');
      expect(result.title).toBe('System Alert');
      expect(result.type).toBe('INFO');
      expect(result.isRead).toBe(false);
      expect(mockSave).toHaveBeenCalled();
    });
  });

  describe('getNotifications', () => {
    it('should query notifications for the given userId sorted by createdAt desc', async () => {
      const mockList = [
        { _id: 'notif-1', title: 'Test 1', userId: 'user-123' },
        { _id: 'notif-2', title: 'Test 2', userId: 'user-123' },
      ];
      mockExec.mockResolvedValueOnce(mockList);

      const result = await service.getNotifications('user-123');
      expect(mockFind).toHaveBeenCalledWith({ userId: 'user-123' });
      expect(mockSort).toHaveBeenCalledWith({ createdAt: -1 });
      expect(result).toEqual(mockList);
    });
  });

  describe('markAsRead', () => {
    it('should update notification isRead flag and return updated document', async () => {
      const updatedNotif = { _id: 'notif-1', userId: 'user-123', isRead: true };
      mockFindOneAndUpdate.mockResolvedValueOnce(updatedNotif);

      const result = await service.markAsRead('notif-1', 'user-123');
      expect(mockFindOneAndUpdate).toHaveBeenCalledWith(
        { _id: 'notif-1', userId: 'user-123' },
        { isRead: true },
        { new: true },
      );
      expect(result).toEqual(updatedNotif);
    });

    it('should return null when notification is not found', async () => {
      mockFindOneAndUpdate.mockResolvedValueOnce(null);

      const result = await service.markAsRead('notif-missing', 'user-123');
      expect(result).toBeNull();
    });
  });

  describe('broadcastNotification', () => {
    it('should create and save broadcast notification with recipientId and custom type', async () => {
      const dto = {
        title: 'System Maintenance',
        message: 'Server restarting in 5m',
        type: 'WARNING',
        recipientId: 'user-999',
      };

      const result = await service.broadcastNotification(dto);
      expect(result).toBeDefined();
      expect(result.title).toBe('System Maintenance');
      expect(result.message).toBe('Server restarting in 5m');
      expect(result.userId).toBe('user-999');
      expect(result.type).toBe('WARNING');
      expect(result.isRead).toBe(false);
      expect(mockSave).toHaveBeenCalled();
    });

    it('should default recipientId to "broadcast" and type to "INFO" if omitted', async () => {
      const dto = {
        title: 'Global Announcement',
        message: 'Welcome everyone',
      };

      const result = await service.broadcastNotification(dto);
      expect(result).toBeDefined();
      expect(result.title).toBe('Global Announcement');
      expect(result.message).toBe('Welcome everyone');
      expect(result.userId).toBe('broadcast');
      expect(result.type).toBe('INFO');
      expect(result.isRead).toBe(false);
      expect(mockSave).toHaveBeenCalled();
    });
  });
});
