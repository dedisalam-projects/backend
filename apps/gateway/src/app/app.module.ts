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
          transport: Transport.TCP,
          options: {
            host: configService.get<string>('USER_SERVICE_TCP_HOST') || '127.0.0.1',
            port: configService.get<number>('USER_SERVICE_TCP_PORT') || 4001,
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
  controllers: [AppController, HealthController],
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
