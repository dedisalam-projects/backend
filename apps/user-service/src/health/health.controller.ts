import { Controller, Get } from '@nestjs/common';
import { HealthCheckService, HealthCheck, MongooseHealthIndicator } from '@nestjs/terminus';
import { RedisService } from '@dedisalam/database';

@Controller('health')
export class HealthController {
  constructor(
    private health: HealthCheckService,
    private db: MongooseHealthIndicator,
    private readonly redisService: RedisService,
  ) {}

  @Get()
  @HealthCheck()
  check() {
    return this.health.check([
      () => this.db.pingCheck('mongodb'),
      async () => {
        try {
          const status = await this.redisService.getClient().ping();
          return { redis: { status: status === 'PONG' ? 'up' : 'down' } };
        } catch (err: unknown) {
          const message = err instanceof Error ? err.message : String(err);
          return { redis: { status: 'down', message } };
        }
      },
    ]);
  }
}
