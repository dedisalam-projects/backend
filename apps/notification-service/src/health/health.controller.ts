import { Controller, Get } from '@nestjs/common';
import {
  HealthCheckService,
  HealthCheck,
  MongooseHealthIndicator,
  MicroserviceHealthIndicator,
} from '@nestjs/terminus';
import { Transport } from '@nestjs/microservices';
import { ConfigService } from '@nestjs/config';

@Controller('health')
export class HealthController {
  constructor(
    private health: HealthCheckService,
    private db: MongooseHealthIndicator,
    private rmq: MicroserviceHealthIndicator,
    private configService: ConfigService,
  ) {}

  @Get()
  @HealthCheck()
  check() {
    const rabbitmqUrl = this.configService.get<string>('RABBITMQ_URL');
    return this.health.check([
      () => this.db.pingCheck('mongodb'),
      () =>
        this.rmq.pingCheck('rabbitmq', {
          transport: Transport.RMQ,
          options: {
            urls: [rabbitmqUrl],
          },
        }),
    ]);
  }
}
