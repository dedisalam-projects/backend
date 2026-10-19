import { Test, TestingModule } from '@nestjs/testing';
import { HealthController } from './health.controller';
import { HealthCheckService, MongooseHealthIndicator } from '@nestjs/terminus';
import { RedisService } from '@dedisalam/database';

describe('HealthController (auth-service)', () => {
  let controller: HealthController;
  let healthCheckService: { check: jest.Mock };
  let dbIndicator: { pingCheck: jest.Mock };
  let redisService: { pingCheck: jest.Mock };

  beforeEach(async () => {
    healthCheckService = {
      check: jest.fn().mockImplementation(async (indicators: Array<() => unknown>) => {
        const results = await Promise.all(indicators.map((fn) => fn()));
        return { status: 'ok', info: Object.assign({}, ...results) };
      }),
    };
    dbIndicator = {
      pingCheck: jest.fn().mockResolvedValue({ auth_mongodb: { status: 'up' } }),
    };
    redisService = {
      pingCheck: jest.fn().mockResolvedValue({ redis: { status: 'up' } }),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [HealthController],
      providers: [
        { provide: HealthCheckService, useValue: healthCheckService },
        { provide: MongooseHealthIndicator, useValue: dbIndicator },
        { provide: RedisService, useValue: redisService },
      ],
    }).compile();

    controller = module.get<HealthController>(HealthController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('should return health check result', async () => {
    const res = await controller.check();
    expect(healthCheckService.check).toHaveBeenCalled();
    expect(dbIndicator.pingCheck).toHaveBeenCalledWith('auth_mongodb');
    expect(redisService.pingCheck).toHaveBeenCalled();
    expect(res).toEqual({
      status: 'ok',
      info: {
        auth_mongodb: { status: 'up' },
        redis: { status: 'up' },
      },
    });
  });
});
