import { plainToInstance, Type } from 'class-transformer';
import { IsEnum, IsNumber, IsOptional, IsString, validateSync } from 'class-validator';

export enum Environment {
  Development = 'development',
  Production = 'production',
  Test = 'test',
}

export class AuthServiceConfigDto {
  @IsEnum(Environment)
  @IsOptional()
  NODE_ENV: Environment = Environment.Development;

  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  PORT = 3015;

  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  AUTH_SERVICE_PORT?: number;

  @IsString()
  @IsOptional()
  MONGODB_URI = 'mongodb://root:***@localhost:27017?authSource=admin';

  @IsString()
  @IsOptional()
  AUTH_SERVICE_MONGO_URI?: string;

  @IsString()
  @IsOptional()
  RABBITMQ_URL = 'amqp://guest:guest@localhost:5672';

  @IsString()
  @IsOptional()
  REDIS_URL = 'redis://localhost:6379';

  @IsString()
  @IsOptional()
  JWT_SECRET = 'dedisalam_development_jwt_secret_2026';

  @IsString()
  @IsOptional()
  DEFAULT_SUPERADMIN_EMAIL = 'superadmin@example.com';

  @IsString()
  @IsOptional()
  DEFAULT_SUPERADMIN_PASSWORD = 'Admin123!';
}

export function validate(config: Record<string, unknown>) {
  const validatedConfig = plainToInstance(AuthServiceConfigDto, config);
  const errors = validateSync(validatedConfig);

  if (errors.length > 0) {
    throw new Error(errors.toString());
  }
  return validatedConfig;
}
