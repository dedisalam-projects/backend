import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { TerminusModule } from '@nestjs/terminus';
import { ClientsModule, Transport } from '@nestjs/microservices';

import { AppController } from './app.controller';
import { AppService } from './app.service';
import { HealthController } from '../health/health.controller';
import { validate } from '../config/user-service.config';
import { User, UserSchema, RedisModule, createMongooseOptions } from '@dedisalam/database';
import { AuthController } from '../auth/auth.controller';
import { AuthService } from '../auth/auth.service';
import {
  createMicroserviceConfigModule,
  createMicroserviceLoggerModule,
  createRmqClient,
} from '@dedisalam/common';

@Module({
  imports: [
    createMicroserviceConfigModule(validate),
    createMicroserviceLoggerModule('user-service'),
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: createMongooseOptions('user_db'),
      inject: [ConfigService],
    }),
    MongooseModule.forFeature([{ name: User.name, schema: UserSchema }]),
    RedisModule,
    ClientsModule.registerAsync([
      createRmqClient('NOTIFICATION_SERVICE_RMQ', 'notification-service', {
        arguments: {
          'x-dead-letter-exchange': 'notification-service.dlx',
          'x-dead-letter-routing-key': 'notification-service.dlq',
        },
      }),
    ]),
    TerminusModule,
  ],
  controllers: [AppController, HealthController, AuthController],
  providers: [AppService, AuthService],
})
export class AppModule {}
