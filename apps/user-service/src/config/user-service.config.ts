import { plainToInstance, Type } from 'class-transformer';
import { IsEnum, IsNumber, IsOptional, IsString, validateSync } from 'class-validator';

export enum Environment {
  Development = 'development',
  Production = 'production',
  Test = 'test',
}

export class UserServiceConfigDto {
  @IsEnum(Environment)
  @IsOptional()
  NODE_ENV: Environment = Environment.Development;

  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  USER_SERVICE_PORT = 3011;

  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  USER_SERVICE_TCP_PORT = 3001;

  @IsString()
  USER_SERVICE_MONGO_URI!: string;

  @IsString()
  RABBITMQ_URL!: string;

  @IsString()
  @IsOptional()
  REDIS_URL = 'redis://localhost:6379';
}

export function validate(config: Record<string, any>) {
  const validatedConfig = plainToInstance(UserServiceConfigDto, config, {
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
