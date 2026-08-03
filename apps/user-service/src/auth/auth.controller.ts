import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { AuthService } from './auth.service';

@Controller()
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @MessagePattern('auth.login')
  async login(@Payload() data: any) {
    return this.authService.login(data);
  }

  @MessagePattern('auth.register')
  async register(@Payload() data: any) {
    return this.authService.register(data);
  }

  @MessagePattern('auth.refresh')
  async refresh(@Payload() data: any) {
    return this.authService.refresh(data);
  }

  @MessagePattern('user.profile')
  async getProfile(@Payload() data: any) {
    return this.authService.getProfile(data.userId);
  }

  @MessagePattern('user.list')
  async getAllUsers() {
    return this.authService.getAllUsers();
  }
}
