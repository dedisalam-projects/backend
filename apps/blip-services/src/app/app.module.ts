import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { TerminusModule } from '@nestjs/terminus';

import { AppController } from './app.controller';
import { AppService } from './app.service';
import { HealthController } from '../health/health.controller';
import { validate } from '../config/blip-services.config';
import { DocumentModule } from '../document/document.module';
import { createMicroserviceConfigModule, createMicroserviceLoggerModule } from '@dedisalam/common';
import { createMongooseOptions } from '@dedisalam/database';

@Module({
  imports: [
    createMicroserviceConfigModule(validate),
    createMicroserviceLoggerModule('blip-services'),
    TerminusModule,
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: createMongooseOptions('dedisalam'),
      inject: [ConfigService],
    }),
    DocumentModule,
  ],
  controllers: [AppController, HealthController],
  providers: [AppService],
})
export class AppModule {}
