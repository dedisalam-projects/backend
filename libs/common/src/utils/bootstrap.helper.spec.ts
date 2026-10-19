const app = {
  get: jest.fn(),
  useLogger: jest.fn(),
  connectMicroservice: jest.fn(),
  useGlobalInterceptors: jest.fn(),
  useGlobalFilters: jest.fn(),
  enableShutdownHooks: jest.fn(),
  startAllMicroservices: jest.fn(),
  listen: jest.fn(),
};
jest.mock('@nestjs/core', () => ({ NestFactory: { create: jest.fn(async () => app) } }));

import { ConfigService } from '@nestjs/config';
import { Logger as PinoLogger } from 'nestjs-pino';
import { bootstrapMicroservice } from './bootstrap.helper';

describe('bootstrapMicroservice', () => {
  const setup = (cfg: Record<string, any>) => {
    const logger = { log: jest.fn() };
    app.get.mockImplementation((t: any) => {
      if (t === PinoLogger) return logger;
      if (t === ConfigService) return { get: (k: string) => cfg[k] };
      return undefined;
    });
    return logger;
  };

  it('uses PORT and RABBITMQ_URL from config', async () => {
    setup({ PORT: 1, RABBITMQ_URL: 'amqp://x' });
    await bootstrapMicroservice({
      module: class {},
      serviceName: 's',
      defaultPort: 9,
      queueName: 'q',
    });
    expect(app.listen).toHaveBeenCalledWith(1, '0.0.0.0');
  });

  it('falls back to portEnvKey then default', async () => {
    setup({ MY_PORT: 2 });
    await bootstrapMicroservice({
      module: class {},
      serviceName: 's',
      defaultPort: 9,
      portEnvKey: 'MY_PORT',
      queueName: 'q',
      queueOptions: { durable: false },
    });
    expect(app.listen).toHaveBeenLastCalledWith(2, '0.0.0.0');
    setup({});
    await bootstrapMicroservice({
      module: class {},
      serviceName: 's',
      defaultPort: 9,
      queueName: 'q',
    });
    expect(app.listen).toHaveBeenLastCalledWith(9, '0.0.0.0');
    setup({});
    await bootstrapMicroservice({
      module: class {},
      serviceName: 's',
      defaultPort: 7,
      portEnvKey: 'NOPE',
      queueName: 'q',
    });
    expect(app.listen).toHaveBeenLastCalledWith(7, '0.0.0.0');
  });
});
