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
  PORT = 3012;

  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  NOTIFICATION_SERVICE_PORT?: number;

  @IsString()
  @IsOptional()
  MONGODB_URI?: string;

  @IsString()
  @IsOptional()
  NOTIFICATION_SERVICE_MONGO_URI?: string;

  @IsString()
  RABBITMQ_URL!: string;
}

export function validate(config: Record<string, unknown>) {
  const validatedConfig = plainToInstance(NotificationServiceConfigDto, config);
  const errors = validateSync(validatedConfig);

  if (errors.length > 0) {
    throw new Error(errors.toString());
  }

  if (!validatedConfig.MONGODB_URI && !validatedConfig.NOTIFICATION_SERVICE_MONGO_URI) {
    throw new Error('Either MONGODB_URI or NOTIFICATION_SERVICE_MONGO_URI must be provided');
  }

  return validatedConfig;
}
