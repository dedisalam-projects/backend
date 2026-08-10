import { Controller, Logger, Inject } from '@nestjs/common';
import { MessagePattern, Payload, Ctx, TcpContext, ClientProxy } from '@nestjs/microservices';
import { AppService } from './app.service';
import { PinoLogger } from 'nestjs-pino';
import { RedisService } from '@dedisalam/database';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection } from 'mongoose';

@Controller()
export class AppController {
  private readonly logger = new Logger(AppController.name);

  constructor(
    private readonly appService: AppService,
    private readonly pinoLogger: PinoLogger,
    @Inject('NOTIFICATION_SERVICE_RMQ') private readonly rmqClient: ClientProxy,
    private readonly redisService: RedisService,
    @InjectConnection() private readonly connection: Connection,
  ) {}

  @MessagePattern('user.hello')
  async hello(
    @Payload() data: { name?: string; correlationId?: string },
    @Ctx() context: TcpContext,
  ) {
    const correlationId = data?.correlationId || 'unknown';

    // Attempt to assign correlationId to the request-scoped Pino logger context
    try {
      this.pinoLogger.assign({ correlationId });
    } catch (err) {
      // Fallback: request context is not present in TCP microservice transport
    }

    // Explicitly include correlationId in the log metadata
    this.logger.log(
      { correlationId },
      `Received user.hello request for name: ${data?.name || 'Guest'}`,
    );

    // Verify Redis connection and cache read/write (Set/Get)
    try {
      await this.redisService.set('test_key', 'hello_redis', 60);
      const getResult = await this.redisService.get('test_key');
      this.logger.log({ correlationId }, `Redis Set/Get test successful: ${getResult}`);
    } catch (err: any) {
      this.logger.error({ correlationId }, `Redis Set/Get test failed: ${err.message}`);
    }

    // Verify MongoDB connection by checking readyState and executing admin ping
    try {
      const readyState = this.connection.readyState;
      this.logger.log({ correlationId }, `MongoDB readyState: ${readyState}`);
      if (readyState === 1) {
        await this.connection.db?.admin().ping();
        this.logger.log({ correlationId }, 'MongoDB ping successful');
      } else {
        throw new Error(`MongoDB is not connected (readyState: ${readyState})`);
      }
    } catch (err: any) {
      this.logger.error({ correlationId }, `MongoDB connection check/ping failed: ${err.message}`);
    }

    const message = this.appService.getHello(data?.name);

    return {
      message,
      correlationId,
    };
  }

  @MessagePattern('test.event')
  async handleTestEvent(@Payload() data: { message?: string; correlationId?: string }) {
    const correlationId = data?.correlationId || 'unknown';
    this.logger.log(
      { correlationId },
      `Received TCP test.event in User Service: ${data?.message || ''}`,
    );

    // Publish test.hello event to RabbitMQ
    this.rmqClient.emit('test.hello', {
      message: data?.message || 'Hello from User Service via RabbitMQ!',
      correlationId,
    });

    return { status: 'event_published' };
  }
}
