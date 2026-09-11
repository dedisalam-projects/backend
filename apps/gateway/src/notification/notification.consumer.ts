import { Controller, Logger } from '@nestjs/common';
import { EventPattern, MessagePattern, Payload } from '@nestjs/microservices';
import { NotificationGateway } from './notification.gateway';

@Controller()
export class NotificationConsumer {
  private readonly logger = new Logger(NotificationConsumer.name);

  constructor(private readonly notificationGateway: NotificationGateway) {}

  @EventPattern('user.logged_in')
  handleUserLoggedIn(@Payload() data: any) {
    this.logger.log(`Received user.logged_in RMQ event for: ${data?.email}`);
    if (this.notificationGateway.server) {
      this.notificationGateway.server.emit('login_event', data);
    }
  }

  @EventPattern('gateway.notify.user')
  handleNotifyUser(@Payload() data: any) {
    this.logger.log(`Received gateway.notify.user RMQ event for: ${data?.userId}`);
    if (this.notificationGateway.server) {
      if (data?.userId) {
        this.notificationGateway.server.to(`user_${data.userId}`).emit('notification:new', data);
      } else {
        this.notificationGateway.server.emit('notification:new', data);
      }
    }
  }

  @EventPattern('notification.broadcast.push')
  handleBroadcastPush(@Payload() data: any) {
    this.logger.log(`Received notification.broadcast.push RMQ event: ${data?.title}`);
    if (this.notificationGateway.server) {
      if (data?.recipientId) {
        this.notificationGateway.server
          .to(`user_${data.recipientId}`)
          .emit('notification:new', data);
      } else {
        this.notificationGateway.server.emit('notification:broadcast', data);
      }
    }
  }

  @MessagePattern('notification.push')
  handleNotificationPush(@Payload() data: { message?: string; correlationId?: string }) {
    this.logger.log(`Received notification.push event: ${JSON.stringify(data)}`);
    if (this.notificationGateway.server) {
      this.notificationGateway.server.emit('hello', {
        message: data?.message || 'New notification',
        correlationId: data?.correlationId || 'unknown',
      });
    }
    return { status: 'success' };
  }
}
