import { IsString, IsNotEmpty, IsOptional } from 'class-validator';

export class NotificationBroadcastDto {
  @IsString()
  @IsNotEmpty()
  title!: string;

  @IsString()
  @IsNotEmpty()
  message!: string;

  @IsOptional()
  @IsString()
  type?: string = 'info';

  @IsOptional()
  @IsString()
  recipientId?: string;
}
