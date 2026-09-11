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
    const serverOptions = {
      ...options,
      cors: {
        origin: (origin: any, callback: any) => {
          // Allow requests with no origin (like mobile apps, server-to-server)
          if (!origin) return callback(null, true);
          // Allow all subdomains of any domain and localhost
          return callback(null, true);
        },
        credentials: true,
        methods: ['GET', 'POST'],
      },
      transports: ['websocket', 'polling'],
    };
    const server = super.createIOServer(port, serverOptions as any);

    if (this.adapterConstructor) {
      server.adapter(this.adapterConstructor);
    }
    return server;
  }
}
