import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { ClientsModule } from '@nestjs/microservices';
import { User, UserSchema, RedisModule } from '@dedisalam/database';
import { createRmqClient } from '@dedisalam/common';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';

@Module({
  imports: [
    ConfigModule,
    RedisModule,
    MongooseModule.forFeature([{ name: User.name, schema: UserSchema }]),
    ClientsModule.registerAsync([
      createRmqClient('NOTIFICATION_SERVICE_RMQ', 'notification-service', {
        arguments: {
          'x-dead-letter-exchange': 'notification-service.dlx',
          'x-dead-letter-routing-key': 'notification-service.dlq',
        },
      }),
    ]),
  ],
  controllers: [AuthController],
  providers: [AuthService],
  exports: [AuthService],
})
export class AuthModule {}
