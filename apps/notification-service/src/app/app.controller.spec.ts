import { Test, TestingModule } from '@nestjs/testing';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PinoLogger } from 'nestjs-pino';
import { RmqContext } from '@nestjs/microservices';
import { getModelToken } from '@nestjs/mongoose';
import { Notification } from '../schemas/notification.schema';

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

  describe('handleTestHello', () => {
    it('should process notification, log correlation ID, and emit notification.push to Gateway', async () => {
      const appController = app.get<AppController>(AppController);
      const mockContext = {} as RmqContext;
      const mockGatewayClient = app.get('GATEWAY_SERVICE');

      const spyProcess = jest.spyOn(appService, 'processNotification');

      await appController.handleTestHello({ message: 'Test message', correlationId: 'notif-123' });

      expect(spyProcess).toHaveBeenCalledWith('Test message');
      expect(mockPinoLogger.assign).toHaveBeenCalledWith({ correlationId: 'notif-123' });
      expect(mockGatewayClient.emit).toHaveBeenCalledWith('notification.push', {
        message: 'Notification processed: Test message',
        correlationId: 'notif-123',
      });
    });
  });
});
