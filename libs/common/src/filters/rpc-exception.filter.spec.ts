import { RpcExceptionFilter } from './rpc-exception.filter';
import {
  HttpException,
  HttpStatus,
  UnauthorizedException,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { RpcException } from '@nestjs/microservices';
import { firstValueFrom } from 'rxjs';

describe('RpcExceptionFilter', () => {
  let filter: RpcExceptionFilter;
  let mockHost: any;

  beforeEach(() => {
    filter = new RpcExceptionFilter();
    mockHost = {} as any;
  });

  describe('HttpException handling', () => {
    it('should serialize UnauthorizedException with status code 401', async () => {
      const exception = new UnauthorizedException('Invalid credentials');

      const observable = filter.catch(exception, mockHost);

      await expect(firstValueFrom(observable)).rejects.toEqual({
        statusCode: HttpStatus.UNAUTHORIZED,
        message: 'Invalid credentials',
        status: 'error',
      });
    });

    it('should serialize NotFoundException with status code 404', async () => {
      const exception = new NotFoundException('User not found');

      const observable = filter.catch(exception, mockHost);

      await expect(firstValueFrom(observable)).rejects.toEqual({
        statusCode: HttpStatus.NOT_FOUND,
        message: 'User not found',
        status: 'error',
      });
    });

    it('should handle HttpException with string response message', async () => {
      const exception = new HttpException('Forbidden resource', HttpStatus.FORBIDDEN);

      const observable = filter.catch(exception, mockHost);

      await expect(firstValueFrom(observable)).rejects.toEqual({
        statusCode: HttpStatus.FORBIDDEN,
        message: 'Forbidden resource',
        status: 'error',
      });
    });

    it('should join array messages when exception has validation errors', async () => {
      const exception = new BadRequestException({
        message: ['email must be an email', 'password is too short'],
        error: 'Bad Request',
      });

      const observable = filter.catch(exception, mockHost);

      await expect(firstValueFrom(observable)).rejects.toEqual({
        statusCode: HttpStatus.BAD_REQUEST,
        message: 'email must be an email, password is too short',
        status: 'error',
      });
    });

    it('should extract message from object response when message is string', async () => {
      const exception = new BadRequestException({
        message: 'Invalid input format',
        error: 'Bad Request',
      });

      const observable = filter.catch(exception, mockHost);

      await expect(firstValueFrom(observable)).rejects.toEqual({
        statusCode: HttpStatus.BAD_REQUEST,
        message: 'Invalid input format',
        status: 'error',
      });
    });
  });

  describe('RpcException handling', () => {
    it('should serialize RpcException with string error message', async () => {
      const exception = new RpcException('RPC service unavailable');

      const observable = filter.catch(exception, mockHost);

      await expect(firstValueFrom(observable)).rejects.toEqual({
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        message: 'RPC service unavailable',
        status: 'error',
      });
    });

    it('should serialize RpcException with object containing custom statusCode and message', async () => {
      const exception = new RpcException({
        statusCode: HttpStatus.CONFLICT,
        message: 'Resource conflict',
      });

      const observable = filter.catch(exception, mockHost);

      await expect(firstValueFrom(observable)).rejects.toEqual(
        expect.objectContaining({
          statusCode: HttpStatus.CONFLICT,
          message: 'Resource conflict',
          status: 'error',
        }),
      );
    });

    it('should serialize RpcException with empty or unknown error gracefully', async () => {
      const exception = new RpcException(null as any);

      const observable = filter.catch(exception, mockHost);

      await expect(firstValueFrom(observable)).rejects.toEqual({
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        message: 'Internal server error',
        status: 'error',
      });
    });
  });

  describe('Generic and Unknown Error handling', () => {
    it('should serialize standard Error with 500 status code', async () => {
      const exception = new Error('Database connection failed');

      const observable = filter.catch(exception, mockHost);

      await expect(firstValueFrom(observable)).rejects.toEqual({
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        message: 'Database connection failed',
        status: 'error',
      });
    });

    it('should serialize non-Error unknown thrown object with 500 status code', async () => {
      const exception = 'unexpected string thrown';

      const observable = filter.catch(exception, mockHost);

      await expect(firstValueFrom(observable)).rejects.toEqual({
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        message: 'Internal server error',
        status: 'error',
      });
    });
  });
});
