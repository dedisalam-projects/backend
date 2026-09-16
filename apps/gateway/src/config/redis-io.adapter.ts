import { IoAdapter } from '@nestjs/platform-socket.io';
import { ServerOptions } from 'socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import Redis from 'ioredis';
import { INestApplicationContext } from '@nestjs/common';

export class RedisIoAdapter extends IoAdapter {
  private adapterConstructor?: ReturnType<typeof createAdapter>;

  constructor(
    appOrExpress: INestApplicationContext,
    private readonly redisUrl: string,
  ) {
    super(appOrExpress);
  }

  async connectToRedis(): Promise<void> {
    const pubClient = new Redis(this.redisUrl);
    const subClient = pubClient.duplicate();

    this.adapterConstructor = createAdapter(pubClient, subClient);
  }

  override createIOServer(
    port: number,
    options?: ServerOptions,
  ): ReturnType<IoAdapter['createIOServer']> {
    const allowedOriginPatterns = [
      /^https?:\/\/([a-zA-Z0-9-]+\.)*localhost:(3000|4000|4001|4002|4200)$/,
      /^https?:\/\/127\.0\.0\.1:(3000|4000|4001|4002|4200)$/,
      /^https:\/\/([a-zA-Z0-9-]+\.)*dedisalam\.my\.id$/,
    ];

    const serverOptions = {
      ...options,
      cors: {
        origin: (
          origin: string | undefined,
          callback: (err: Error | null, allow?: boolean) => void,
        ) => {
          // Allow requests with no origin (like mobile apps, server-to-server)
          if (!origin) return callback(null, true);
          const isAllowed = allowedOriginPatterns.some((pattern) => pattern.test(origin));
          if (isAllowed) return callback(null, true);
          return callback(
            new Error(`Origin ${origin} is not allowed by CORS security policy`),
            false,
          );
        },
        credentials: true,
        methods: ['GET', 'POST'],
      },
      transports: ['websocket', 'polling'],
    };
    const server = super.createIOServer(port, serverOptions as unknown as ServerOptions);

    if (this.adapterConstructor) {
      server.adapter(this.adapterConstructor);
    }
    return server;
  }
}
