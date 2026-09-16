import { plainToInstance, Type } from 'class-transformer';
import { IsEnum, IsNumber, IsOptional, IsString, validateSync } from 'class-validator';

export enum Environment {
  Development = 'development',
  Production = 'production',
  Test = 'test',
}

export class GatewayConfigDto {
  @IsEnum(Environment)
  @IsOptional()
  NODE_ENV: Environment = Environment.Development;

  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  PORT = 3000;

  @IsString()
  JWT_SECRET!: string;

  @IsString()
  @IsOptional()
  JWT_EXPIRES_IN = '15m';

  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  USER_SERVICE_TCP_PORT = 3001;

  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  GATEWAY_TCP_PORT = 4000;

  @IsString()
  @IsOptional()
  // Default to localhost for local development outside Docker. Overridden via compose environment variables.
  USER_SERVICE_TCP_HOST = 'localhost';

  @IsString()
  @IsOptional()
  REDIS_URL = 'redis://localhost:6379';

  @IsString()
  @IsOptional()
  COOKIE_DOMAIN?: string;

  @IsString()
  @IsOptional()
  REFRESH_COOKIE_PATH = '/api/v1/auth';
}

export function validate(config: Record<string, unknown>) {
  const validatedConfig = plainToInstance(GatewayConfigDto, config, {
    enableImplicitConversion: true,
  });
  const errors = validateSync(validatedConfig, {
    skipMissingProperties: false,
  });

  if (errors.length > 0) {
    throw new Error(errors.toString());
  }
  return validatedConfig;
}
