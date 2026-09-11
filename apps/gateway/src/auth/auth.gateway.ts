import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  MessageBody,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Inject, Logger, UseFilters, UsePipes, ValidationPipe } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { firstValueFrom, timeout } from 'rxjs';
import { LoginDto, RegisterDto, RefreshTokenDto, WsExceptionFilter } from '@dedisalam/common';

@WebSocketGateway({
  namespace: '/auth',
  cors: {
    origin: '*',
    credentials: true,
  },
})
@UseFilters(new WsExceptionFilter())
@UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
export class AuthGateway {
  private readonly logger = new Logger(AuthGateway.name);

  @WebSocketServer()
  server!: Server;

  constructor(@Inject('USER_SERVICE') private readonly userService: ClientProxy) {}

  @SubscribeMessage('auth:login')
  async handleLogin(@MessageBody() body: LoginDto) {
    this.logger.log(`Handling auth:login for email: ${body.email}`);
    const response = await firstValueFrom(
      this.userService.send('auth.login', body).pipe(timeout(5000)),
    );
    return {
      success: true,
      data: response,
      meta: { timestamp: new Date().toISOString() },
    };
  }

  @SubscribeMessage('auth:register')
  async handleRegister(@MessageBody() body: RegisterDto) {
    this.logger.log(`Handling auth:register for email: ${body.email}`);
    const response = await firstValueFrom(
      this.userService.send('auth.register', body).pipe(timeout(5000)),
    );
    return {
      success: true,
      data: response,
      meta: { timestamp: new Date().toISOString() },
    };
  }

  @SubscribeMessage('auth:refresh')
  async handleRefresh(@MessageBody() body: RefreshTokenDto) {
    this.logger.log(`Handling auth:refresh for userId: ${body.userId}`);
    const response = await firstValueFrom(
      this.userService.send('auth.refresh', body).pipe(timeout(5000)),
    );
    return {
      success: true,
      data: response,
      meta: { timestamp: new Date().toISOString() },
    };
  }

  @SubscribeMessage('auth:logout')
  async handleLogout(
    @MessageBody() body: { refreshToken: string; accessToken?: string; userId?: string },
  ) {
    this.logger.log(`Handling auth:logout`);
    const response = await firstValueFrom(
      this.userService.send('auth.logout', body).pipe(timeout(5000)),
    );
    return {
      success: true,
      data: response,
      meta: { timestamp: new Date().toISOString() },
    };
  }
}
