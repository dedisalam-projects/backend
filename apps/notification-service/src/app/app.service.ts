import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Notification, NotificationDocument } from '@dedisalam/database';

@Injectable()
export class AppService {
  private readonly logger = new Logger(AppService.name);

  constructor(
    @InjectModel(Notification.name) private readonly notificationModel: Model<NotificationDocument>,
  ) {}

  async processNotification(
    message?: string,
    userId?: string,
    type?: string,
  ): Promise<Notification> {
    this.logger.log(`Processing and persisting notification: ${message || 'No message'}`);
    const notification = new this.notificationModel({
      title: type || 'System Alert',
      message: message || 'Hello World Notification',
      userId: userId || 'system-user-id',
      type: type || 'INFO',
      isRead: false,
    });
    return await notification.save();
  }

  async getNotifications(userId: string): Promise<Notification[]> {
    return this.notificationModel.find({ userId }).sort({ createdAt: -1 }).exec();
  }

  async markAsRead(id: string, userId: string): Promise<Notification | null> {
    const notification = await this.notificationModel.findOneAndUpdate(
      { _id: id, userId },
      { isRead: true },
      { new: true },
    );
    return notification;
  }
}
