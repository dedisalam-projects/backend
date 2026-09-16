import { NestFactory } from '@nestjs/core';
import { Transport } from '@nestjs/microservices';
import { ConfigService } from '@nestjs/config';
import { Logger as PinoLogger } from 'nestjs-pino';
import { AppModule } from './app/app.module';
import { TransformInterceptor, RpcExceptionFilter } from '@dedisalam/common';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { bufferLogs: true });

  // Use pino-logger
  const logger = app.get(PinoLogger);
  app.useLogger(logger);

  // Get config service
  const configService = app.get(ConfigService);
  const port = configService.get<number>('USER_SERVICE_PORT') || 3011;

  // Connect RabbitMQ Microservice
  app.connectMicroservice({
    transport: Transport.RMQ,
    options: {
      urls: [configService.get<string>('RABBITMQ_URL') || 'amqp://guest:guest@localhost:5672'],
      queue: 'user-service',
      queueOptions: {
        durable: true,
      },
    },
  });

  // Global Interceptor & Filter
  app.useGlobalInterceptors(new TransformInterceptor());
  app.useGlobalFilters(new RpcExceptionFilter());

  app.enableShutdownHooks();

  // Start microservices
  await app.startAllMicroservices();

  // Start HTTP server for Health Checks
  await app.listen(port, '0.0.0.0');

  logger.log(`🚀 User Service (HTTP/Health Check) is running on: http://localhost:${port}`);
  logger.log(`🔌 User Service (RMQ Microservice) is connected`);
}

bootstrap();
