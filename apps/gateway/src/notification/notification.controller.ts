import { Controller, Get, Req, Inject, Logger, Patch, Param } from '@nestjs/common';
import { ClientProxy, EventPattern, Payload } from '@nestjs/microservices';
import { firstValueFrom, timeout } from 'rxjs';
import { NotificationGateway } from './notification.gateway';

@Controller('notifications')
export class NotificationController {
  private readonly logger = new Logger(NotificationController.name);

  constructor(
    @Inject('NOTIFICATION_SERVICE') private readonly notificationClient: ClientProxy,
    private readonly notificationGateway: NotificationGateway,
  ) {}

  @EventPattern('user.logged_in')
  handleUserLoggedIn(@Payload() data: any) {
    this.logger.log(`Received user.logged_in event for user: ${data.email}`);
    // Emit to socket clients
    this.notificationGateway.server.emit('login_event', data);
  }

  @Get()
  async getNotifications(@Req() req: any) {
    const userId = req.user.sub;
    try {
      const response = await firstValueFrom(
        this.notificationClient.send('notification.list', { userId }).pipe(timeout(5000)),
      );
      return response;
    } catch (error) {
      this.logger.error('Error fetching notifications', error);
      throw error;
    }
  }

  @Patch(':id/read')
  async markAsRead(@Param('id') id: string, @Req() req: any) {
    const userId = req.user.sub;
    try {
      const response = await firstValueFrom(
        this.notificationClient.send('notification.markAsRead', { id, userId }).pipe(timeout(5000)),
      );
      return response;
    } catch (error) {
      this.logger.error(`Error marking notification ${id} as read`, error);
      throw error;
    }
  }
}
