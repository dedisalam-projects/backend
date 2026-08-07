import { Injectable, UnauthorizedException, Inject, Optional } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    configService: ConfigService,
    @Optional() @Inject('REDIS_CLIENT') private readonly redis: Redis,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
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
      const token = ExtractJwt.fromAuthHeaderAsBearerToken()(req);
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
