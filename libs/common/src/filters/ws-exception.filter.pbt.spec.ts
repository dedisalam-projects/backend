import * as fc from 'fast-check';
import { ArgumentsHost, HttpException, HttpStatus } from '@nestjs/common';
import { WsException } from '@nestjs/websockets';
import { WsExceptionFilter } from './ws-exception.filter';

describe('WsExceptionFilter Property-Based Testing (Fast-Check)', () => {
  let filter: WsExceptionFilter;

  beforeEach(() => {
    filter = new WsExceptionFilter();
  });

  it('should safely dispatch to ack callback without throwing for arbitrary exceptions', () => {
    fc.assert(
      fc.property(
        fc.oneof(
          fc.string(),
          fc.integer(),
          fc.boolean(),
          fc.dictionary(fc.string(), fc.anything()),
          fc.constant(null),
          fc.constant(undefined),
        ),
        (rawError) => {
          const ackCallback = jest.fn();
          const mockClient = { emit: jest.fn() };
          const mockHost = {
            switchToWs: () => ({ getClient: () => mockClient }),
            getArgs: () => [{}, ackCallback],
          };

          expect(() => filter.catch(rawError, mockHost as unknown as ArgumentsHost)).not.toThrow();
          expect(ackCallback).toHaveBeenCalledTimes(1);
          const response = ackCallback.mock.calls[0][0];
          expect(response).toMatchObject({
            success: false,
            error: {
              code: expect.any(String),
              message: expect.any(String),
            },
            meta: {
              timestamp: expect.any(String),
            },
          });
        },
      ),
      { numRuns: 100 },
    );
  });

  it('should safely fallback to client.emit("exception") when no ack callback is present', () => {
    fc.assert(
      fc.property(
        fc.oneof(
          fc.string().map((msg) => new Error(msg)),
          fc.string().map((msg) => new WsException(msg)),
          fc
            .record({
              message: fc.string(),
              status: fc.constantFrom(
                HttpStatus.BAD_REQUEST,
                HttpStatus.UNAUTHORIZED,
                HttpStatus.FORBIDDEN,
                HttpStatus.NOT_FOUND,
                HttpStatus.INTERNAL_SERVER_ERROR,
              ),
            })
            .map(({ message, status }) => new HttpException(message, status)),
        ),
        (exceptionInstance) => {
          const mockClient = { emit: jest.fn() };
          const mockHost = {
            switchToWs: () => ({ getClient: () => mockClient }),
            getArgs: () => [{}], // No callback in args
          };

          expect(() =>
            filter.catch(exceptionInstance, mockHost as unknown as ArgumentsHost),
          ).not.toThrow();
          expect(mockClient.emit).toHaveBeenCalledWith(
            'exception',
            expect.objectContaining({
              success: false,
              error: expect.objectContaining({
                code: expect.any(String),
                message: expect.any(String),
              }),
            }),
          );
        },
      ),
      { numRuns: 100 },
    );
  });
});
