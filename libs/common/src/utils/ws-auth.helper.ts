import * as jwt from 'jsonwebtoken';
import * as cookie from 'cookie';
import { Socket } from 'socket.io';
import { WsException } from '@nestjs/websockets';
import { JwtPayload } from '../interfaces/jwt-payload.interface';

export function extractSocketToken(client: Socket): string | null {
  if (client.handshake?.auth?.['token'] && typeof client.handshake.auth['token'] === 'string') {
    const t = client.handshake.auth['token'];
    return t.startsWith('Bearer ') ? t.slice(7) : t;
  }
  const authHeader = client.handshake?.headers?.authorization;
  if (authHeader && typeof authHeader === 'string') {
    return authHeader.startsWith('Bearer ') ? authHeader.slice(7) : authHeader;
  }
  if (client.handshake?.query?.['token'] && typeof client.handshake.query['token'] === 'string') {
    return client.handshake.query['token'];
  }
  if (client.handshake?.headers?.cookie && typeof client.handshake.headers.cookie === 'string') {
    const parsedCookies = cookie.parse(client.handshake.headers.cookie);
    return parsedCookies['accessToken'] || null;
  }
  return null;
}

export function createWsJwtAuthMiddleware(
  secretOrResolver: string | (() => string) | { get: (k: string) => any },
  logger?: { error: (msg: string) => void },
) {
  return (client: Socket, next: (err?: Error) => void) => {
    const token = extractSocketToken(client);
    if (!token) {
      return next(new Error('UNAUTHORIZED: Authentication token is required'));
    }

    try {
      let resolvedSecret = '';
      if (typeof secretOrResolver === 'function') {
        resolvedSecret = secretOrResolver() || '';
      } else if (secretOrResolver && typeof (secretOrResolver as any).get === 'function') {
        resolvedSecret = (secretOrResolver as any).get('JWT_SECRET') || '';
      } else {
        resolvedSecret = (secretOrResolver as string) || '';
      }

      if (!resolvedSecret) {
        throw new Error('JWT secret is missing');
      }

      const decoded = jwt.verify(token, resolvedSecret) as unknown as JwtPayload;
      client.data = client.data || {};
      client.data.user = decoded;
      next();
    } catch (err: any) {
      logger?.error?.(`Error verifying token: ${err.message}`);
      next(new Error('UNAUTHORIZED: Invalid or expired token'));
    }
  };
}

export function authenticateSocketConnection(
  client: Socket,
  secret: string,
  logger?: { log: (msg: string) => void; warn: (msg: string) => void },
  namespaceLabel = '',
): JwtPayload | null {
  if (client.data?.user) {
    logger?.log?.(
      `Client authenticated${namespaceLabel ? ' on ' + namespaceLabel : ''}: ${client.data.user.email} (${client.id})`,
    );
    return client.data.user;
  }

  const token = extractSocketToken(client);
  if (!token) {
    logger?.warn?.(`Connection rejected for client ${client.id}: Missing token`);
    client.emit('exception', {
      success: false,
      error: { code: 'UNAUTHORIZED', message: 'Authentication token is required' },
    });
    client.disconnect(true);
    return null;
  }

  try {
    const decoded = jwt.verify(token, secret) as unknown as JwtPayload;
    client.data = client.data || {};
    client.data.user = decoded;
    logger?.log?.(
      `Client authenticated${namespaceLabel ? ' on ' + namespaceLabel : ''}: ${decoded.email} (${client.id})`,
    );
    return decoded;
  } catch {
    logger?.warn?.(`Connection rejected for client ${client.id}: Invalid token`);
    client.emit('exception', {
      success: false,
      error: { code: 'UNAUTHORIZED', message: 'Invalid or expired token' },
    });
    client.disconnect(true);
    return null;
  }
}

export function assertSocketAdmin(client: Socket): void {
  const user = client.data?.user;
  if (!user) {
    throw new WsException({ code: 'UNAUTHORIZED', message: 'Not authenticated' });
  }
  let roles: string[];
  if (Array.isArray(user.roles)) {
    roles = user.roles;
  } else if (user.roles) {
    roles = [user.roles];
  } else if (user.role) {
    roles = [user.role];
  } else {
    roles = [];
  }

  if (!roles.includes('admin') && !roles.includes('super_admin')) {
    throw new WsException({
      code: 'FORBIDDEN',
      message: 'Forbidden: Admin privileges required',
    });
  }
}
