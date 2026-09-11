import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { WsException } from '@nestjs/websockets';
import { ROLES_KEY } from '../decorators/roles.decorator';

@Injectable()
export class WsRolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<string[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const client = context.switchToWs().getClient();
    const user = client.data?.user;

    if (!user) {
      throw new WsException({ code: 'UNAUTHORIZED', message: 'User not authenticated' });
    }

    const userRoles: string[] = Array.isArray(user.roles)
      ? user.roles
      : user.roles
        ? [user.roles]
        : user.role
          ? [user.role]
          : [];

    if (userRoles.length === 0) {
      throw new WsException({ code: 'FORBIDDEN', message: 'Insufficient permissions' });
    }

    const hasRole = requiredRoles.some((role) => userRoles.includes(role));
    if (!hasRole) {
      throw new WsException({
        code: 'FORBIDDEN',
        message: `Forbidden resource: requires one of [${requiredRoles.join(', ')}]`,
      });
    }

    return true;
  }
}
