import { Test, TestingModule } from '@nestjs/testing';
import { HealthController } from './health.controller';
import { HealthCheckService, MongooseHealthIndicator } from '@nestjs/terminus';
import { RedisService } from '@dedisalam/database';

interface HealthCheckResult {
  status: string;
  info: {
    mongodb?: { status: string };
    redis: { status: string; message?: string };
  };
}

describe('HealthController', () => {
  let controller: HealthController;
  let healthCheckService: { check: jest.Mock };
  let dbIndicator: { pingCheck: jest.Mock };
  let redisService: { getClient: jest.Mock };
  let mockRedisPing: jest.Mock;

  beforeEach(async () => {
    healthCheckService = {
      check: jest.fn().mockImplementation(async (indicators: Array<() => unknown>) => {
        const results = await Promise.all(indicators.map((fn) => fn()));
        return { status: 'ok', info: Object.assign({}, ...results) };
      }),
    };
    dbIndicator = {
      pingCheck: jest.fn().mockResolvedValue({ mongodb: { status: 'up' } }),
    };
    mockRedisPing = jest.fn().mockResolvedValue('PONG');
    redisService = {
      getClient: jest.fn().mockReturnValue({ ping: mockRedisPing }),
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

  it('should return healthy status when mongodb and redis are up', async () => {
    const result = (await controller.check()) as unknown as HealthCheckResult;

    expect(dbIndicator.pingCheck).toHaveBeenCalledWith('mongodb');
    expect(mockRedisPing).toHaveBeenCalled();
    expect(result.info.redis.status).toBe('up');
  });

  it('should return redis down when ping response is not PONG', async () => {
    mockRedisPing.mockResolvedValueOnce('UNKNOWN');
    const result = (await controller.check()) as unknown as HealthCheckResult;

    expect(result.info.redis.status).toBe('down');
  });

  it('should catch redis client error and return down status with error message', async () => {
    mockRedisPing.mockRejectedValueOnce(new Error('Connection timeout'));
    const result = (await controller.check()) as unknown as HealthCheckResult;

    expect(result.info.redis.status).toBe('down');
    expect(result.info.redis.message).toBe('Connection timeout');
  });
});
