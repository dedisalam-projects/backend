import { Catch, ArgumentsHost, HttpException, Logger } from '@nestjs/common';
import { BaseWsExceptionFilter, WsException } from '@nestjs/websockets';
import { Socket } from 'socket.io';

@Catch()
export class WsExceptionFilter extends BaseWsExceptionFilter {
  private readonly logger = new Logger(WsExceptionFilter.name);

  override catch(exception: any, host: ArgumentsHost) {
    const client = host.switchToWs().getClient<Socket>();
    const args = host.getArgs();

    let code = 'INTERNAL_ERROR';
    let message = 'An unexpected error occurred';
    let details: any = undefined;

    if (exception instanceof HttpException) {
      const response = exception.getResponse() as any;
      if (typeof response === 'string') {
        message = response;
        code = `HTTP_${exception.getStatus()}`;
      } else if (typeof response === 'object' && response !== null) {
        if (Array.isArray(response.message)) {
          code = 'VALIDATION_ERROR';
          message = 'Validation failed';
          details = response.message;
        } else {
          code = response.error
            ? String(response.error).toUpperCase().replace(/\s+/g, '_')
            : `HTTP_${exception.getStatus()}`;
          message = response.message || exception.message;
          details = response.details;
        }
      }
    } else if (exception instanceof WsException) {
      const error = exception.getError();
      if (typeof error === 'string') {
        message = error;
        code = 'WS_ERROR';
      } else if (typeof error === 'object' && error !== null) {
        const errObj = error as any;
        code = errObj.code || 'WS_ERROR';
        message = errObj.message || 'WebSocket error';
        details = errObj.details;
      }
    } else if (exception instanceof Error) {
      message = exception.message;
      code = exception.name ? exception.name.toUpperCase().replace(/\s+/g, '_') : 'INTERNAL_ERROR';
      this.logger.error(`[WebSocket Error] ${exception.message}`, exception.stack);
    } else {
      message = typeof exception === 'string' ? exception : 'Unknown exception occurred';
      this.logger.error(`[WebSocket Unknown Error] ${JSON.stringify(exception)}`);
    }

    const formattedResponse = {
      success: false,
      error: {
        code,
        message,
        ...(details !== undefined ? { details } : {}),
      },
      meta: {
        timestamp: new Date().toISOString(),
      },
    };

    // If an acknowledgment callback was passed by the client (Socket.IO emitWithAck), invoke it
    const ackCallback = args.find((arg: any) => typeof arg === 'function');
    if (typeof ackCallback === 'function') {
      ackCallback(formattedResponse);
    } else if (client && typeof client.emit === 'function') {
      // Fallback: emit exception event on socket
      client.emit('exception', formattedResponse);
    }
  }
}
