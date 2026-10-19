import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { TerminusModule } from '@nestjs/terminus';

import { AppController } from './app.controller';
import { AppService } from './app.service';
import { HealthController } from '../health/health.controller';
import { validate } from '../config/auth-service.config';
import { AuthModule } from '../auth/auth.module';
import { createMicroserviceConfigModule, createMicroserviceLoggerModule } from '@dedisalam/common';
import { createMongooseOptions } from '@dedisalam/database';

@Module({
  imports: [
    createMicroserviceConfigModule(validate),
    createMicroserviceLoggerModule('auth-service'),
    TerminusModule,
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: createMongooseOptions('user_db'),
      inject: [ConfigService],
    }),
    AuthModule,
  ],
  controllers: [AppController, HealthController],
  providers: [AppService],
})
export class AppModule {}
