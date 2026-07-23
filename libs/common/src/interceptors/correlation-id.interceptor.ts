import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Observable } from 'rxjs';
import { Response, Request } from 'express';

@Injectable()
export class CorrelationIdInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const httpContext = context.switchToHttp();
    const request = httpContext.getRequest<Request & { id?: string }>();
    const response = httpContext.getResponse<Response>();

    const correlationId = request.headers['x-correlation-id'] || request.id || 'unknown';

    response.setHeader('X-Correlation-ID', correlationId);

    return next.handle();
  }
}
