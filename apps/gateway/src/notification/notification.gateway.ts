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
import {
  NotificationBroadcastDto,
  WsExceptionFilter,
  createWsJwtAuthMiddleware,
  authenticateSocketConnection,
  assertSocketAdmin,
  extractSocketToken,
} from '@dedisalam/common';

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

  extractToken(client: Socket): string | null {
    return extractSocketToken(client);
  }

  afterInit(server: Server) {
    server.use(createWsJwtAuthMiddleware(this.configService, this.logger));
  }

  handleConnection(client: Socket) {
    const secret = this.configService.get<string>('JWT_SECRET') || '';
    const decoded = authenticateSocketConnection(client, secret, this.logger, '/notifications');
    if (!decoded) return;

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

  private checkAdmin(client: Socket) {
    assertSocketAdmin(client);
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
