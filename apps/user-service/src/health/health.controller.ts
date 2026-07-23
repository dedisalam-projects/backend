import { Controller, Get, Inject } from '@nestjs/common';
import { HealthCheckService, HealthCheck, MongooseHealthIndicator } from '@nestjs/terminus';
import Redis from 'ioredis';

@Controller('health')
export class HealthController {
  constructor(
    private health: HealthCheckService,
    private db: MongooseHealthIndicator,
    @Inject('REDIS_CLIENT') private readonly redis: Redis,
  ) {}

  @Get()
  @HealthCheck()
  check() {
    return this.health.check([
      () => this.db.pingCheck('mongodb'),
      async () => {
        try {
          const status = await this.redis.ping();
          return { redis: { status: status === 'PONG' ? 'up' : 'down' } };
        } catch (err: any) {
          return { redis: { status: 'down', message: err.message } };
        }
      },
    ]);
  }
}
