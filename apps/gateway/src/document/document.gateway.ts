import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
  OnGatewayInit,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as jwt from 'jsonwebtoken';

@WebSocketGateway({
  namespace: '/documents',
  cors: {
    origin: '*',
    credentials: true,
  },
})
export class DocumentGateway implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
  private readonly logger = new Logger(DocumentGateway.name);

  @WebSocketServer()
  server!: Server;

  constructor(private readonly configService: ConfigService) {}

  afterInit(server: Server) {
    this.logger.log('DocumentGateway initialized on namespace /documents');
  }

  handleConnection(client: Socket) {
    const token = this.extractToken(client);
    if (token) {
      try {
        const secret = this.configService.get<string>('JWT_SECRET') as string;
        const decoded = jwt.verify(token, secret);
        client.data = client.data || {};
        client.data.user = decoded;
        this.logger.log(`Client authenticated on /documents: ${client.id}`);
      } catch {
        this.logger.debug(`Client connected without valid JWT token on /documents: ${client.id}`);
      }
    } else {
      this.logger.log(`Client connected anonymously on /documents: ${client.id}`);
    }
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected from /documents: ${client.id}`);
  }

  @SubscribeMessage('join:provider')
  handleJoinProvider(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { provider: string },
  ) {
    if (payload?.provider) {
      client.join(payload.provider);
      this.logger.log(`Client ${client.id} joined room: ${payload.provider}`);
      return { success: true, room: payload.provider };
    }
    return { success: false, message: 'Provider name required' };
  }

  @SubscribeMessage('leave:provider')
  handleLeaveProvider(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { provider: string },
  ) {
    if (payload?.provider) {
      client.leave(payload.provider);
      this.logger.log(`Client ${client.id} left room: ${payload.provider}`);
      return { success: true, room: payload.provider };
    }
    return { success: false, message: 'Provider name required' };
  }

  notifyCreated(provider: string, doc: any) {
    this.server.to(provider).emit('document:created', { provider, data: doc });
    this.server.emit('document:created', { provider, data: doc });
  }

  notifyUpdated(provider: string, doc: any) {
    this.server.to(provider).emit('document:updated', { provider, data: doc });
    this.server.emit('document:updated', { provider, data: doc });
  }

  notifyDeleted(provider: string, id: string) {
    this.server.to(provider).emit('document:deleted', { provider, id });
    this.server.emit('document:deleted', { provider, id });
  }

  notifyGenerated(provider: string, doc: any) {
    this.server.to(provider).emit('document:generated', { provider, data: doc });
    this.server.emit('document:generated', { provider, data: doc });
  }

  private extractToken(client: Socket): string | null {
    const authHeader = client.handshake.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      return authHeader.split(' ')[1];
    }
    const tokenQuery = client.handshake.query?.token;
    if (typeof tokenQuery === 'string') {
      return tokenQuery;
    }
    return null;
  }
}
