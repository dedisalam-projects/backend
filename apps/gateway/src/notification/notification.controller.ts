import { Controller, Get, Req, Inject, Logger, Patch, Param } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { firstValueFrom, timeout } from 'rxjs';

@Controller('api/v1/notifications')
export class NotificationController {
  private readonly logger = new Logger(NotificationController.name);

  constructor(@Inject('NOTIFICATION_SERVICE') private readonly notificationClient: ClientProxy) {}

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
