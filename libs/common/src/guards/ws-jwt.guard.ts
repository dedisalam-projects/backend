import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { WsException } from '@nestjs/websockets';
import { ConfigService } from '@nestjs/config';
import * as jwt from 'jsonwebtoken';
import * as cookie from 'cookie';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import { JwtPayload } from '../interfaces';

export interface WsClientSocket {
  handshake?: {
    auth?: { token?: string };
    headers?: { authorization?: string; cookie?: string };
    query?: { token?: string | string[] };
  };
  data?: { user?: JwtPayload; [key: string]: unknown };
}

@Injectable()
export class WsJwtGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly configService: ConfigService,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    const client = context.switchToWs().getClient<WsClientSocket>();
    const token = this.extractToken(client);

    if (!token) {
      throw new WsException({ code: 'UNAUTHORIZED', message: 'Authentication token is missing' });
    }

    try {
      const secret = this.configService.get<string>('JWT_SECRET');
      if (!secret) {
        throw new Error('JWT_SECRET is not defined in configuration');
      }

      const decoded = jwt.verify(token, secret) as unknown as JwtPayload;
      client.data = client.data || {};
      client.data.user = decoded;
      return true;
    } catch {
      throw new WsException({ code: 'UNAUTHORIZED', message: 'Invalid or expired token' });
    }
  }

  private extractToken(client?: WsClientSocket | null): string | null {
    if (!client || !client.handshake) {
      return null;
    }

    // 1. Check handshake auth payload (socket.handshake.auth.token)
    if (client.handshake.auth?.token) {
      const token = client.handshake.auth.token;
      return token.startsWith('Bearer ') ? token.slice(7) : token;
    }

    // 2. Check authorization header
    const authHeader = client.handshake.headers?.authorization;
    if (authHeader && typeof authHeader === 'string') {
      return authHeader.startsWith('Bearer ') ? authHeader.slice(7) : authHeader;
    }

    // 3. Check handshake query param
    if (client.handshake.query?.token) {
      const token = client.handshake.query.token;
      return typeof token === 'string' ? token : null;
    }

    // 4. Fallback to HttpOnly cookie sent automatically by browser
    if (client.handshake.headers?.cookie && typeof client.handshake.headers.cookie === 'string') {
      const parsedCookies = cookie.parse(client.handshake.headers.cookie);
      if (parsedCookies['accessToken']) {
        return parsedCookies['accessToken'];
      }
    }

    return null;
  }
}
