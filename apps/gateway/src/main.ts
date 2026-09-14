import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { Logger as PinoLogger } from 'nestjs-pino';
import helmet from 'helmet';
import compression from 'compression';
import { ConfigService } from '@nestjs/config';
import { Transport } from '@nestjs/microservices';
import * as path from 'path';
import * as fs from 'fs';

import { AppModule } from './app/app.module';
import { RedisIoAdapter } from './config/redis-io.adapter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { bufferLogs: true });

  // Use pino-logger
  const logger = app.get(PinoLogger);
  app.useLogger(logger);

  // Security & Compression Middlewares
  app.use(
    helmet({
      contentSecurityPolicy: false, // Permissive for local playground scripts and CDN
    }),
  );
  app.use(compression());

  // Hardened Dynamic CORS with strict whitelist & cross-subdomain support
  const allowedOriginPatterns = [
    /^http:\/\/localhost:(3000|4000|4001|4002|4200)$/,
    /^http:\/\/127\.0\.0\.1:(3000|4000|4001|4002|4200)$/,
    /^https:\/\/([a-zA-Z0-9-]+\.)*dedisalam\.my\.id$/,
  ];

  app.enableCors({
    origin: (
      origin: string | undefined,
      callback: (err: Error | null, allow?: boolean) => void,
    ) => {
      // Allow requests with no origin (e.g. mobile native apps, curl, server-to-server)
      if (!origin) {
        return callback(null, true);
      }
      const isAllowed = allowedOriginPatterns.some((pattern) => pattern.test(origin));
      if (isAllowed) {
        return callback(null, true);
      }
      logger.warn(`[CORS Blocked] Unauthorized origin attempted cross-origin request: ${origin}`);
      return callback(new Error(`Origin ${origin} is not allowed by CORS security policy`), false);
    },
    credentials: true,
  });

  // Global Validation Pipe for WebSocket and internal payloads
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
    }),
  );

  // Serve Web-based Socket.IO Playground UI on root '/'
  const httpAdapter = app.getHttpAdapter();
  httpAdapter.get('/', (req: any, res: any) => {
    const playgroundPath = path.join(__dirname, 'assets', 'playground.html');
    if (fs.existsSync(playgroundPath)) {
      res.setHeader('Content-Type', 'text/html');
      return res.send(fs.readFileSync(playgroundPath, 'utf8'));
    }
    // Fallback if built in dist
    const altPath = path.join(process.cwd(), 'apps', 'gateway', 'src', 'assets', 'playground.html');
    if (fs.existsSync(altPath)) {
      res.setHeader('Content-Type', 'text/html');
      return res.send(fs.readFileSync(altPath, 'utf8'));
    }
    return res.json({
      name: 'API Gateway Realtime Engine',
      status: 'online',
      protocol: 'Socket.IO',
      namespaces: ['/auth', '/users', '/notifications'],
    });
  });

  // Health endpoint for basic load balancers (returns simple socket status)
  httpAdapter.get('/health', (req: any, res: any) => {
    res.json({ status: 'ok', realtime: true, timestamp: new Date().toISOString() });
  });

  // Get port from config
  const configService = app.get(ConfigService);
  const port = configService.get<number>('PORT') || 3000;
  const tcpPort = configService.get<number>('GATEWAY_TCP_PORT') || 4000;

  // Setup Redis IO Adapter for Websocket synchronization across instances
  const redisUrl = configService.get<string>('REDIS_URL') || 'redis://localhost:6379';
  const redisIoAdapter = new RedisIoAdapter(app, redisUrl);
  await redisIoAdapter.connectToRedis();
  app.useWebSocketAdapter(redisIoAdapter);

  const rabbitmqUrl =
    configService.get<string>('RABBITMQ_URL') || 'amqp://guest:guest@localhost:5672';

  // Connect RabbitMQ Microservice Listener (Consume RMQ events and bridge to WebSockets)
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

  // Connect TCP Microservice listener for internal/Docker TCP health checks
  app.connectMicroservice({
    transport: Transport.TCP,
    options: {
      host: '0.0.0.0',
      port: tcpPort,
    },
  });

  app.enableShutdownHooks();
  await app.startAllMicroservices();
  await app.listen(port, '0.0.0.0');

  logger.log(`🚀 Realtime API Gateway is active on: http://localhost:${port}`);
  logger.log(`⚡ Socket.IO Namespaces: /auth, /users, /notifications`);
  logger.log(`🔌 API Gateway TCP health probe is listening on port: ${tcpPort}`);
  logger.log(`🎮 Web Socket.IO Playground available at: http://localhost:${port}/`);
}

bootstrap();
