import type { IncomingMessage } from 'http';
import { randomUUID } from 'crypto';
import type { ConfigService } from '@nestjs/config';

export const CORRELATION_ID_HEADER = 'x-correlation-id';

export function resolveCorrelationId(req: IncomingMessage): string {
  const rawId = req.headers[CORRELATION_ID_HEADER];
  const correlationId = (Array.isArray(rawId) ? rawId[0] : rawId) || randomUUID();
  req.headers[CORRELATION_ID_HEADER] = correlationId;
  return correlationId;
}

export function resolveCustomProps(req: IncomingMessage, serviceName: string) {
  return {
    correlationId: req.headers[CORRELATION_ID_HEADER],
    service: serviceName,
  };
}

export function createPinoLoggerOptions(configService: ConfigService, serviceName: string) {
  const isProduction = configService.get<string>('NODE_ENV') === 'production';
  return {
    pinoHttp: {
      transport: !isProduction ? { target: 'pino-pretty', options: { colorize: true } } : undefined,
      genReqId: resolveCorrelationId,
      customProps: (req: IncomingMessage) => resolveCustomProps(req, serviceName),
    },
  };
}
