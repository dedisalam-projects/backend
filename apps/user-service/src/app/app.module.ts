import { Module, OnModuleDestroy, Inject } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { LoggerModule } from 'nestjs-pino';
import { TerminusModule } from '@nestjs/terminus';
import { ClientsModule, Transport } from '@nestjs/microservices';
import Redis from 'ioredis';

import { AppController } from './app.controller';
import { AppService } from './app.service';
import { HealthController } from '../health/health.controller';
import { validate } from '../config/user-service.config';
import { User, UserSchema } from '../schemas/user.schema';
import { vaultLoader } from '@dedisalam/common';
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
        customProps: () => ({ service: 'user-service' }),
      },
    }),
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        uri: configService.get<string>('USER_SERVICE_MONGO_URI'),
      }),
      inject: [ConfigService],
    }),
    MongooseModule.forFeature([{ name: User.name, schema: UserSchema }]),
    ClientsModule.registerAsync([
      {
        name: 'NOTIFICATION_SERVICE_RMQ',
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
    TerminusModule,
  ],
  controllers: [AppController, HealthController],
  providers: [
    AppService,
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
