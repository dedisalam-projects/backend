import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { TerminusModule } from '@nestjs/terminus';
import { ClientsModule } from '@nestjs/microservices';

import { AppController } from './app.controller';
import { AppService } from './app.service';
import { HealthController } from '../health/health.controller';
import { validate } from '../config/notification-service.config';
import { Notification, NotificationSchema, createMongooseOptions } from '@dedisalam/database';
import {
  createMicroserviceConfigModule,
  createMicroserviceLoggerModule,
  createRmqClient,
} from '@dedisalam/common';

@Module({
  imports: [
    createMicroserviceConfigModule(validate),
    createMicroserviceLoggerModule('notification-service'),
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: createMongooseOptions('notification_db'),
      inject: [ConfigService],
    }),
    MongooseModule.forFeature([{ name: Notification.name, schema: NotificationSchema }]),
    ClientsModule.registerAsync([createRmqClient('GATEWAY_SERVICE', 'gateway')]),
    TerminusModule,
  ],
  controllers: [AppController, HealthController],
  providers: [AppService],
})
export class AppModule {}
