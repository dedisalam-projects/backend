import { ConfigModule } from '@nestjs/config';
import { LoggerModule } from 'nestjs-pino';
import { getEnvFilePath } from './env.helper';

export function createMicroserviceConfigModule(
  validate?: (config: Record<string, unknown>) => any,
) {
  return ConfigModule.forRoot({
    isGlobal: true,
    ...(validate ? { validate } : {}),
    envFilePath: getEnvFilePath(),
  });
}

export function createMicroserviceLoggerModule(serviceName?: string) {
  return LoggerModule.forRoot({
    pinoHttp: {
      transport:
        process.env['NODE_ENV'] !== 'production'
          ? { target: 'pino-pretty', options: { colorize: true } }
          : undefined,
      ...(serviceName ? { customProps: () => ({ service: serviceName }) } : {}),
    },
  });
}
