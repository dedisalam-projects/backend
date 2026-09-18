import { RedisIoAdapter } from './redis-io.adapter';
import { INestApplicationContext } from '@nestjs/common';
import { IoAdapter } from '@nestjs/platform-socket.io';
import { ServerOptions } from 'socket.io';

// Mock ioredis and @socket.io/redis-adapter
import Redis from 'ioredis';
import { createAdapter } from '@socket.io/redis-adapter';

jest.mock('ioredis', () => {
  return jest.fn().mockImplementation(() => ({
    duplicate: jest.fn().mockReturnValue({ isDuplicate: true }),
  }));
});

jest.mock('@socket.io/redis-adapter', () => ({
  createAdapter: jest.fn().mockReturnValue(jest.fn()),
}));

interface MockServerOptions {
  cors: {
    origin: (origin: string | null, callback: (err: Error | null, allow?: boolean) => void) => void;
    credentials?: boolean;
    methods?: string[];
  };
  transports?: string[];
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
      expect(Redis).toHaveBeenCalledWith('redis://localhost:6379');

      const mockRedisInstance = (Redis as unknown as jest.Mock).mock.results[0].value;
      expect(mockRedisInstance.duplicate).toHaveBeenCalled();

      expect(createAdapter).toHaveBeenCalledWith(
        mockRedisInstance,
        expect.objectContaining({ isDuplicate: true }),
      );

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
      expect(passedOptions.cors.credentials).toBe(true);
      expect(passedOptions.cors.methods).toEqual(['GET', 'POST']);
      expect(passedOptions.transports).toEqual(['websocket', 'polling']);

      // Test with no origin
      const callbackNoOrigin = jest.fn();
      passedOptions.cors.origin(null, callbackNoOrigin);
      expect(callbackNoOrigin).toHaveBeenCalledWith(null, true);

      // Test with allowed origins (Regex boundary check)
      const allowedOrigins = [
        'http://localhost:3000',
        'https://admin.localhost:4200',
        'http://127.0.0.1:4000',
        'https://dedisalam.my.id',
        'https://app.dedisalam.my.id',
      ];
      allowedOrigins.forEach((origin) => {
        const cb = jest.fn();
        passedOptions.cors.origin(origin, cb);
        expect(cb).toHaveBeenCalledWith(null, true);
      });

      // Test with disallowed origins
      const disallowedOrigins = [
        'https://disallowed.com',
        'http://dedisalam.my.id', // http instead of https for dedisalam
        'http://localhost:3001', // unsupported port
        'https://127.0.0.1:80', // unsupported port
        'http://attackerlocalhost:3000', // missing dot or protocol
      ];
      disallowedOrigins.forEach((origin) => {
        const cb = jest.fn();
        passedOptions.cors.origin(origin, cb);
        expect(cb).toHaveBeenCalledWith(expect.any(Error), false);
      });
    });
  });
});
