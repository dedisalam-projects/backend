import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Notification } from '../schemas/notification.schema';

@Injectable()
export class AppService {
  private readonly logger = new Logger(AppService.name);

  constructor(
    @InjectModel(Notification.name) private readonly notificationModel: Model<Notification>,
  ) {}

  async processNotification(message?: string): Promise<Notification> {
    this.logger.log(`Processing and persisting notification: ${message || 'No message'}`);
    const notification = new this.notificationModel({
      title: 'Hello World Event',
      message: message || 'Hello World Notification',
      userId: 'system-user-id',
      read: false,
    });
    return await notification.save();
  }
}
