import { Test, TestingModule } from '@nestjs/testing';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { NotificationGateway } from '../notification/notification.gateway';

describe('AppController', () => {
  let app: TestingModule;
  let mockAppService: Partial<AppService>;
  let mockNotificationGateway: any;

  beforeAll(async () => {
    mockAppService = {
      getHello: jest.fn().mockResolvedValue({
        message: 'Hello World',
        services: { user: 'ok' },
      }),
    };

    mockNotificationGateway = {
      server: {
        emit: jest.fn(),
      },
    };

    app = await Test.createTestingModule({
      controllers: [AppController],
      providers: [
        {
          provide: AppService,
          useValue: mockAppService,
        },
        {
          provide: NotificationGateway,
          useValue: mockNotificationGateway,
        },
      ],
    }).compile();
  });

  describe('getHello', () => {
    it('should return hello message with status', async () => {
      const appController = app.get<AppController>(AppController);
      expect(await appController.getHello()).toEqual({
        message: 'Hello World',
        services: { user: 'ok' },
      });
      expect(mockAppService.getHello).toHaveBeenCalled();
    });
  });

  describe('handleNotificationPush', () => {
    it('should emit a hello event to websocket and return success', async () => {
      const appController = app.get<AppController>(AppController);
      const payload = { message: 'Test message', correlationId: '123' };
      const response = await appController.handleNotificationPush(payload);

      expect(response).toEqual({ status: 'success' });
      expect(mockNotificationGateway.server.emit).toHaveBeenCalledWith('hello', {
        message: 'Test message',
        correlationId: '123',
      });
    });
  });
});
