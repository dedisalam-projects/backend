import { Test, TestingModule } from '@nestjs/testing';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PinoLogger } from 'nestjs-pino';
import { TcpContext } from '@nestjs/microservices';
import { getConnectionToken } from '@nestjs/mongoose';
import { RedisService } from '@dedisalam/database';

describe('AppController', () => {
  let app: TestingModule;
  let mockPinoLogger: Partial<PinoLogger>;
  let mockRmqClient: { emit: jest.Mock };
  let mockRedisClient: { set: jest.Mock; get: jest.Mock };
  let mockConnection: {
    readyState: number;
    db?: {
      admin: () => {
        ping: jest.Mock;
      };
    };
  };

  beforeEach(async () => {
    mockPinoLogger = {
      assign: jest.fn(),
    };

    mockRmqClient = {
      emit: jest.fn(),
    };

    mockRedisClient = {
      set: jest.fn().mockResolvedValue('OK'),
      get: jest.fn().mockResolvedValue('hello_redis'),
    };

    mockConnection = {
      readyState: 1,
      db: {
        admin: () => ({
          ping: jest.fn().mockResolvedValue({ ok: 1 }),
        }),
      },
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
          provide: 'NOTIFICATION_SERVICE_RMQ',
          useValue: mockRmqClient,
        },
        {
          provide: RedisService,
          useValue: mockRedisClient,
        },
        {
          provide: getConnectionToken(),
          useValue: mockConnection,
        },
      ],
    }).compile();
  });

  describe('hello', () => {
    it('should return hello message and correlation ID', async () => {
      const appController = app.get<AppController>(AppController);
      const mockContext = {} as TcpContext;
      const result = await appController.hello(
        { name: 'Nest', correlationId: 'test-123' },
        mockContext,
      );

      expect(result).toEqual({
        message: 'Hello Nest from User Service',
        correlationId: 'test-123',
      });
      expect(mockPinoLogger.assign).toHaveBeenCalledWith({ correlationId: 'test-123' });
    });

    it('should handle missing payload properties gracefully (Negative Test)', async () => {
      const appController = app.get<AppController>(AppController);
      const mockContext = {} as TcpContext;
      const result = await appController.hello({}, mockContext);

      expect(result).toEqual({
        message: 'Hello World from User Service',
        correlationId: 'unknown',
      });
    });

    it('should catch error when pinoLogger.assign throws', async () => {
      (mockPinoLogger.assign as jest.Mock).mockImplementationOnce(() => {
        throw new Error('Logger context failed');
      });

      const appController = app.get<AppController>(AppController);
      const mockContext = {} as TcpContext;
      const result = await appController.hello(
        { name: 'Alice', correlationId: 'cid-err' },
        mockContext,
      );

      expect(result).toEqual({
        message: 'Hello Alice from User Service',
        correlationId: 'cid-err',
      });
    });

    it('should handle Redis test failure gracefully (Negative Test)', async () => {
      mockRedisClient.set.mockRejectedValueOnce(new Error('Redis Connection Refused'));

      const appController = app.get<AppController>(AppController);
      const mockContext = {} as TcpContext;
      const result = await appController.hello(
        { name: 'Bob', correlationId: 'redis-fail' },
        mockContext,
      );

      expect(result).toEqual({
        message: 'Hello Bob from User Service',
        correlationId: 'redis-fail',
      });
    });

    it('should handle MongoDB not connected (readyState !== 1) gracefully (Negative Test)', async () => {
      mockConnection.readyState = 0;

      const appController = app.get<AppController>(AppController);
      const mockContext = {} as TcpContext;
      const result = await appController.hello(
        { name: 'Charlie', correlationId: 'mongo-fail' },
        mockContext,
      );

      expect(result).toEqual({
        message: 'Hello Charlie from User Service',
        correlationId: 'mongo-fail',
      });
    });
  });

  describe('handleTestEvent', () => {
    it('should emit RabbitMQ test.hello event and return success status', async () => {
      const appController = app.get<AppController>(AppController);
      const payload = { message: 'Hello RMQ', correlationId: 'test-corr-456' };
      const response = await appController.handleTestEvent(payload);

      expect(response).toEqual({ status: 'event_published' });
      expect(mockRmqClient.emit).toHaveBeenCalledWith('test.hello', {
        message: 'Hello RMQ',
        correlationId: 'test-corr-456',
      });
    });

    it('should handle omitted message and correlationId with defaults', async () => {
      const appController = app.get<AppController>(AppController);
      const response = await appController.handleTestEvent({});

      expect(response).toEqual({ status: 'event_published' });
      expect(mockRmqClient.emit).toHaveBeenCalledWith('test.hello', {
        message: 'Hello from User Service via RabbitMQ!',
        correlationId: 'unknown',
      });
    });
  });
});
