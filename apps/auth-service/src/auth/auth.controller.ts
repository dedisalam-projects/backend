import { Controller, Post, Body, UsePipes, ValidationPipe } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { LoginDto, RegisterDto, RefreshTokenDto } from '@dedisalam/common';
import { AuthService } from './auth.service';

@Controller('api/v1/auth')
@UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  // ==========================================
  // Microservice Message Patterns (RabbitMQ)
  // ==========================================

  @MessagePattern('auth.login')
  async handleLogin(@Payload() data: LoginDto) {
    return this.authService.login(data);
  }

  @MessagePattern('auth.register')
  async handleRegister(@Payload() data: RegisterDto) {
    return this.authService.register(data);
  }

  @MessagePattern('auth.refresh')
  async handleRefresh(@Payload() data: RefreshTokenDto) {
    return this.authService.refresh(data);
  }

  @MessagePattern('auth.logout')
  async handleLogout(@Payload() data: { userId: string }) {
    return this.authService.logout(data.userId);
  }

  // ==========================================
  // Direct HTTP Endpoints
  // ==========================================

  @Post('login')
  async httpLogin(@Body() data: LoginDto) {
    return this.authService.login(data);
  }

  @Post('register')
  async httpRegister(@Body() data: RegisterDto) {
    return this.authService.register(data);
  }

  @Post('refresh')
  async httpRefresh(@Body() data: RefreshTokenDto) {
    return this.authService.refresh(data);
  }

  @Post('logout')
  async httpLogout(@Body() data: { userId: string }) {
    return this.authService.logout(data.userId);
  }
}
