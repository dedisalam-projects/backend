import { Catch, ArgumentsHost, HttpException, HttpStatus, Logger } from '@nestjs/common';
import { BaseRpcExceptionFilter, RpcException } from '@nestjs/microservices';
import { Observable, throwError } from 'rxjs';
import { HttpExceptionResponseBody, RpcExceptionResponseBody } from '../interfaces';

@Catch()
export class RpcExceptionFilter extends BaseRpcExceptionFilter {
  private readonly logger = new Logger(RpcExceptionFilter.name);

  override catch(exception: unknown, host?: ArgumentsHost): Observable<RpcExceptionResponseBody> {
    void host;
    if (exception instanceof HttpException) {
      const statusCode = exception.getStatus();
      const res = exception.getResponse();
      let message = exception.message;

      if (typeof res === 'string') {
        message = res;
      } else if (typeof res === 'object' && res !== null) {
        const resObj = res as HttpExceptionResponseBody;
        if (Array.isArray(resObj.message)) {
          message = resObj.message.join(', ');
        } else if (typeof resObj.message === 'string') {
          message = resObj.message;
        }
      }

      return throwError(() => ({
        statusCode,
        message,
        status: 'error',
      }));
    }

    if (exception instanceof RpcException) {
      const error = exception.getError();
      if (typeof error === 'object' && error !== null) {
        const errObj = error as RpcExceptionResponseBody;
        return throwError(() => ({
          status: 'error',
          statusCode:
            typeof errObj.statusCode === 'number'
              ? errObj.statusCode
              : HttpStatus.INTERNAL_SERVER_ERROR,
          message: typeof errObj.message === 'string' ? errObj.message : 'Internal server error',
          ...errObj,
        }));
      }
      return throwError(() => ({
        status: 'error',
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        message: typeof error === 'string' ? error : 'Internal server error',
      }));
    }

    const message = exception instanceof Error ? exception.message : 'Internal server error';
    const stack = exception instanceof Error ? exception.stack : undefined;
    this.logger.error(`Unhandled RPC Exception: ${message}`, stack);

    return throwError(() => ({
      status: 'error',
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      message,
    }));
  }
}
