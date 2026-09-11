import { Test, TestingModule } from '@nestjs/testing';
import { HealthController } from './health.controller';
import {
  HealthCheckService,
  MongooseHealthIndicator,
  MicroserviceHealthIndicator,
} from '@nestjs/terminus';
import { ConfigService } from '@nestjs/config';
import { Transport } from '@nestjs/microservices';

describe('HealthController', () => {
  let controller: HealthController;
  let healthCheckService: { check: jest.Mock };
  let dbIndicator: { pingCheck: jest.Mock };
  let rmqIndicator: { pingCheck: jest.Mock };
  let configService: { get: jest.Mock };

  beforeEach(async () => {
    healthCheckService = {
      check: jest.fn().mockImplementation(async (indicators: any[]) => {
        const results = await Promise.all(indicators.map((fn) => fn()));
        return { status: 'ok', info: Object.assign({}, ...results) };
      }),
    };
    dbIndicator = {
      pingCheck: jest.fn().mockResolvedValue({ mongodb: { status: 'up' } }),
    };
    rmqIndicator = {
      pingCheck: jest.fn().mockResolvedValue({ rabbitmq: { status: 'up' } }),
    };
    configService = {
      get: jest.fn().mockReturnValue('amqp://guest:guest@localhost:5672'),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [HealthController],
      providers: [
        { provide: HealthCheckService, useValue: healthCheckService },
        { provide: MongooseHealthIndicator, useValue: dbIndicator },
        { provide: MicroserviceHealthIndicator, useValue: rmqIndicator },
        { provide: ConfigService, useValue: configService },
      ],
    }).compile();

    controller = module.get<HealthController>(HealthController);
  });

  it('should execute health check indicators for mongodb and rabbitmq', async () => {
    const result = await controller.check();

    expect(configService.get).toHaveBeenCalledWith('RABBITMQ_URL');
    expect(dbIndicator.pingCheck).toHaveBeenCalledWith('mongodb');
    expect(rmqIndicator.pingCheck).toHaveBeenCalledWith('rabbitmq', {
      transport: Transport.RMQ,
      options: {
        urls: ['amqp://guest:guest@localhost:5672'],
      },
    });
    expect(result.status).toBe('ok');
  });
});
