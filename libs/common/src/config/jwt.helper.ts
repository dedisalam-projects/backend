import type { ConfigService } from '@nestjs/config';
import type { JwtModuleOptions } from '@nestjs/jwt';

export function createJwtOptions(configService: ConfigService): JwtModuleOptions {
  const expiresIn = configService.get<string>('JWT_EXPIRES_IN') || '15m';
  return {
    secret: configService.get<string>('JWT_SECRET'),
    signOptions: {
      expiresIn: expiresIn as NonNullable<JwtModuleOptions['signOptions']>['expiresIn'],
    },
  };
}
