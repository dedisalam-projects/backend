import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

export interface Response<T> {
  statusCode: number;
  message: string;
  data: T;
  meta: { timestamp: string };
}

@Injectable()
export class TransformInterceptor<T> implements NestInterceptor<T, Response<T>> {
  intercept(context: ExecutionContext, next: CallHandler): Observable<Response<T>> {
    const ctx = context.switchToHttp();
    const response = ctx.getResponse();
    const statusCode = response ? response.statusCode : 200;

    return next.handle().pipe(
      map((data) => {
        // Avoid double wrapping if already formatted
        if (data && data.statusCode && data.meta && data.meta.timestamp) {
          return data;
        }

        const message = data?.message || 'Success';

        // Clean up data to avoid duplicating message in data payload
        let responseData = data;
        if (data && typeof data === 'object' && 'message' in data) {
          const { message: _, ...rest } = data;
          // if rest has data property (e.g., { message, data }), use rest.data
          responseData =
            rest.data !== undefined && Object.keys(rest).length === 1 ? rest.data : rest;
          // exception for auth where it returns { message, user } or { accessToken, refreshToken, user }
          if (Object.keys(responseData).length === 0) {
            responseData = null;
          }
        }

        return {
          statusCode,
          message,
          data: responseData,
          meta: {
            timestamp: new Date().toISOString(),
          },
        };
      }),
    );
  }
}
