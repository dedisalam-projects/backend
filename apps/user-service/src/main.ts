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
  const port = configService.get<number>('USER_SERVICE_PORT') || 3011;
  const tcpPort = configService.get<number>('USER_SERVICE_TCP_PORT') || 3001;

  // Connect TCP Microservice
  app.connectMicroservice({
    transport: Transport.TCP,
    options: {
      host: '0.0.0.0',
      port: tcpPort,
    },
  });

  // Start microservices
  await app.startAllMicroservices();

  // Start HTTP server for Health Checks
  await app.listen(port);

  logger.log(`🚀 User Service (HTTP/Health Check) is running on: http://localhost:${port}`);
  logger.log(`🔌 User Service (TCP Microservice) is listening on port: ${tcpPort}`);
}

bootstrap();
