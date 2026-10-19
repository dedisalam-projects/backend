import { plainToInstance, Type } from 'class-transformer';
import { IsEnum, IsNumber, IsOptional, IsString, validateSync } from 'class-validator';

export enum Environment {
  Development = 'development',
  Production = 'production',
  Test = 'test',
}

export class BlipServicesConfigDto {
  @IsEnum(Environment)
  @IsOptional()
  NODE_ENV: Environment = Environment.Development;

  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  PORT = 3013;

  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  BLIP_SERVICES_PORT?: number;

  @IsString()
  @IsOptional()
  MONGODB_URI = 'mongodb://root:rootpassword@localhost:27017?authSource=admin';

  @IsString()
  @IsOptional()
  BLIP_MONGO_URI?: string;

  @IsString()
  @IsOptional()
  RABBITMQ_URL = 'amqp://guest:guest@localhost:5672';

  @IsString()
  @IsOptional()
  REDIS_URL = 'redis://localhost:6379';

  @IsString()
  @IsOptional()
  JWT_SECRET = 'dedisalam_secret_key';
}

export function validate(config: Record<string, unknown>) {
  const validatedConfig = plainToInstance(BlipServicesConfigDto, config);
  const errors = validateSync(validatedConfig);

  if (errors.length > 0) {
    throw new Error(errors.toString());
  }
  return validatedConfig;
}
