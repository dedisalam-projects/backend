import { Controller, Get, Inject } from '@nestjs/common';
import { HealthCheckService, HealthCheck } from '@nestjs/terminus';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { Public } from '@dedisalam/common';
import Redis from 'ioredis';

@ApiTags('Health')
@Controller('health')
export class HealthController {
  constructor(
    private health: HealthCheckService,
    @Inject('REDIS_CLIENT') private readonly redis: Redis,
  ) {}

  @Get()
  @HealthCheck()
  @Public()
  @ApiOperation({ summary: 'Check health status of API Gateway and its services' })
  check() {
    return this.health.check([
      () => ({ gateway: { status: 'up' } }),
      async () => {
        try {
          const status = await this.redis.ping();
          return { redis: { status: status === 'PONG' ? 'up' : 'down' } };
        } catch (err: unknown) {
          const message = err instanceof Error ? err.message : String(err);
          return { redis: { status: 'down', message } };
        }
      },
    ]);
  }
}
