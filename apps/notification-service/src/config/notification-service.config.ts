import { plainToInstance, Type } from 'class-transformer';
import { IsEnum, IsNumber, IsOptional, IsString, validateSync } from 'class-validator';

export enum Environment {
  Development = 'development',
  Production = 'production',
  Test = 'test',
}

export class NotificationServiceConfigDto {
  @IsEnum(Environment)
  @IsOptional()
  NODE_ENV: Environment = Environment.Development;

  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  NOTIFICATION_SERVICE_PORT = 3012;

  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  NOTIFICATION_SERVICE_TCP_PORT = 3002;

  @IsString()
  NOTIFICATION_SERVICE_MONGO_URI!: string;

  @IsString()
  RABBITMQ_URL!: string;

  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  GATEWAY_TCP_PORT = 4000;

  @IsString()
  @IsOptional()
  // Default to localhost for local development outside Docker. Overridden via compose environment variables.
  GATEWAY_TCP_HOST = 'localhost';
}

export function validate(config: Record<string, unknown>) {
  const validatedConfig = plainToInstance(NotificationServiceConfigDto, config, {
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
