import { Injectable, Inject } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User, UserDocument, RedisService } from '@dedisalam/database';
import { ConfigService } from '@nestjs/config';
import { ClientProxy } from '@nestjs/microservices';
import { BaseAuthService } from '@dedisalam/common';

@Injectable()
export class AuthService extends BaseAuthService {
  constructor(
    @InjectModel(User.name) userModel: Model<UserDocument>,
    redisService: RedisService,
    configService: ConfigService,
    @Inject('NOTIFICATION_SERVICE_RMQ') notificationClient: ClientProxy,
  ) {
    super(userModel, redisService, configService, notificationClient, AuthService.name);
  }

  async logout(userId: string) {
    if (userId) {
      await this.redisService.del(`refresh_token:${userId}`);
    }
    return { success: true, message: 'Logged out successfully' };
  }
}
