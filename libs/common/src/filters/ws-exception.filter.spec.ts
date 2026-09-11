import { WsExceptionFilter } from './ws-exception.filter';
import { HttpException, HttpStatus } from '@nestjs/common';
import { WsException } from '@nestjs/websockets';

describe('WsExceptionFilter', () => {
  let filter: WsExceptionFilter;
  let mockClient: any;
  let mockHost: any;
  let ackCallback: jest.Mock;

  beforeEach(() => {
    filter = new WsExceptionFilter();
    mockClient = {
      emit: jest.fn(),
    };
    ackCallback = jest.fn();

    mockHost = {
      switchToWs: () => ({
        getClient: () => mockClient,
      }),
      getArgs: () => [{}, ackCallback],
    };
  });

  describe('HttpException handling', () => {
    it('should format HttpException with string response message', () => {
      const exception = new HttpException('Forbidden Resource', HttpStatus.FORBIDDEN);

      filter.catch(exception, mockHost);

      expect(ackCallback).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: {
            code: 'HTTP_403',
            message: 'Forbidden Resource',
          },
        }),
      );
    });

    it('should format HttpException with validation array message into VALIDATION_ERROR', () => {
      const exception = new HttpException(
        { message: ['email must be an email', 'password is too short'] },
        HttpStatus.BAD_REQUEST,
      );

      filter.catch(exception, mockHost);

      expect(ackCallback).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Validation failed',
            details: ['email must be an email', 'password is too short'],
          },
        }),
      );
    });

    it('should format HttpException with object response and custom error name', () => {
      const exception = new HttpException(
        { error: 'Conflict Detected', message: 'Email in use', details: { field: 'email' } },
        HttpStatus.CONFLICT,
      );

      filter.catch(exception, mockHost);

      expect(ackCallback).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: {
            code: 'CONFLICT_DETECTED',
            message: 'Email in use',
            details: { field: 'email' },
          },
        }),
      );
    });

    it('should format HttpException with object response without error field', () => {
      const exception = new HttpException({ message: 'Not Acceptable' }, HttpStatus.NOT_ACCEPTABLE);

      filter.catch(exception, mockHost);

      expect(ackCallback).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: {
            code: 'HTTP_406',
            message: 'Not Acceptable',
          },
        }),
      );
    });
    it('should format HttpException with object response without message field falling back to exception.message', () => {
      const exception = new HttpException({ error: 'Teapot' }, HttpStatus.I_AM_A_TEAPOT);

      filter.catch(exception, mockHost);

      expect(ackCallback).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: {
            code: 'TEAPOT',
            message: exception.message,
          },
        }),
      );
    });

    it('should handle HttpException with null response', () => {
      const exception = new HttpException(null as any, HttpStatus.BAD_REQUEST);

      filter.catch(exception, mockHost);

      expect(ackCallback).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
        }),
      );
    });
  });

  describe('WsException handling', () => {
    it('should format WsException with string error', () => {
      const exception = new WsException('Custom WebSocket Error');

      filter.catch(exception, mockHost);

      expect(ackCallback).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: {
            code: 'WS_ERROR',
            message: 'Custom WebSocket Error',
          },
        }),
      );
    });

    it('should format WsException with null error', () => {
      const exception = new WsException(null as any);

      filter.catch(exception, mockHost);

      expect(ackCallback).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: {
            code: 'INTERNAL_ERROR',
            message: 'An unexpected error occurred',
          },
        }),
      );
    });

    it('should format WsException with object error containing code and details', () => {
      const exception = new WsException({
        code: 'ROOM_FULL',
        message: 'Maximum limit reached',
        details: { max: 100 },
      });

      filter.catch(exception, mockHost);

      expect(ackCallback).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: {
            code: 'ROOM_FULL',
            message: 'Maximum limit reached',
            details: { max: 100 },
          },
        }),
      );
    });

    it('should format WsException with empty object error using defaults', () => {
      const exception = new WsException({});

      filter.catch(exception, mockHost);

      expect(ackCallback).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: {
            code: 'WS_ERROR',
            message: 'WebSocket error',
          },
        }),
      );
    });
  });

  describe('Generic Error and unknown exceptions', () => {
    it('should format standard Error instance', () => {
      const exception = new Error('Database connection failed');

      filter.catch(exception, mockHost);

      expect(ackCallback).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: {
            code: 'ERROR',
            message: 'Database connection failed',
          },
        }),
      );
    });

    it('should format error with custom name or empty name', () => {
      const errWithoutName = new Error('No name error');
      errWithoutName.name = '';

      filter.catch(errWithoutName, mockHost);

      expect(ackCallback).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: {
            code: 'INTERNAL_ERROR',
            message: 'No name error',
          },
        }),
      );
    });

    it('should format string exception', () => {
      filter.catch('Raw string exception', mockHost);

      expect(ackCallback).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: {
            code: 'INTERNAL_ERROR',
            message: 'Raw string exception',
          },
        }),
      );
    });

    it('should format unknown primitive exception', () => {
      filter.catch({ custom: 123 }, mockHost);

      expect(ackCallback).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: {
            code: 'INTERNAL_ERROR',
            message: 'Unknown exception occurred',
          },
        }),
      );
    });
  });

  describe('Dispatch mechanisms', () => {
    it('should emit to client when ackCallback is omitted', () => {
      mockHost.getArgs = () => [{}]; // no function arg

      filter.catch(new Error('Boom'), mockHost);

      expect(mockClient.emit).toHaveBeenCalledWith(
        'exception',
        expect.objectContaining({
          success: false,
          error: expect.objectContaining({
            message: 'Boom',
          }),
        }),
      );
    });

    it('should handle missing client gracefully when no ackCallback', () => {
      mockHost.getArgs = () => [{}];
      mockHost.switchToWs = () => ({ getClient: () => null });

      expect(() => filter.catch(new Error('Boom'), mockHost)).not.toThrow();
    });
  });
});
