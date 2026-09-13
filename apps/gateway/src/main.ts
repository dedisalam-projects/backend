import { firstValueFrom, timeout } from 'rxjs';
import * as express from 'express';
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
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Dynamic CORS for cross-subdomain frontend support
  app.enableCors({
    origin: (origin: any, callback: any) => {
      // Allow all origins (subdomains, localhost, etc.)
      callback(null, true);
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

  // REST API Compatibility Bridge
  httpAdapter.post('/api/v1/auth/login', async (req: any, res: any) => {
    try {
      const userService = app.get('USER_SERVICE');
      const response = await firstValueFrom(
        userService.send('auth.login', req.body || {}).pipe(timeout(5000)),
      );
      return res.status(200).json({
        statusCode: 200,
        message: 'Login successful',
        data: response,
        meta: { timestamp: new Date().toISOString() },
      });
    } catch (err: any) {
      return res.status(401).json({
        statusCode: 401,
        message: err?.message || 'Invalid credentials',
        error: 'Unauthorized',
      });
    }
  });

  httpAdapter.post('/api/v1/auth/register', async (req: any, res: any) => {
    try {
      const userService = app.get('USER_SERVICE');
      const response = await firstValueFrom(
        userService.send('auth.register', req.body || {}).pipe(timeout(5000)),
      );
      return res.status(201).json({
        statusCode: 201,
        message: 'User registered successfully',
        data: response,
        meta: { timestamp: new Date().toISOString() },
      });
    } catch (err: any) {
      return res.status(400).json({
        statusCode: 400,
        message: err?.message || 'Registration failed',
      });
    }
  });

  httpAdapter.post('/api/v1/auth/refresh', async (req: any, res: any) => {
    try {
      const userService = app.get('USER_SERVICE');
      const response = await firstValueFrom(
        userService.send('auth.refresh', req.body || {}).pipe(timeout(5000)),
      );
      return res.status(200).json({
        statusCode: 200,
        message: 'Token refreshed successfully',
        data: response,
        meta: { timestamp: new Date().toISOString() },
      });
    } catch (err: any) {
      return res.status(401).json({
        statusCode: 401,
        message: err?.message || 'Refresh failed',
      });
    }
  });

  httpAdapter.post('/api/v1/auth/logout', async (req: any, res: any) => {
    try {
      const userService = app.get('USER_SERVICE');
      const response = await firstValueFrom(
        userService.send('auth.logout', req.body || {}).pipe(timeout(5000)),
      );
      return res.status(200).json({
        statusCode: 200,
        message: 'Logout successful',
        data: response,
        meta: { timestamp: new Date().toISOString() },
      });
    } catch (err: any) {
      return res.status(200).json({
        statusCode: 200,
        message: 'Logged out',
      });
    }
  });

  httpAdapter.get('/api/v1/users', async (req: any, res: any) => {
    try {
      const userService = app.get('USER_SERVICE');
      const response = await firstValueFrom(userService.send('user.list', {}).pipe(timeout(5000)));
      return res.status(200).json({
        statusCode: 200,
        message: 'Users retrieved successfully',
        data: response,
        meta: { timestamp: new Date().toISOString() },
      });
    } catch (err: any) {
      return res.status(500).json({
        statusCode: 500,
        message: err?.message || 'Failed to retrieve users',
      });
    }
  });

  httpAdapter.patch('/api/v1/users/:id', async (req: any, res: any) => {
    try {
      const userService = app.get('USER_SERVICE');
      const response = await firstValueFrom(
        userService
          .send('user.update.admin', { userId: req.params.id, ...(req.body || {}) })
          .pipe(timeout(5000)),
      );
      return res.status(200).json({
        statusCode: 200,
        message: 'User updated successfully',
        data: response,
        meta: { timestamp: new Date().toISOString() },
      });
    } catch (err: any) {
      return res.status(400).json({
        statusCode: 400,
        message: err?.message || 'Failed to update user',
      });
    }
  });

  httpAdapter.delete('/api/v1/users/:id', async (req: any, res: any) => {
    try {
      const userService = app.get('USER_SERVICE');
      const response = await firstValueFrom(
        userService.send('user.delete', { userId: req.params.id }).pipe(timeout(5000)),
      );
      return res.status(200).json({
        statusCode: 200,
        message: 'User deleted successfully',
        data: response,
        meta: { timestamp: new Date().toISOString() },
      });
    } catch (err: any) {
      return res.status(400).json({
        statusCode: 400,
        message: err?.message || 'Failed to delete user',
      });
    }
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
