import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Response, Request } from 'express';

import { HttpExceptionResponseBody } from '../interfaces';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request & { id?: string }>();

    const status =
      exception instanceof HttpException ? exception.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR;

    const exceptionResponse = exception instanceof HttpException ? exception.getResponse() : null;

    let message = 'Internal server error';
    let error = 'Internal Server Error';
    let details: unknown[] | undefined = undefined;

    if (exceptionResponse) {
      if (typeof exceptionResponse === 'string') {
        message = exceptionResponse;
      } else if (typeof exceptionResponse === 'object') {
        const resObj = exceptionResponse as HttpExceptionResponseBody;

        // Handle validation errors from ValidationPipe
        if (Array.isArray(resObj.message)) {
          message = 'Validation failed';
          error = 'Bad Request';
          details = resObj.message.map((msg: unknown) => {
            if (typeof msg === 'string') {
              return { message: msg };
            }
            return msg;
          });
        } else {
          if (typeof resObj.message === 'string') {
            message = resObj.message;
          }
          if (typeof resObj.error === 'string') {
            error = resObj.error;
          }
          if (Array.isArray(resObj.details)) {
            details = resObj.details;
          }
        }
      }
    } else if (exception instanceof Error) {
      message = exception.message;
      this.logger.error(
        `[${request.method}] ${request.url} - Error: ${exception.message}`,
        exception.stack,
      );
    } else {
      this.logger.error(
        `[${request.method}] ${request.url} - Unknown error: ${JSON.stringify(exception)}`,
      );
    }

    const requestId = request.headers['x-correlation-id'] || request.id || 'unknown';

    response.status(status).json({
      statusCode: status,
      message,
      error,
      ...(details ? { details } : {}),
      meta: {
        timestamp: new Date().toISOString(),
        requestId,
      },
    });
  }
}
