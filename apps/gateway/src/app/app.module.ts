import { Module, OnModuleDestroy, Inject } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { LoggerModule } from 'nestjs-pino';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { JwtModule } from '@nestjs/jwt';
import { randomUUID } from 'crypto';
import Redis from 'ioredis';

import { AppService } from './app.service';
import { validate } from '../config/gateway.config';
import { vaultLoader } from '@dedisalam/common';
import { AuthGateway } from '../auth/auth.gateway';
import { UserGateway } from '../user/user.gateway';
import { NotificationGateway } from '../notification/notification.gateway';
import { NotificationConsumer } from '../notification/notification.consumer';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [vaultLoader],
      validate,
      envFilePath:
        process.env.NODE_ENV === 'test'
          ? 'environments/.env.test'
          : 'environments/.env.development',
    }),
    LoggerModule.forRoot({
      pinoHttp: {
        transport:
          process.env.NODE_ENV !== 'production'
            ? { target: 'pino-pretty', options: { colorize: true } }
            : undefined,
        genReqId: (req: any) => {
          const correlationId = req?.headers?.['x-correlation-id'] || randomUUID();
          if (req?.headers) req.headers['x-correlation-id'] = correlationId;
          return correlationId;
        },
        customProps: (req: any) => ({
          correlationId: req?.headers?.['x-correlation-id'],
          service: 'gateway',
        }),
      },
    }),
    ClientsModule.registerAsync([
      {
        name: 'USER_SERVICE',
        imports: [ConfigModule],
        useFactory: (configService: ConfigService) => ({
          transport: Transport.RMQ,
          options: {
            urls: [
              configService.get<string>('RABBITMQ_URL') || 'amqp://guest:guest@localhost:5672',
            ],
            queue: 'user-service',
            queueOptions: {
              durable: true,
            },
          },
        }),
        inject: [ConfigService],
      },
      {
        name: 'NOTIFICATION_SERVICE',
        imports: [ConfigModule],
        useFactory: (configService: ConfigService) => ({
          transport: Transport.RMQ,
          options: {
            urls: [
              configService.get<string>('RABBITMQ_URL') || 'amqp://guest:guest@localhost:5672',
            ],
            queue: 'notification-service',
            queueOptions: {
              durable: true,
              arguments: {
                'x-dead-letter-exchange': 'notification-service.dlx',
                'x-dead-letter-routing-key': 'notification-service.dlq',
              },
            },
          },
        }),
        inject: [ConfigService],
      },
    ]),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET'),
        signOptions: { expiresIn: (configService.get<string>('JWT_EXPIRES_IN') || '15m') as any },
      }),
      inject: [ConfigService],
    }),
  ],
  controllers: [NotificationConsumer],
  providers: [
    AppService,
    AuthGateway,
    UserGateway,
    NotificationGateway,
    {
      provide: 'REDIS_CLIENT',
      useFactory: (configService: ConfigService) => {
        return new Redis(configService.get<string>('REDIS_URL') || 'redis://localhost:6379');
      },
      inject: [ConfigService],
    },
  ],
})
export class AppModule implements OnModuleDestroy {
  constructor(@Inject('REDIS_CLIENT') private readonly redis: Redis) {}

  onModuleDestroy() {
    this.redis.disconnect();
  }
}
