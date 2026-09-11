import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { LoginDto, RegisterDto, RefreshTokenDto } from '@dedisalam/common';
import { AuthService } from './auth.service';

@Controller()
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @MessagePattern('auth.login')
  async login(@Payload() data: LoginDto) {
    return this.authService.login(data);
  }

  @MessagePattern('auth.register')
  async register(@Payload() data: RegisterDto) {
    return this.authService.register(data);
  }

  @MessagePattern('auth.refresh')
  async refresh(@Payload() data: RefreshTokenDto) {
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

  @MessagePattern('auth.logout')
  async logout(@Payload() data: { refreshToken: string; accessToken?: string }) {
    return this.authService.logout(data);
  }

  @MessagePattern('user.update')
  async updateProfile(@Payload() data: any) {
    return this.authService.updateProfile(data);
  }

  @MessagePattern('user.create')
  async createUser(@Payload() data: any) {
    return this.authService.createUser(data);
  }

  @MessagePattern('user.list.paginated')
  async getUsersPaginated(@Payload() query: any) {
    return this.authService.getUsersPaginated(query);
  }

  @MessagePattern('user.update.admin')
  async updateUserByAdmin(@Payload() data: { userId: string; [key: string]: any }) {
    const { userId, ...updateData } = data;
    return this.authService.updateUserByAdmin(userId, updateData);
  }

  @MessagePattern('user.delete')
  async deleteUser(@Payload() data: { userId: string }) {
    return this.authService.deleteUser(data.userId);
  }
}
