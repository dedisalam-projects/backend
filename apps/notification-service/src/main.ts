import { NestFactory } from '@nestjs/core';
import { Transport } from '@nestjs/microservices';
import { ConfigService } from '@nestjs/config';
import { Logger as PinoLogger } from 'nestjs-pino';
import { AppModule } from './app/app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { bufferLogs: true });

  // Use pino-logger
  const logger = app.get(PinoLogger);
  app.useLogger(logger);

  // Get config service
  const configService = app.get(ConfigService);
  const port = configService.get<number>('NOTIFICATION_SERVICE_PORT') || 3012;
  const tcpPort = configService.get<number>('NOTIFICATION_SERVICE_TCP_PORT') || 3002;
  const rabbitmqUrl = configService.get<string>('RABBITMQ_URL');

  // Connect TCP Microservice
  app.connectMicroservice({
    transport: Transport.TCP,
    options: {
      host: '0.0.0.0',
      port: tcpPort,
    },
  });

  // Connect RabbitMQ Microservice
  app.connectMicroservice({
    transport: Transport.RMQ,
    options: {
      urls: [rabbitmqUrl],
      queue: 'notification-service',
      queueOptions: {
        durable: true,
        arguments: {
          'x-dead-letter-exchange': 'notification-service.dlx',
          'x-dead-letter-routing-key': 'notification-service.dlq',
        },
      },
    },
  });

  // Start all microservices
  await app.startAllMicroservices();

  // Start HTTP server for Health Checks
  await app.listen(port, '0.0.0.0');

  logger.log(`🚀 Notification Service (HTTP/Health Check) is running on: http://localhost:${port}`);
  logger.log(`🔌 Notification Service (TCP Microservice) is listening on port: ${tcpPort}`);
  logger.log(
    `🐇 Notification Service (RabbitMQ Consumer) is connected to queue: notification-service`,
  );
}

bootstrap();
