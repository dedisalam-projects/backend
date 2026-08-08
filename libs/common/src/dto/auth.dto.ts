import { IsEmail, IsString, MinLength, IsNotEmpty, IsEnum, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { UserRole } from '../constants/user-role.enum';

export class RegisterDto {
  @ApiProperty({ example: 'user@example.com', description: 'User email address' })
  @IsEmail({}, { message: 'Invalid email format' })
  @IsNotEmpty()
  email!: string;

  @ApiProperty({ example: 'strongpassword123', description: 'User password (min 8 chars)' })
  @IsString()
  @MinLength(8, { message: 'Password must be at least 8 characters long' })
  @IsNotEmpty()
  password!: string;

  @ApiProperty({ example: 'John Doe', description: 'Full name of the user' })
  @IsString()
  @MinLength(3, { message: 'Name must be at least 3 characters long' })
  @IsNotEmpty()
  name!: string;

  @ApiPropertyOptional({ example: 'user', enum: UserRole, description: 'Role of the user' })
  @IsOptional()
  @IsEnum(UserRole, { message: 'Invalid role' })
  role?: UserRole;
}

export class LoginDto {
  @ApiProperty({ example: 'user@example.com' })
  @IsEmail({}, { message: 'Invalid email format' })
  @IsNotEmpty()
  email!: string;

  @ApiProperty({ example: 'strongpassword123' })
  @IsString()
  @IsNotEmpty()
  password!: string;
}

export class RefreshTokenDto {
  @ApiProperty({ example: '60d5ecb8b5436e2f8c5b5f8c', description: 'MongoDB User ID' })
  @IsString()
  @IsNotEmpty()
  userId!: string;

  @ApiProperty({ example: '43b9d0b0a8f8d9b1...', description: 'Plaintext refresh token' })
  @IsString()
  @IsNotEmpty()
  refreshToken!: string;
}
