import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
  OnGatewayInit,
  OnGatewayConnection,
  OnGatewayDisconnect,
  WsException,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Inject, Logger, UseFilters, UsePipes, ValidationPipe } from '@nestjs/common';

import { ConfigService } from '@nestjs/config';
import { ClientProxy } from '@nestjs/microservices';
import { firstValueFrom, timeout } from 'rxjs';
import * as jwt from 'jsonwebtoken';
import * as cookie from 'cookie';
import {
  AdminCreateUserDto,
  AdminUpdateUserDto,
  UserPaginationQueryDto,
  WsExceptionFilter,
} from '@dedisalam/common';

@WebSocketGateway({
  namespace: '/users',
  cors: {
    origin: '*',
    credentials: true,
  },
})
@UseFilters(new WsExceptionFilter())
@UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
export class UserGateway implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
  private readonly logger = new Logger(UserGateway.name);

  @WebSocketServer()
  server!: Server;

  constructor(
    @Inject('USER_SERVICE') private readonly userService: ClientProxy,
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
    if (client.data?.user) {
      this.logger.log(`Client authenticated on /users: ${client.data.user.email} (${client.id})`);
      return;
    }

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
      const decoded = jwt.verify(token, secret) as any;
      client.data = client.data || {};
      client.data.user = decoded;
      this.logger.log(`Client authenticated on /users: ${decoded.email} (${client.id})`);
    } catch {
      this.logger.warn(`Connection rejected for client ${client.id}: Invalid token`);
      client.emit('exception', {
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'Invalid or expired token' },
      });
      client.disconnect(true);
    }
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected from /users: ${client.id}`);
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

  @SubscribeMessage('user:profile')
  async handleGetProfile(@ConnectedSocket() client: Socket) {
    const userId = client.data?.user?.sub;
    if (!userId) {
      throw new WsException({ code: 'UNAUTHORIZED', message: 'User session not found' });
    }
    const response = await firstValueFrom(
      this.userService.send('user.profile', { userId }).pipe(timeout(5000)),
    );
    return {
      success: true,
      data: response,
      meta: { timestamp: new Date().toISOString() },
    };
  }

  @SubscribeMessage('user:update_profile')
  async handleUpdateProfile(@ConnectedSocket() client: Socket, @MessageBody() body: any) {
    const userId = client.data?.user?.sub;
    if (!userId) {
      throw new WsException({ code: 'UNAUTHORIZED', message: 'User session not found' });
    }
    const response = await firstValueFrom(
      this.userService.send('user.update', { userId, ...body }).pipe(timeout(5000)),
    );
    return {
      success: true,
      data: response,
      meta: { timestamp: new Date().toISOString() },
    };
  }

  @SubscribeMessage('admin:join')
  async handleAdminJoin(@ConnectedSocket() client: Socket) {
    this.checkAdmin(client);
    client.join('admin:users');
    this.logger.log(`Admin ${client.data.user.email} joined room: admin:users`);
    return {
      success: true,
      data: { room: 'admin:users', joined: true },
      meta: { timestamp: new Date().toISOString() },
    };
  }

  @SubscribeMessage('admin:users:list')
  async handleAdminListUsers(
    @ConnectedSocket() client: Socket,
    @MessageBody() query: UserPaginationQueryDto,
  ) {
    this.checkAdmin(client);
    const response = await firstValueFrom(
      this.userService.send('user.list.paginated', query || {}).pipe(timeout(5000)),
    );
    return {
      success: true,
      data: response,
      meta: { timestamp: new Date().toISOString() },
    };
  }

  @SubscribeMessage('admin:users:create')
  async handleAdminCreateUser(
    @ConnectedSocket() client: Socket,
    @MessageBody() body: AdminCreateUserDto,
  ) {
    this.checkAdmin(client);
    const response = await firstValueFrom(
      this.userService.send('user.create', body).pipe(timeout(5000)),
    );

    // Live broadcast to all connected admin dashboards in the 'admin:users' room
    this.server.to('admin:users').emit('user:created', response);
    this.logger.log(`Broadcasted user:created event for user ${response.email} to admin:users`);

    return {
      success: true,
      data: response,
      meta: { timestamp: new Date().toISOString() },
    };
  }

  @SubscribeMessage('admin:users:update')
  async handleAdminUpdateUser(
    @ConnectedSocket() client: Socket,
    @MessageBody() body: AdminUpdateUserDto,
  ) {
    this.checkAdmin(client);
    const response = await firstValueFrom(
      this.userService.send('user.update.admin', body).pipe(timeout(5000)),
    );

    // Live broadcast update to all connected admins
    this.server.to('admin:users').emit('user:updated', response);
    this.logger.log(`Broadcasted user:updated event for user ${response.id} to admin:users`);

    return {
      success: true,
      data: response,
      meta: { timestamp: new Date().toISOString() },
    };
  }

  @SubscribeMessage('admin:users:delete')
  async handleAdminDeleteUser(
    @ConnectedSocket() client: Socket,
    @MessageBody() body: { userId: string },
  ) {
    this.checkAdmin(client);
    if (!body?.userId) {
      throw new WsException({ code: 'BAD_REQUEST', message: 'userId is required' });
    }
    const response = await firstValueFrom(
      this.userService.send('user.delete', { userId: body.userId }).pipe(timeout(5000)),
    );

    // Live broadcast deletion to all connected admins
    this.server.to('admin:users').emit('user:deleted', { userId: body.userId });
    this.logger.log(`Broadcasted user:deleted event for user ${body.userId} to admin:users`);

    return {
      success: true,
      data: response,
      meta: { timestamp: new Date().toISOString() },
    };
  }
}
