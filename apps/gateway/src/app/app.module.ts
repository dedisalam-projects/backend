import { Module, OnModuleDestroy, Inject } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { LoggerModule } from 'nestjs-pino';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { JwtModule } from '@nestjs/jwt';
import { randomUUID } from 'crypto';
import Redis from 'ioredis';

import { IncomingMessage } from 'http';

import { AppService } from './app.service';
import { validate } from '../config/gateway.config';
import { vaultLoader, JwtStrategy } from '@dedisalam/common';
import { AuthController } from '../auth/auth.controller';
import { UserController } from '../user/user.controller';
import { UserGateway } from '../user/user.gateway';
import { NotificationGateway } from '../notification/notification.gateway';
import { NotificationConsumer } from '../notification/notification.consumer';
import { PassportModule } from '@nestjs/passport';

import type { SignOptions } from 'jsonwebtoken';

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
        genReqId: (req: IncomingMessage) => {
          const rawId = req.headers['x-correlation-id'];
          const correlationId = (Array.isArray(rawId) ? rawId[0] : rawId) || randomUUID();
          req.headers['x-correlation-id'] = correlationId;
          return correlationId;
        },
        customProps: (req: IncomingMessage) => ({
          correlationId: req.headers['x-correlation-id'],
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
        signOptions: {
          expiresIn: (configService.get<string>('JWT_EXPIRES_IN') ||
            '15m') as SignOptions['expiresIn'],
        },
      }),
      inject: [ConfigService],
    }),
    PassportModule.register({ defaultStrategy: 'jwt' }),
  ],
  controllers: [NotificationConsumer, AuthController, UserController],
  providers: [
    AppService,
    UserGateway,
    NotificationGateway,
    JwtStrategy,
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
