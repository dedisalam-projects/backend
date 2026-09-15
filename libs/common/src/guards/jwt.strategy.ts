import { Injectable, UnauthorizedException, Inject, Optional } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

export const extractJwtFromAuthOrCookie = (req: any): string | null => {
  if (!req) return null;
  let token: string | null = null;
  if (req.headers) {
    token = ExtractJwt.fromAuthHeaderAsBearerToken()(req);
  }
  if (!token && req.cookies?.accessToken) {
    token = req.cookies.accessToken;
  }
  return token || null;
};

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    configService: ConfigService,
    @Optional() @Inject('REDIS_CLIENT') private readonly redis?: Redis,
  ) {
    super({
      jwtFromRequest: extractJwtFromAuthOrCookie,
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('JWT_SECRET') || 'supersecretjwtkey12345',
      passReqToCallback: true,
    });
  }

  async validate(req: any, payload: any) {
    if (!payload) {
      throw new UnauthorizedException();
    }

    if (this.redis) {
      const token = extractJwtFromAuthOrCookie(req);
      if (token) {
        const isBlacklisted = await this.redis.get(`blacklist:${token}`);
        if (isBlacklisted) {
          throw new UnauthorizedException('Token has been revoked');
        }
      }
    }

    return payload;
  }
}
