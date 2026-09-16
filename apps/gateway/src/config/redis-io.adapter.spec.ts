import { RedisIoAdapter } from './redis-io.adapter';
import { INestApplicationContext } from '@nestjs/common';
import { IoAdapter } from '@nestjs/platform-socket.io';
import { ServerOptions } from 'socket.io';

// Mock ioredis and @socket.io/redis-adapter
jest.mock('ioredis', () => {
  return jest.fn().mockImplementation(() => ({
    duplicate: jest.fn().mockReturnValue({}),
  }));
});

jest.mock('@socket.io/redis-adapter', () => ({
  createAdapter: jest.fn().mockReturnValue(jest.fn()),
}));

interface MockServerOptions {
  cors: {
    origin: (origin: string | null, callback: (err: Error | null, allow?: boolean) => void) => void;
  };
}

describe('RedisIoAdapter', () => {
  let adapter: RedisIoAdapter;
  let mockApp: Partial<INestApplicationContext>;
  let mockServer: { adapter: jest.Mock };

  beforeEach(() => {
    mockApp = {};
    adapter = new RedisIoAdapter(mockApp as INestApplicationContext, 'redis://localhost:6379');

    mockServer = {
      adapter: jest.fn(),
    };
    jest
      .spyOn(IoAdapter.prototype, 'createIOServer')
      .mockReturnValue(mockServer as unknown as ReturnType<IoAdapter['createIOServer']>);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('connectToRedis', () => {
    it('should initialize Redis pub and sub clients and build adapterConstructor', async () => {
      await adapter.connectToRedis();
      expect(
        (adapter as unknown as { adapterConstructor?: unknown }).adapterConstructor,
      ).toBeDefined();
    });
  });

  describe('createIOServer', () => {
    it('should create io server and attach adapter when adapterConstructor exists', async () => {
      await adapter.connectToRedis();

      const server = adapter.createIOServer(3000, { cors: {} } as unknown as ServerOptions);

      expect(mockServer.adapter).toHaveBeenCalledWith(
        (adapter as unknown as { adapterConstructor?: unknown }).adapterConstructor,
      );
      expect(server).toBe(mockServer);
    });

    it('should create io server without adapter when connectToRedis was not called', () => {
      const server = adapter.createIOServer(3000);

      expect(mockServer.adapter).not.toHaveBeenCalled();
      expect(server).toBe(mockServer);
    });

    it('should test cors origin callback with and without origin', () => {
      let passedOptions!: MockServerOptions;
      jest.spyOn(IoAdapter.prototype, 'createIOServer').mockImplementation((port, options) => {
        passedOptions = options as unknown as MockServerOptions;
        return mockServer as unknown as ReturnType<IoAdapter['createIOServer']>;
      });

      adapter.createIOServer(3000);

      expect(passedOptions).toBeDefined();
      expect(typeof passedOptions.cors.origin).toBe('function');

      // Test with no origin
      const callbackNoOrigin = jest.fn();
      passedOptions.cors.origin(null, callbackNoOrigin);
      expect(callbackNoOrigin).toHaveBeenCalledWith(null, true);

      // Test with origin
      const callbackWithOrigin = jest.fn();
      passedOptions.cors.origin('https://admin.localhost:3000', callbackWithOrigin);
      expect(callbackWithOrigin).toHaveBeenCalledWith(null, true);

      // Test with disallowed origin
      const callbackDisallowed = jest.fn();
      passedOptions.cors.origin('https://disallowed.com', callbackDisallowed);
      expect(callbackDisallowed).toHaveBeenCalledWith(expect.any(Error), false);
    });
  });
});
