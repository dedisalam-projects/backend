import { NestFactory } from '@nestjs/core';
import { Transport } from '@nestjs/microservices';
import { ConfigService } from '@nestjs/config';
import { Logger as PinoLogger } from 'nestjs-pino';
import { TransformInterceptor } from '../interceptors/transform.interceptor';
import { RpcExceptionFilter } from '../filters/rpc-exception.filter';

export interface MicroserviceBootstrapOptions {
  module: any;
  serviceName: string;
  defaultPort: number;
  portEnvKey?: string;
  queueName: string;
  queueOptions?: {
    durable?: boolean;
    arguments?: Record<string, unknown>;
  };
}

export async function bootstrapMicroservice(options: MicroserviceBootstrapOptions) {
  const app = await NestFactory.create(options.module, { bufferLogs: true });

  const logger = app.get(PinoLogger);
  app.useLogger(logger);

  const configService = app.get(ConfigService);
  const port =
    configService.get<number>('PORT') ||
    (options.portEnvKey ? configService.get<number>(options.portEnvKey) : undefined) ||
    options.defaultPort;

  const rabbitmqUrl =
    configService.get<string>('RABBITMQ_URL') || 'amqp://guest:guest@localhost:5672';

  app.connectMicroservice({
    transport: Transport.RMQ,
    options: {
      urls: [rabbitmqUrl],
      queue: options.queueName,
      queueOptions: options.queueOptions || {
        durable: true,
      },
    },
  });

  app.useGlobalInterceptors(new TransformInterceptor());
  app.useGlobalFilters(new RpcExceptionFilter());
  app.enableShutdownHooks();

  await app.startAllMicroservices();
  await app.listen(port, '0.0.0.0');

  logger.log(`🚀 ${options.serviceName} is running on: http://localhost:${port}`);
  logger.log(`🐇 ${options.serviceName} (RMQ) connected on queue: '${options.queueName}'`);

  return app;
}
