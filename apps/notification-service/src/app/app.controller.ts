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

  @EventPattern('test.hello')
  async handleTestHello(@Payload() data: { message?: string; correlationId?: string }) {
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

    await this.appService.processNotification(data?.message);

    // Forward the event notification to API Gateway over TCP
    this.gatewayClient.emit('notification.push', {
      message: `Notification processed: ${data?.message || 'Hello World'}`,
      correlationId,
    });
  }
}
