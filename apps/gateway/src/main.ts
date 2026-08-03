import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { Logger as PinoLogger } from 'nestjs-pino';
import helmet from 'helmet';
import compression from 'compression';
import { json } from 'express';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import { Transport } from '@nestjs/microservices';

import { AppModule } from './app/app.module';
import { HttpExceptionFilter, CorrelationIdInterceptor } from '@dedisalam/common';
import { RedisIoAdapter } from './config/redis-io.adapter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { bufferLogs: true });

  // Use pino-logger
  const logger = app.get(PinoLogger);
  app.useLogger(logger);

  // Security & Optimization Middlewares
  app.use(helmet());
  app.use(compression());
  app.use(json({ limit: '10mb' }));
  app.enableCors({
    origin: true,
    credentials: true,
  });

  // Global Prefix
  const globalPrefix = 'api/v1';
  app.setGlobalPrefix(globalPrefix);

  // Global Pipes, Filters, and Interceptors
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
    }),
  );
  app.useGlobalFilters(new HttpExceptionFilter());
  app.useGlobalInterceptors(new CorrelationIdInterceptor());

  // Swagger Documentation Setup (served at /api/docs)
  const config = new DocumentBuilder()
    .setTitle('API Gateway')
    .setDescription('The API Gateway entry point description')
    .setVersion('1.0')
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  // Get port from config
  const configService = app.get(ConfigService);
  const port = configService.get<number>('PORT') || 3000;
  const tcpPort = configService.get<number>('GATEWAY_TCP_PORT') || 4000;

  // Setup Redis IO Adapter for Websocket synchronization
  const redisUrl = configService.get<string>('REDIS_URL') || 'redis://localhost:6379';
  const redisIoAdapter = new RedisIoAdapter(app, redisUrl);
  await redisIoAdapter.connectToRedis();
  app.useWebSocketAdapter(redisIoAdapter);

  const rabbitmqUrl =
    configService.get<string>('RABBITMQ_URL') || 'amqp://guest:guest@localhost:5672';

  // Connect RabbitMQ Microservice (Hybrid App)
  app.connectMicroservice({
    transport: Transport.RMQ,
    options: {
      urls: [rabbitmqUrl],
      queue: 'gateway',
      queueOptions: {
        durable: true,
      },
    },
  });

  await app.startAllMicroservices();
  await app.listen(port, '0.0.0.0');
  logger.log(`🚀 API Gateway is running on: http://localhost:${port}/${globalPrefix}`);
  logger.log(`🔌 API Gateway TCP listener is running on port: ${tcpPort}`);
  logger.log(`📚 Swagger documentation available at: http://localhost:${port}/api/docs`);
}

bootstrap();
