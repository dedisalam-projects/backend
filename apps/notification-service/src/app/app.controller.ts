import { Controller, Logger, Inject } from '@nestjs/common';
import { EventPattern, Payload, Ctx, RmqContext, ClientProxy } from '@nestjs/microservices';
import { AppService } from './app.service';
import { PinoLogger } from 'nestjs-pino';

@Controller()
export class AppController {
  private readonly logger = new Logger(AppController.name);

  constructor(
    private readonly appService: AppService,
    private readonly pinoLogger: PinoLogger,
    @Inject('GATEWAY_SERVICE') private readonly gatewayClient: ClientProxy,
  ) {}

  @EventPattern('notification.send')
  async handleNotificationSend(
    @Payload() data: { message?: string; userId?: string; type?: string; correlationId?: string },
  ) {
    const correlationId = data?.correlationId || 'unknown';

    // Attempt to assign correlationId to the request-scoped Pino logger context
    try {
      this.pinoLogger.assign({ correlationId });
    } catch {
      // Fallback: request context is not present in non-request contexts
    }

    // Explicitly include correlationId in the log metadata
    this.logger.log(
      { correlationId },
      `Received test.hello event with message: ${data?.message || 'None'}`,
    );

    await this.appService.processNotification(data?.message, data?.userId, data?.type);

    // Forward the event notification to API Gateway over TCP/RMQ
    this.gatewayClient.emit('notification.push', {
      message: `Notification processed: ${data?.message || 'Hello World'}`,
      correlationId,
    });
  }

  @MessagePattern('notification.list')
  async handleNotificationList(@Payload() data: { userId: string }) {
    return this.appService.getNotifications(data.userId);
  }
}
