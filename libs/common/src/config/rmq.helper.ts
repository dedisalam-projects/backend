import { ConfigModule, ConfigService } from '@nestjs/config';
import { ClientsProviderAsyncOptions, Transport } from '@nestjs/microservices';

export function createRmqClient(
  name: string,
  queue: string,
  extraQueueOptions?: Record<string, unknown>,
): ClientsProviderAsyncOptions {
  return {
    name,
    imports: [ConfigModule],
    inject: [ConfigService],
    useFactory: (configService: ConfigService) => {
      const url = configService.get<string>('RABBITMQ_URL');

      if (!url) {
        throw new Error('RabbitMQ URL is not configured. Set RABBITMQ_URL.');
      }

      return {
        transport: Transport.RMQ,
        options: {
          urls: [url],
          queue,
          queueOptions: {
            durable: true,
            ...extraQueueOptions,
          },
        },
      };
    },
  };
}
