import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { LoggerModule } from 'nestjs-pino';
import { ClientsModule } from '@nestjs/microservices';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';

import {
  getEnvFilePath,
  createPinoLoggerOptions,
  createRmqClient,
  createJwtOptions,
  JwtStrategy,
} from '@dedisalam/common';
import { MongooseModule } from '@nestjs/mongoose';
import { createMongooseOptions } from '@dedisalam/database';

import { AppService } from './app.service';
import { validate } from '../config/gateway.config';
import { AuthController } from '../auth/auth.controller';
import { UserController } from '../user/user.controller';
import { UserGateway } from '../user/user.gateway';
import { NotificationGateway } from '../notification/notification.gateway';
import { NotificationConsumer } from '../notification/notification.consumer';
import { DocumentController } from '../document/document.controller';
import { DocumentGateway } from '../document/document.gateway';
import { ProductModule } from '../product/product.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validate,
      envFilePath: getEnvFilePath(),
    }),
    LoggerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) =>
        createPinoLoggerOptions(configService, 'gateway'),
    }),
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: createMongooseOptions('dedisalam'),
    }),
    ProductModule,
    ClientsModule.registerAsync([
      createRmqClient('USER_SERVICE', 'user-service'),
      createRmqClient('NOTIFICATION_SERVICE', 'notification-service', {
        arguments: {
          'x-dead-letter-exchange': 'notification-service.dlx',
          'x-dead-letter-routing-key': 'notification-service.dlq',
        },
      }),
      createRmqClient('BLIP_SERVICES', 'blip-services'),
      createRmqClient('AUTH_SERVICE', 'auth-service'),
    ]),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: createJwtOptions,
    }),
    PassportModule.register({ defaultStrategy: 'jwt' }),
  ],
  controllers: [NotificationConsumer, AuthController, UserController, DocumentController],
  providers: [AppService, UserGateway, NotificationGateway, DocumentGateway, JwtStrategy],
})
export class AppModule {}
