import { Catch, ArgumentsHost, HttpException, HttpStatus, Logger } from '@nestjs/common';
import { BaseRpcExceptionFilter, RpcException } from '@nestjs/microservices';
import { Observable, throwError } from 'rxjs';

@Catch()
export class RpcExceptionFilter extends BaseRpcExceptionFilter {
  private readonly logger = new Logger(RpcExceptionFilter.name);

  override catch(exception: any, host: ArgumentsHost): Observable<any> {
    if (exception instanceof HttpException) {
      const statusCode = exception.getStatus();
      const res = exception.getResponse();
      let message = exception.message;

      if (typeof res === 'string') {
        message = res;
      } else if (typeof res === 'object' && res !== null) {
        const resObj: any = res;
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
        const errObj: any = error;
        return throwError(() => ({
          status: 'error',
          statusCode: errObj.statusCode || HttpStatus.INTERNAL_SERVER_ERROR,
          message: errObj.message || 'Internal server error',
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
    this.logger.error(`Unhandled RPC Exception: ${message}`, exception?.stack);

    return throwError(() => ({
      status: 'error',
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      message,
    }));
  }
}
