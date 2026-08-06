import { Module, OnModuleDestroy, Inject } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { LoggerModule } from 'nestjs-pino';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { TerminusModule } from '@nestjs/terminus';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { JwtModule } from '@nestjs/jwt';
import { randomUUID } from 'crypto';
import Redis from 'ioredis';

import { AppController } from './app.controller';
import { AppService } from './app.service';
import { HealthController } from '../health/health.controller';
import { validate } from '../config/gateway.config';
import { NotificationGateway } from '../notification/notification.gateway';
import { JwtAuthGuard, RolesGuard, JwtStrategy, vaultLoader } from '@dedisalam/common';
import { AuthController } from '../auth/auth.controller';
import { UserController } from '../user/user.controller';
import { NotificationController } from '../notification/notification.controller';

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
          const correlationId = req.headers['x-correlation-id'] || randomUUID();
          req.headers['x-correlation-id'] = correlationId;
          return correlationId;
        },
        customProps: (req: any) => ({
          correlationId: req.headers['x-correlation-id'],
          service: 'gateway',
        }),
      },
    }),
    ThrottlerModule.forRoot([
      {
        ttl: 60000,
        limit: 100,
      },
    ]),
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
    TerminusModule,
  ],
  controllers: [
    AppController,
    HealthController,
    AuthController,
    UserController,
    NotificationController,
  ],
  providers: [
    AppService,
    NotificationGateway,
    JwtStrategy,
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
    {
      provide: APP_GUARD,
      useClass: RolesGuard,
    },
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
