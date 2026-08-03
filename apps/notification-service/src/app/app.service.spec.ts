import { Test } from '@nestjs/testing';
import { AppService } from './app.service';
import { getModelToken } from '@nestjs/mongoose';
import { Notification, NotificationDocument } from '@dedisalam/database';

describe('AppService', () => {
  let service: AppService;

  const mockNotificationModel = jest.fn().mockImplementation((dto) => ({
    ...dto,
    save: jest.fn().mockResolvedValue({
      title: dto.title || 'Hello World Event',
      message: dto.message || 'Hello World Notification',
      userId: dto.userId || 'system-user-id',
      read: dto.read || false,
    }),
  }));

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

  describe('processNotification', () => {
    it('should process and return the saved notification', async () => {
      const result = await service.processNotification('Hello');
      expect(result).toBeDefined();
      expect(result.message).toBe('Hello');
      expect(result.title).toBe('Hello World Event');
    });
  });
});
