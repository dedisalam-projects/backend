import { Test, TestingModule } from '@nestjs/testing';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PinoLogger } from 'nestjs-pino';
import { RmqContext } from '@nestjs/microservices';
import { getModelToken } from '@nestjs/mongoose';
import { Notification, NotificationDocument } from '@dedisalam/database';

describe('AppController', () => {
  let app: TestingModule;
  let mockPinoLogger: Partial<PinoLogger>;
  let appService: AppService;

  beforeAll(async () => {
    mockPinoLogger = {
      assign: jest.fn(),
    };

    const mockGatewayClient = {
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

    appService = app.get<AppService>(AppService);
  });

  describe('handleUserCreated', () => {
    it('should process notification, log user creation, and emit gateway.notify.user to Gateway', async () => {
      const appController = app.get<AppController>(AppController);
      const mockGatewayClient = app.get('GATEWAY_SERVICE');
      const spyProcess = jest.spyOn(appService, 'processNotification');

      await appController.handleUserCreated({ userId: 'u1', name: 'John Doe' });

      expect(spyProcess).toHaveBeenCalledWith(
        'Welcome to our platform, John Doe!',
        'u1',
        'WELCOME',
      );
      expect(mockGatewayClient.emit).toHaveBeenCalledWith('gateway.notify.user', {
        message: 'Notification processed: Welcome to our platform, John Doe!',
        correlationId: 'system',
      });
    });
  });
});
