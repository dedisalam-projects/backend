import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayInit,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  ConnectedSocket,
  MessageBody,
  WsException,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Inject, Logger, UseFilters, UsePipes, ValidationPipe } from '@nestjs/common';

import { ConfigService } from '@nestjs/config';
import { ClientProxy } from '@nestjs/microservices';
import { firstValueFrom, timeout } from 'rxjs';
import * as jwt from 'jsonwebtoken';
import * as cookie from 'cookie';
import { NotificationBroadcastDto, WsExceptionFilter } from '@dedisalam/common';

@WebSocketGateway({
  namespace: '/notifications',
  cors: {
    origin: '*',
    credentials: true,
  },
})
@UseFilters(new WsExceptionFilter())
@UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
export class NotificationGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  private readonly logger = new Logger(NotificationGateway.name);

  @WebSocketServer()
  server!: Server;

  constructor(
    @Inject('NOTIFICATION_SERVICE') private readonly notificationClient: ClientProxy,
    private readonly configService: ConfigService,
  ) {}

  afterInit(server: Server) {
    server.use((client: any, next: (err?: Error) => void) => {
      const token = this.extractToken(client);
      if (!token) {
        return next(new Error('UNAUTHORIZED: Authentication token is required'));
      }

      try {
        const secret = this.configService.get<string>('JWT_SECRET');
        if (!secret) throw new Error('JWT_SECRET is not configured');
        const decoded = jwt.verify(token, secret) as any;
        client.data = client.data || {};
        client.data.user = decoded;
        next();
      } catch {
        next(new Error('UNAUTHORIZED: Invalid or expired token'));
      }
    });
  }

  handleConnection(client: Socket) {
    let decoded = client.data?.user;

    if (!decoded) {
      const token = this.extractToken(client);
      if (!token) {
        this.logger.warn(`Connection rejected for client ${client.id}: Missing token`);
        client.emit('exception', {
          success: false,
          error: { code: 'UNAUTHORIZED', message: 'Authentication token is required' },
        });
        client.disconnect(true);
        return;
      }

      try {
        const secret = this.configService.get<string>('JWT_SECRET');
        if (!secret) throw new Error('JWT_SECRET is not configured');
        decoded = jwt.verify(token, secret) as any;
        client.data = client.data || {};
        client.data.user = decoded;
      } catch {
        this.logger.warn(`Connection rejected for client ${client.id}: Invalid token`);
        client.emit('exception', {
          success: false,
          error: { code: 'UNAUTHORIZED', message: 'Invalid or expired token' },
        });
        client.disconnect(true);
        return;
      }
    }

    // Join personal room for targeted push notifications and notifications broadcast channel
    const userRoom = `user_${decoded.sub}`;
    client.join(userRoom);
    client.join('notifications');
    this.logger.log(
      `Client ${client.id} joined personal notification room: ${userRoom} and notifications broadcast channel`,
    );

    client.emit('hello', {
      message: 'Connected to realtime notification stream',
      user: { id: decoded.sub, email: decoded.email },
    });
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected from /notifications: ${client.id}`);
  }

  private extractToken(client: Socket): string | null {
    if (client.handshake?.auth?.token) {
      const t = client.handshake.auth.token;
      return t.startsWith('Bearer ') ? t.slice(7) : t;
    }
    const authHeader = client.handshake?.headers?.authorization;
    if (authHeader && typeof authHeader === 'string') {
      return authHeader.startsWith('Bearer ') ? authHeader.slice(7) : authHeader;
    }
    if (client.handshake?.query?.token && typeof client.handshake.query.token === 'string') {
      return client.handshake.query.token;
    }
    if (client.handshake?.headers?.cookie && typeof client.handshake.headers.cookie === 'string') {
      const parsedCookies = cookie.parse(client.handshake.headers.cookie);
      if (parsedCookies['accessToken']) {
        return parsedCookies['accessToken'];
      }
    }
    return null;
  }

  private checkAdmin(client: Socket) {
    const user = client.data?.user;
    if (!user) {
      throw new WsException({ code: 'UNAUTHORIZED', message: 'Not authenticated' });
    }
    const roles: string[] = Array.isArray(user.roles)
      ? user.roles
      : user.roles
        ? [user.roles]
        : user.role
          ? [user.role]
          : [];

    if (!roles.includes('admin') && !roles.includes('super_admin')) {
      throw new WsException({
        code: 'FORBIDDEN',
        message: 'Forbidden: Admin privileges required',
      });
    }
  }

  @SubscribeMessage('notification:list')
  async handleListNotifications(@ConnectedSocket() client: Socket) {
    const userId = client.data?.user?.sub;
    if (!userId) {
      throw new WsException({ code: 'UNAUTHORIZED', message: 'User session not found' });
    }

    const response = await firstValueFrom(
      this.notificationClient.send('notification.list', { userId }).pipe(timeout(5000)),
    );

    return {
      success: true,
      data: response,
      meta: { timestamp: new Date().toISOString() },
    };
  }

  @SubscribeMessage('notification:mark_read')
  async handleMarkAsRead(@ConnectedSocket() client: Socket, @MessageBody() body: { id: string }) {
    const userId = client.data?.user?.sub;
    if (!userId || !body?.id) {
      throw new WsException({ code: 'BAD_REQUEST', message: 'Notification id is required' });
    }

    const response = await firstValueFrom(
      this.notificationClient
        .send('notification.markAsRead', { id: body.id, userId })
        .pipe(timeout(5000)),
    );

    return {
      success: true,
      data: response,
      meta: { timestamp: new Date().toISOString() },
    };
  }

  @SubscribeMessage('admin:notification:broadcast')
  async handleBroadcast(
    @ConnectedSocket() client: Socket,
    @MessageBody() body: NotificationBroadcastDto,
  ) {
    this.checkAdmin(client);

    const response = await firstValueFrom(
      this.notificationClient.send('notification.broadcast', body).pipe(timeout(5000)),
    );

    // If targeted to a specific recipient, emit to their room; otherwise emit to all
    if (body.recipientId) {
      this.server.to(`user_${body.recipientId}`).emit('notification:new', response);
    } else {
      this.server.emit('notification:broadcast', response);
    }

    return {
      success: true,
      data: response,
      meta: { timestamp: new Date().toISOString() },
    };
  }
}
