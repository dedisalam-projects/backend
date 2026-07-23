import { Controller, Get, Logger } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { AppService } from './app.service';
import { Public } from '@dedisalam/common';
import { NotificationGateway } from '../notification/notification.gateway';

@Controller()
export class AppController {
  private readonly logger = new Logger(AppController.name);

  constructor(
    private readonly appService: AppService,
    private readonly notificationGateway: NotificationGateway,
  ) {}

  @Get('hello')
  @Public()
  async getHello() {
    return this.appService.getHello();
  }

  @MessagePattern('notification.push')
  async handleNotificationPush(@Payload() data: { message?: string; correlationId?: string }) {
    this.logger.log(`Received TCP notification.push event: ${JSON.stringify(data)}`);
    if (this.notificationGateway.server) {
      this.notificationGateway.server.emit('hello', {
        message: data?.message || 'New notification',
        correlationId: data?.correlationId || 'unknown',
      });
    } else {
      this.logger.warn('NotificationGateway server is not initialized yet');
    }
    return { status: 'success' };
  }
}
